import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, Button, Collapse, Spinner, Dropdown, Modal, Form } from 'react-bootstrap';
import { toast } from 'react-toastify';
import ProjectService from '../services/project.service';
import PostComments from './PostComments';
import TaskDetailModal from './TaskDetailModal';

export default function PostItem({ post, currentUser, project, onUpdate }) {
  const [showComments, setShowComments] = useState(false);
  const [likesCount, setLikesCount] = useState(post.likesCount || 0);
  const [userHasLiked, setUserHasLiked] = useState(post.userHasLiked || false);
  const [likingPost, setLikingPost] = useState(false);
  const [commentsCount, setCommentsCount] = useState(post.commentsCount || 0);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editData, setEditData] = useState({
    title: '',
    content: '',
    postType: '',
    imageData: null,
    imageType: null,
    removeImage: false
  });
  
  // Edit modal state for @ task mentions
  const [showEditTaskSuggestions, setShowEditTaskSuggestions] = useState(false);
  const [editTaskSuggestions, setEditTaskSuggestions] = useState([]);
  const [editCursorPosition, setEditCursorPosition] = useState(0);
  const [editLastAtPosition, setEditLastAtPosition] = useState(-1);
  const [editImagePreview, setEditImagePreview] = useState(null);
  
  const editContentRef = useRef(null);
  const editFileInputRef = useRef(null);
  
  // Task detail modal state
  const [showTaskDetailModal, setShowTaskDetailModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const contentRef = useRef(null);
  
  // Local post state for live updates
  const [localPost, setLocalPost] = useState(post);

  // Sync localPost with post prop changes
  useEffect(() => {
    setLocalPost(post);
  }, [post]);

  // Get post type styling
  const getPostTypeStyle = (postType) => {
    switch (postType) {
    case 'Feedback':
      return { backgroundColor: '#d1fae5', color: '#065f46', badge: 'success' };
    case 'Announcement':
      return { backgroundColor: '#dbeafe', color: '#1e40af', badge: 'primary' };
    case 'Discussion':
      return { backgroundColor: '#fef3c7', color: '#92400e', badge: 'warning' };
    default:
      return { backgroundColor: '#f3f4f6', color: '#374151', badge: 'secondary' };
    }
  };

  // Format timestamp
  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      const diffInMinutes = Math.floor((now - date) / (1000 * 60));
      return `${diffInMinutes} minute${diffInMinutes !== 1 ? 's' : ''} ago`;
    } else if (diffInHours < 24) {
      const hours = Math.floor(diffInHours);
      return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    } else {
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  };

  // Process content to highlight task mentions
  const processContent = (content) => {
    if (!content) return content;
    
    // Get tasks from either projectTasks or tasks property
    const tasks = project?.projectTasks || project?.tasks || [];
    
    // Replace @taskname with highlighted links
    return content.replace(/@(\w+)/g, (match, taskName) => {
      const task = tasks.find(t => 
        t.taskName.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() === taskName.toLowerCase()
      );
      
      if (task) {
        return `<span class="task-mention badge text-decoration-none" 
                      data-task-id="${task._id}" 
                      style="cursor: pointer; margin: 0 2px; font-size: 0.8em; padding: 0.25em 0.5em; border-radius: 0.375rem; display: inline-flex; align-items: center; background-color: #fbbf24; color: #92400e; border: 1px solid rgb(251, 191, 36);">
                  <span style="margin-right: 0.25rem;">📋</span>@${taskName}
                </span>`;
      }
      return match;
    });
  };

  // Handle task mention clicks
  const handleTaskMentionClick = useCallback((taskId) => {
    // Find the task in project tasks
    const tasks = project?.projectTasks || project?.tasks || [];
    const task = tasks.find(t => t._id === taskId);
    
    if (task) {
      setSelectedTask(task);
      setShowTaskDetailModal(true);
    } else {
      toast.error('Task details not available');
    }
  }, [project]);

  const handleCloseTaskModal = () => {
    setShowTaskDetailModal(false);
    setSelectedTask(null);
  };

  // Helper function to extract mentioned tasks from content (frontend version)
  const extractMentionedTasksFromContent = (content) => {
    if (!content || !project) return [];
    
    const tasks = project?.projectTasks || project?.tasks || [];
    const mentions = [];
    const seenTaskIds = new Set(); // Track seen task IDs to avoid duplicates
    const mentionRegex = /@(\w+)/g;
    let match;
    
    while ((match = mentionRegex.exec(content)) !== null) {
      const mentionText = match[1];
      const task = tasks.find(task => 
        task.taskName.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() === mentionText.toLowerCase()
      );
      
      if (task && !seenTaskIds.has(task._id.toString())) {
        seenTaskIds.add(task._id.toString());
        mentions.push({
          task: task,
          mentionText: match[0]
        });
      }
    }
    
    return mentions;
  };

  // Check if current user is the post owner
  const isPostOwner = () => {
    return currentUser && localPost.author && currentUser._id === localPost.author._id;
  };

  // Handle post edit
  const handleEditPost = () => {
    setEditData({
      title: localPost.title || '',
      content: localPost.content || '',
      postType: localPost.postType || 'Discussion',
      imageData: null,
      imageType: null,
      removeImage: false
    });
    
    // Set existing image if present
    if (localPost.image && localPost.image.data) {
      setEditImagePreview(`data:${localPost.image.contentType};base64,${localPost.image.data}`);
      setEditData(prev => ({
        ...prev,
        imageData: localPost.image.data,
        imageType: localPost.image.contentType,
        removeImage: false
      }));
    } else {
      setEditImagePreview(null);
    }
    
    setShowEditModal(true);
  };

  // Handle edit form submission
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editData.content.trim()) {
      toast.error('Content is required');
      return;
    }

    // Store original post data for rollback
    const originalPost = { ...localPost };

    try {
      // Extract mentioned tasks for optimistic update
      const mentionedTasks = extractMentionedTasksFromContent(editData.content);
      
      // Update local state optimistically
      const optimisticPost = {
        ...localPost,
        title: editData.title,
        content: editData.content,
        postType: editData.postType,
        mentionedTasks: mentionedTasks, // Add mentioned tasks to optimistic update
        updatedAt: new Date().toISOString()
      };
      
      // Handle image in optimistic update
      if (editData.removeImage) {
        optimisticPost.image = null;
      } else if (editData.imageData && editData.imageType) {
        optimisticPost.image = {
          data: editData.imageData,
          contentType: editData.imageType
        };
      }
      
      setLocalPost(optimisticPost);
      setShowEditModal(false);
      toast.success('Post updated successfully!');
      
      // Send to server - include image data if present
      const updateData = {
        title: editData.title,
        content: editData.content,
        postType: editData.postType
      };
      
      // Add image data if present
      if (editData.imageData && editData.imageType) {
        updateData.imageData = editData.imageData;
        updateData.imageType = editData.imageType;
      }
      
      // Add remove image flag if image should be removed
      if (editData.removeImage) {
        updateData.removeImage = true;
      }
      
      const response = await ProjectService.updatePost(localPost._id, updateData);
      
      // Update with server response, but preserve optimistic mentionedTasks if server doesn't return them properly
      const serverPost = response.data.post;
      const finalPost = {
        ...serverPost,
        // If server mentionedTasks is empty or not properly populated, keep optimistic ones
        mentionedTasks: (serverPost.mentionedTasks && serverPost.mentionedTasks.length > 0) 
          ? serverPost.mentionedTasks 
          : mentionedTasks
      };
      
      setLocalPost(finalPost);
      
    } catch (err) {
      // Error updating post
      
      // Rollback on error
      setLocalPost(originalPost);
      setShowEditModal(true); // Reopen modal
      
      toast.error(err.response?.data?.message || 'Failed to update post');
    }
  };

  // Handle post delete - show confirmation modal
  const handleDeletePost = () => {
    setShowDeleteModal(true);
  };

  // Confirm post deletion
  const confirmDeletePost = async () => {
    try {
      setShowDeleteModal(false);
      await ProjectService.deletePost(localPost._id);
      toast.success('Post deleted successfully!');
      // Call onUpdate to refresh posts list and remove deleted post from UI
      if (onUpdate) onUpdate();
    } catch (err) {
      // Error deleting post
      toast.error(err.response?.data?.message || 'Failed to delete post');
    }
  };

  // Cancel post deletion
  const cancelDeletePost = () => {
    setShowDeleteModal(false);
  };

  // Comments are now managed by PostComments component directly
  // No need for loadComments function anymore

  const handleShowComments = () => {
    setShowComments(!showComments);
    // Comments will be loaded by PostComments component internally
    // No need to refresh here since we have optimistic updates
  };

  // Handle post like
  const handleLike = async () => {
    if (likingPost) return;
    
    try {
      setLikingPost(true);
      const response = await ProjectService.togglePostLike(post._id);
      
      // Update state with server response
      setLikesCount(response.data.likesCount);
      setUserHasLiked(response.data.userHasLiked);
      
      // No need to refresh posts list for likes - it's handled optimistically
    } catch (err) {
      // Error toggling like
      toast.error('Failed to update like');
    } finally {
      setLikingPost(false);
    }
  };

  // Handle comment updates (now just updates count without API call)
  const handleCommentUpdate = (newCount) => {
    if (typeof newCount === 'number') {
      // Direct count update from optimistic UI
      setCommentsCount(newCount);
    }
    
    // Don't call onUpdate() for comment changes since they use optimistic updates
    // This prevents unnecessary post list refreshes that would collapse comments
  };

  // Edit modal functions for @ task mentions
  const handleEditContentChange = (e) => {
    const value = e.target.value;
    const position = e.target.selectionStart;
    
    setEditData(prev => ({ ...prev, content: value }));
    setEditCursorPosition(position);
    
    // Check for @ symbol for task tagging
    const textBeforeCursor = value.substring(0, position);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtIndex !== -1) {
      const searchText = textBeforeCursor.substring(lastAtIndex + 1);
      
      // Only show suggestions if @ is at word boundary and search text is reasonable
      if (searchText.length <= 20 && !/\s/.test(searchText)) {
        setEditLastAtPosition(lastAtIndex);
        filterEditTaskSuggestions(searchText);
        setShowEditTaskSuggestions(true);
      } else {
        setShowEditTaskSuggestions(false);
      }
    } else {
      setShowEditTaskSuggestions(false);
    }
  };

  const filterEditTaskSuggestions = (searchText) => {
    // Check both projectTasks and tasks properties
    const tasks = project?.projectTasks || project?.tasks || [];
    
    if (!tasks || tasks.length === 0) {
      setEditTaskSuggestions([]);
      return;
    }

    const filtered = tasks.filter(task =>
      task.taskName.toLowerCase().includes(searchText.toLowerCase())
    ).slice(0, 10); // Increased limit to 10 suggestions

    setEditTaskSuggestions(filtered);
  };

  const insertEditTaskMention = (task) => {
    const content = editData.content;
    const beforeAt = content.substring(0, editLastAtPosition);
    const afterCursor = content.substring(editCursorPosition);
    
    // Create task mention: remove spaces, dashes, and special characters, keep only alphanumeric
    const taskMention = task.taskName.replace(/[^a-zA-Z0-9]/g, '');
    const newContent = beforeAt + '@' + taskMention + ' ' + afterCursor;
    
    setEditData(prev => ({ ...prev, content: newContent }));
    setShowEditTaskSuggestions(false);
    
    // Focus back to textarea
    setTimeout(() => {
      if (editContentRef.current) {
        const newPosition = beforeAt.length + taskMention.length + 2;
        editContentRef.current.focus();
        editContentRef.current.setSelectionRange(newPosition, newPosition);
      }
    }, 0);
  };

  // Edit modal image handling
  const handleEditImageSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file (PNG, JPG, etc.)');
      return;
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    // Convert to Base64
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64String = e.target.result;
      setEditImagePreview(base64String);
      
      // Store Base64 data (remove the data:image/jpeg;base64, prefix)
      const base64Data = base64String.split(',')[1];
      setEditData(prev => ({ 
        ...prev, 
        imageData: base64Data,
        imageType: file.type,
        removeImage: false // Clear remove flag when new image is selected
      }));
    };
    reader.readAsDataURL(file);
  };

  const removeEditImage = () => {
    setEditData(prev => ({ ...prev, imageData: null, imageType: null, removeImage: true }));
    setEditImagePreview(null);
    if (editFileInputRef.current) {
      editFileInputRef.current.value = '';
    }
  };



  useEffect(() => {
    // Add click handlers for task mentions within this component only
    const handleClick = (e) => {
      if (e.target.classList.contains('task-mention')) {
        e.preventDefault();
        e.stopPropagation();
        const taskId = e.target.dataset.taskId;
        if (taskId) {
          handleTaskMentionClick(taskId);
        }
      }
    };

    // Only listen to clicks within this component's content area
    const contentElement = contentRef.current;
    if (contentElement) {
      contentElement.addEventListener('click', handleClick);
      return () => contentElement.removeEventListener('click', handleClick);
    }
  }, [localPost.content, project, handleTaskMentionClick]); // Re-run when content, project, or handler changes

  const postTypeStyle = getPostTypeStyle(localPost.postType);

  return (
    <Card className="mb-4" style={{ boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)' }}>
      <Card.Body className="p-4">
        {/* Header: Post type badge + title + tagged tasks + date */}
        <div className="d-flex justify-content-between align-items-center mb-3">
          <div className="d-flex align-items-center flex-wrap">
            <span 
              className="px-2 py-1 rounded me-2"
              style={{
                backgroundColor: postTypeStyle.backgroundColor,
                color: postTypeStyle.color,
                fontSize: '0.75rem',
                fontWeight: '600'
              }}
            >
              {localPost.postType}
            </span>
            
            {/* Task Mentions - Now inline with post type */}
            {localPost.mentionedTasks && localPost.mentionedTasks.length > 0 && (
              <div className="d-flex flex-wrap gap-1 me-2">
                {localPost.mentionedTasks.map((mention, index) => (
                  <span 
                    key={index}
                    className="badge d-flex align-items-center"
                    style={{ 
                      cursor: 'pointer',
                      fontSize: '0.7rem',
                      fontWeight: '500',
                      backgroundColor: '#fbbf24',
                      color: '#92400e',
                      border: '1px solid rgb(251, 191, 36)',
                      borderRadius: '0.375rem',
                      padding: '0.25rem 0.5rem'
                    }}
                    onClick={() => handleTaskMentionClick(mention.task._id)}
                  >
                    <span className="me-1">📋</span>
                    {mention.task.taskName}
                  </span>
                ))}
              </div>
            )}
            
            {localPost.title && (
              <h5 className="mb-0 fw-medium text-start">{localPost.title}</h5>
            )}
          </div>
          <span className="text-muted" style={{ fontSize: '0.875rem' }}>
            {formatTimestamp(localPost.updatedAt || localPost.createdAt)}
          </span>
        </div>

        {/* Author Info */}
        <div className="d-flex align-items-center mb-3">
          <div 
            className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center me-3"
            style={{ width: '40px', height: '40px', fontSize: '16px' }}
          >
            {localPost.author?.name ? localPost.author.name.charAt(0).toUpperCase() : 'U'}
          </div>
          <span className="fw-semibold text-start">{localPost.author?.name || 'Unknown User'}</span>
        </div>

        {/* Content */}
        <div 
          ref={contentRef}
          className="mb-3 text-start"
          style={{ 
            whiteSpace: 'pre-wrap', 
            color: '#374151',
            lineHeight: '1.5',
            textAlign: 'left'
          }}
          dangerouslySetInnerHTML={{ 
            __html: processContent(localPost.content) 
          }}
        />

        {/* Image Attachment */}
        {localPost.image && localPost.image.data && (
          <div className="mb-3">
            <img 
              src={`data:${localPost.image.contentType};base64,${localPost.image.data}`} 
              alt="Post attachment"
              className="img-fluid rounded border"
              style={{ 
                maxHeight: '400px', 
                width: 'auto',
                cursor: 'pointer'
              }}
              onClick={() => window.open(`data:${localPost.image.contentType};base64,${localPost.image.data}`, '_blank')}
            />
          </div>
        )}


        {/* Actions */}
        <div className="d-flex align-items-center justify-content-between" style={{ color: '#6b7280' }}>
          <div className="d-flex align-items-center">
            <Button
              variant="link"
              className="p-0 me-4 text-decoration-none d-flex align-items-center"
              style={{ 
                color: userHasLiked ? '#ef4444' : '#6b7280',
                fontSize: '0.875rem'
              }}
              onClick={handleLike}
              disabled={likingPost}
            >
              {likingPost ? (
                <Spinner animation="border" size="sm" />
              ) : (
                <>
                  <svg 
                    width="20" 
                    height="20" 
                    fill={userHasLiked ? 'currentColor' : 'none'}
                    stroke="currentColor" 
                    strokeWidth="2" 
                    viewBox="0 0 24 24" 
                    className="me-1"
                  >
                    <path d="M4.318 6.318a4.5 4.5 0 0 1 6.364 0L12 7.636l1.318-1.318a4.5 4.5 0 1 1 6.364 6.364L12 21.364l-7.682-7.682a4.5 4.5 0 0 1 0-6.364z"/>
                  </svg>
                  {likesCount}
                </>
              )}
            </Button>
            
            <Button
              variant="link"
              className="p-0 text-decoration-none d-flex align-items-center"
              style={{ color: '#6b7280', fontSize: '0.875rem' }}
              onClick={handleShowComments}
            >
              <svg 
                width="20" 
                height="20" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                viewBox="0 0 24 24"
                className="me-1"
              >
                <path d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 0 1-4-.86L3 20l1.26-3.487A8.969 8.969 0 0 1 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
              </svg>
              {commentsCount}
            </Button>
          </div>

          {/* Post Owner Actions - Positioned in same row, far right */}
          {isPostOwner() && (
            <Dropdown align="end">
              <Dropdown.Toggle 
                variant="link" 
                size="sm" 
                className="text-muted p-1 border-0"
                style={{ 
                  fontSize: '1.2rem',
                  lineHeight: '1',
                  backgroundColor: 'rgba(248, 249, 250, 0.9)',
                  borderRadius: '50%',
                  width: '28px',
                  height: '28px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid rgba(0,0,0,0.05)'
                }}
              >
                ⋯
              </Dropdown.Toggle>
              <Dropdown.Menu>
                <Dropdown.Item onClick={handleEditPost}>
                  Edit Post
                </Dropdown.Item>
                <Dropdown.Item 
                  onClick={handleDeletePost}
                  className="text-danger"
                >
                  Delete Post
                </Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown>
          )}
        </div>

        {/* Comments Section */}
        <Collapse in={showComments}>
          <div className="mt-3">
            <PostComments
              postId={localPost._id}
              comments={[]} // PostComments will load its own comments
              currentUser={currentUser}
              onUpdate={handleCommentUpdate}
            />
          </div>
        </Collapse>
      </Card.Body>

      {/* Edit Post Modal */}
      <Modal 
        show={showEditModal} 
        onHide={() => {
          setShowEditModal(false);
          setShowEditTaskSuggestions(false);
          setEditImagePreview(null);
        }} 
        centered 
        size="lg"
      >
        <Modal.Header closeButton>
          <Modal.Title>Edit Post</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleEditSubmit}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Title (Optional)</Form.Label>
              <Form.Control
                type="text"
                placeholder="Enter post title..."
                value={editData.title}
                onChange={(e) => setEditData({ ...editData, title: e.target.value })}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Post Type</Form.Label>
              <Form.Select
                value={editData.postType}
                onChange={(e) => setEditData({ ...editData, postType: e.target.value })}
              >
                <option value="Discussion">Discussion</option>
                <option value="Feedback">Feedback</option>
                <option value="Announcement">Announcement</option>
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Content *</Form.Label>
              <div className="position-relative">
                <Form.Control
                  as="textarea"
                  ref={editContentRef}
                  rows={6}
                  placeholder="What's on your mind? Use @ to mention tasks."
                  value={editData.content}
                  onChange={handleEditContentChange}
                  onBlur={() => setTimeout(() => setShowEditTaskSuggestions(false), 200)}
                  required
                />
                
                {/* Task Suggestions Dropdown */}
                {showEditTaskSuggestions && editTaskSuggestions.length > 0 && (
                  <div 
                    className="position-absolute bg-white border rounded shadow-lg"
                    style={{ 
                      top: '100%', 
                      left: 0, 
                      right: 0, 
                      zIndex: 1050,
                      maxHeight: '200px',
                      overflowY: 'auto',
                      border: '1px solid #e3e6f0',
                      boxShadow: '0 0.15rem 1.75rem 0 rgba(58, 59, 69, 0.15)'
                    }}
                  >
                    {editTaskSuggestions.map((task, index) => (
                      <div
                        key={task._id}
                        className={`p-3 cursor-pointer ${index !== editTaskSuggestions.length - 1 ? 'border-bottom' : ''}`}
                        style={{ 
                          cursor: 'pointer',
                          transition: 'background-color 0.15s ease-in-out',
                          borderBottomColor: '#e3e6f0'
                        }}
                        onClick={() => insertEditTaskMention(task)}
                        onMouseDown={(e) => e.preventDefault()} // Prevent blur
                        onMouseEnter={(e) => e.target.style.backgroundColor = '#f8f9fc'}
                        onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
                      >
                        <div className="d-flex align-items-center">
                          <span className="me-2" style={{ fontSize: '1.1em' }}>📋</span>
                          <div className="flex-grow-1">
                            <div className="fw-medium text-dark">{task.taskName}</div>
                            {task.taskDescription && (
                              <small className="text-muted d-block" style={{ fontSize: '0.8em', lineHeight: '1.2' }}>
                                {task.taskDescription.length > 60 
                                  ? task.taskDescription.substring(0, 60) + '...' 
                                  : task.taskDescription}
                              </small>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <Form.Text className="text-muted">
                Use @ to mention tasks (e.g., @task-name). Task suggestions will appear as you type.
              </Form.Text>
            </Form.Group>

            {/* Image Attachment */}
            <Form.Group className="mb-3">
              <Form.Label>Image Attachment (Optional)</Form.Label>
              <Form.Control
                ref={editFileInputRef}
                type="file"
                accept="image/*"
                onChange={handleEditImageSelect}
              />
              <Form.Text className="text-muted">
                Supported formats: PNG, JPG, GIF, etc. Maximum size: 5MB
              </Form.Text>
              
              {/* Image Preview */}
              {editImagePreview && (
                <div className="mt-3">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <small className="text-muted"><strong>Image Preview:</strong></small>
                    <Button 
                      variant="outline-danger" 
                      size="sm" 
                      onClick={removeEditImage}
                    >
                      Remove
                    </Button>
                  </div>
                  <div className="border rounded p-2" style={{ maxHeight: '200px', overflow: 'hidden' }}>
                    <img 
                      src={editImagePreview} 
                      alt="Preview" 
                      className="img-fluid rounded"
                      style={{ maxHeight: '180px', width: 'auto' }}
                    />
                  </div>
                </div>
              )}
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => {
              setShowEditModal(false);
              setShowEditTaskSuggestions(false);
              setEditImagePreview(null);
            }}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={!editData.content.trim()}>
              Update Post
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Task Detail Modal */}
      <TaskDetailModal
        show={showTaskDetailModal}
        onHide={handleCloseTaskModal}
        task={selectedTask}
      />

      {/* Delete Confirmation Modal */}
      <Modal show={showDeleteModal} onHide={cancelDeletePost} centered>
        <Modal.Header closeButton>
          <Modal.Title>Confirm Delete</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="text-center">
            <div className="mb-3">
              <i className="fas fa-exclamation-triangle text-warning" style={{ fontSize: '3rem' }}></i>
            </div>
            <h5 className="mb-3">Are you sure you want to delete this post?</h5>
            <p className="text-muted">
              This action cannot be undone. The post and all its comments will be permanently removed.
            </p>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={cancelDeletePost}>
            Cancel
          </Button>
          <Button variant="danger" onClick={confirmDeletePost}>
            <i className="fas fa-trash me-2"></i>
            Delete Post
          </Button>
        </Modal.Footer>
      </Modal>
    </Card>
  );
}