import { useState, useEffect } from 'react';
import { Form, Button, Alert, Dropdown } from 'react-bootstrap';
import { toast } from 'react-toastify';
import ProjectService from '../services/project.service';

export default function PostComments({ postId, comments, currentUser, onUpdate }) {
  const [localComments, setLocalComments] = useState(comments);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyContent, setReplyContent] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [submittingReply, setSubmittingReply] = useState(false);

  // Load comments on mount if not provided
  useEffect(() => {
    const loadInitialComments = async () => {
      if (comments && comments.length > 0) {
        // Use provided comments
        setLocalComments(comments);
      } else {
        // Load comments from API
        try {
          const response = await ProjectService.getPost(postId);
          const loadedComments = response.data.comments || [];
          setLocalComments(loadedComments);
        } catch (err) {
          // Error loading comments
          setLocalComments([]);
        }
      }
    };
    
    loadInitialComments();
  }, [postId, comments]);

  // Update local comments when props change (but don't reload from API)
  useEffect(() => {
    if (comments && comments.length > 0) {
      setLocalComments(comments);
    }
  }, [comments]);

  // Auto-resize textarea function
  const autoResizeTextarea = (textarea) => {
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
  };

  // Format timestamp
  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  // Handle new comment submission
  const handleSubmitComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    // Create optimistic comment for immediate UI update
    const optimisticComment = {
      _id: `temp-${Date.now()}`, // Temporary ID
      content: newComment.trim(),
      author: currentUser,
      createdAt: new Date().toISOString(),
      parentComment: null,
      replies: []
    };

    const originalComment = newComment.trim();
    
    try {
      setSubmittingComment(true);
      
      // Add comment optimistically to local state
      setLocalComments(prevComments => [...prevComments, optimisticComment]);
      setNewComment('');
      
      // Send to server
      const response = await ProjectService.createComment(postId, originalComment);
      
      // Replace optimistic comment with real one from server
      setLocalComments(prevComments => {
        const updatedComments = prevComments.map(comment => 
          comment._id === optimisticComment._id ? response.data.comment : comment
        );
        
        // Update parent count with actual count
        if (onUpdate) onUpdate(updatedComments.length);
        
        return updatedComments;
      });
      
      toast.success('Comment added successfully!');
      
    } catch (err) {
      // Error creating comment
      
      // Remove optimistic comment on error and restore user's input
      setLocalComments(prevComments => 
        prevComments.filter(comment => comment._id !== optimisticComment._id)
      );
      setNewComment(originalComment); // Restore user's input
      
      toast.error(err.response?.data?.message || 'Failed to add comment');
    } finally {
      setSubmittingComment(false);
    }
  };

  // Handle reply submission
  const handleSubmitReply = async (e, parentCommentId) => {
    e.preventDefault();
    if (!replyContent.trim()) return;

    // Create optimistic reply for immediate UI update
    const optimisticReply = {
      _id: `temp-reply-${Date.now()}`, // Temporary ID
      content: replyContent.trim(),
      author: currentUser,
      createdAt: new Date().toISOString(),
      parentComment: parentCommentId,
      replies: []
    };

    const originalReplyContent = replyContent.trim();
    
    try {
      setSubmittingReply(true);
      
      // Add reply optimistically to local state
      setLocalComments(prevComments => [...prevComments, optimisticReply]);
      setReplyContent('');
      setReplyingTo(null);
      
      // Send to server
      const response = await ProjectService.createComment(postId, originalReplyContent, parentCommentId);
      
      // Replace optimistic reply with real one from server
      setLocalComments(prevComments => {
        const updatedComments = prevComments.map(comment => 
          comment._id === optimisticReply._id ? response.data.comment : comment
        );
        
        // Update parent count with actual count
        if (onUpdate) onUpdate(updatedComments.length);
        
        return updatedComments;
      });
      
      toast.success('Reply added successfully!');
      
    } catch (err) {
      // Error creating reply
      
      // Remove optimistic reply on error and restore form state
      setLocalComments(prevComments => 
        prevComments.filter(comment => comment._id !== optimisticReply._id)
      );
      setReplyContent(originalReplyContent); // Restore user's input
      setReplyingTo(parentCommentId); // Restore reply form
      
      toast.error(err.response?.data?.message || 'Failed to add reply');
    } finally {
      setSubmittingReply(false);
    }
  };



  // Handle comment delete
  const handleDeleteComment = async (commentId) => {
    if (!window.confirm('Are you sure you want to delete this comment? This action cannot be undone.')) return;

    try {
      await ProjectService.deleteComment(commentId);
      
      // Remove comment from local state optimistically
      setLocalComments(prevComments => {
        const updatedComments = prevComments.filter(comment => 
          comment._id !== commentId && comment.parentComment !== commentId
        );
        
        // Update parent count
        if (onUpdate) onUpdate(updatedComments.length);
        
        return updatedComments;
      });
      
      toast.success('Comment deleted successfully!');
    } catch (err) {
      // Error deleting comment
      toast.error(err.response?.data?.message || 'Failed to delete comment');
    }
  };

  // Get main comments (not replies)
  const mainComments = localComments.filter(comment => !comment.parentComment);
  
  // Get replies for a specific comment
  const getReplies = (commentId) => {
    return localComments.filter(comment => comment.parentComment === commentId);
  };

  // Check if user can delete comment
  const canDeleteComment = (comment) => {
    return currentUser && comment.author._id === currentUser._id;
  };

  const renderComment = (comment, isReply = false) => (
    <div key={comment._id} className={`${isReply ? 'ms-4 mt-2' : 'mb-3'}`}>
      <div className="d-flex">
        <div className="rounded-circle bg-secondary text-white d-flex align-items-center justify-content-center me-3"
          style={{ width: '32px', height: '32px', fontSize: '14px', flexShrink: 0 }}>
          {comment.author?.name ? comment.author.name.charAt(0).toUpperCase() : 'U'}
        </div>
        
        <div className="flex-grow-1">
          <div className="bg-light rounded p-3">
            <div className="d-flex justify-content-between align-items-start mb-2">
              <div className="text-start">
                <strong className="text-primary">{comment.author?.name || 'Unknown User'}</strong>
                <small className="text-muted ms-2">{formatTimestamp(comment.createdAt)}</small>
              </div>
              
              {canDeleteComment(comment) && (
                <Dropdown align="end">
                  <Dropdown.Toggle variant="link" size="sm" className="text-muted p-0 border-0">
                    ⋯
                  </Dropdown.Toggle>
                  <Dropdown.Menu>
                    <Dropdown.Item 
                      onClick={() => handleDeleteComment(comment._id)}
                      className="text-danger"
                    >
                      Delete
                    </Dropdown.Item>
                  </Dropdown.Menu>
                </Dropdown>
              )}
            </div>
            
            <p className="mb-0 text-start" style={{ whiteSpace: 'pre-wrap', fontSize: '0.875rem', lineHeight: '1.4' }}>
              {comment.content}
            </p>
          </div>
          
          {!isReply && (
            <div className="mt-2 text-start">
              <Button
                variant="link"
                size="sm"
                className="text-muted p-0 text-decoration-none"
                onClick={() => {
                  setReplyingTo(replyingTo === comment._id ? null : comment._id);
                  setReplyContent('');
                }}
                style={{ fontSize: '0.75rem' }}
              >
                Reply
              </Button>
            </div>
          )}
          
          {replyingTo === comment._id && (
            <div className="mt-3">
              <Form.Control
                as="textarea"
                rows={1}
                placeholder="Write a reply..."
                value={replyContent}
                onChange={(e) => {
                  setReplyContent(e.target.value);
                  autoResizeTextarea(e.target);
                }}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (replyContent.trim() && !submittingReply) {
                      handleSubmitReply(e, comment._id);
                    }
                  }
                }}
                disabled={submittingReply}
                style={{ fontSize: '0.875rem', resize: 'none', overflow: 'hidden' }}
              />
              <div className="mt-2">
                <Button
                  variant="primary"
                  size="sm"
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    handleSubmitReply(e, comment._id);
                  }}
                  disabled={!replyContent.trim() || submittingReply}
                  className="me-2"
                  style={{ fontSize: '0.75rem' }}
                >
                  {submittingReply ? 'Replying...' : 'Reply'}
                </Button>
                <Button
                  variant="outline-secondary"
                  size="sm"
                  onClick={() => {
                    setReplyingTo(null);
                    setReplyContent('');
                  }}
                  disabled={submittingReply}
                  style={{ fontSize: '0.75rem' }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
          
          {/* Render replies */}
          {!isReply && getReplies(comment._id).map(reply => renderComment(reply, true))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="comments-section">
      <div className="border-top pt-3">
        <h6 className="mb-3 text-start">Comments ({localComments.length})</h6>
        
        {/* New Comment Form */}
        <div className="mb-4">
          <div className="d-flex">
            <div className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center me-3"
              style={{ width: '32px', height: '32px', fontSize: '14px', flexShrink: 0 }}>
              {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="flex-grow-1">
              <Form.Control
                as="textarea"
                rows={1}
                placeholder="Write a comment..."
                value={newComment}
                onChange={(e) => {
                  setNewComment(e.target.value);
                  autoResizeTextarea(e.target);
                }}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (newComment.trim() && !submittingComment) {
                      handleSubmitComment(e);
                    }
                  }
                }}
                disabled={submittingComment}
                style={{ fontSize: '0.875rem', resize: 'none', overflow: 'hidden' }}
              />
              <div className="mt-2">
                <Button
                  variant="primary"
                  size="sm"
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    handleSubmitComment(e);
                  }}
                  disabled={!newComment.trim() || submittingComment}
                  style={{ fontSize: '0.75rem', fontWeight: '500' }}
                >
                  {submittingComment ? 'Posting...' : 'Post Comment'}
                </Button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Comments List */}
        {mainComments.length > 0 ? (
          <div className="comments-list">
            {mainComments.map(comment => renderComment(comment))}
          </div>
        ) : (
          <Alert variant="light" className="text-center">
            <p className="mb-0 text-muted">No comments yet. Be the first to comment!</p>
          </Alert>
        )}
      </div>
    </div>
  );
}