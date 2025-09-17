import { useState, useRef, useEffect } from 'react';
import { Modal, Form, Button, Row, Col, Alert, Badge } from 'react-bootstrap';

export default function CreatePost({ show, onHide, onSubmit, project, loading }) {
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    postType: 'Discussion',
    imageData: null,
    imageType: null
  });
  const [imagePreview, setImagePreview] = useState(null);
  const [showTaskSuggestions, setShowTaskSuggestions] = useState(false);
  const [taskSuggestions, setTaskSuggestions] = useState([]);
  const [cursorPosition, setCursorPosition] = useState(0);
  const [lastAtPosition, setLastAtPosition] = useState(-1);
  const [errors, setErrors] = useState({});
  
  const contentRef = useRef(null);
  const fileInputRef = useRef(null);

  const postTypes = [
    { value: 'Discussion', label: 'Discussion', icon: '🗣️', color: 'info' },
    { value: 'Feedback', label: 'Feedback', icon: '💬', color: 'success' },
    { value: 'Announcement', label: 'Announcement', icon: '📢', color: 'warning' }
  ];

  useEffect(() => {
    if (!show) {
      // Reset form when modal closes
      setFormData({
        title: '',
        content: '',
        postType: 'Discussion',
        imageData: null,
        imageType: null
      });
      setImagePreview(null);
      setShowTaskSuggestions(false);
      setTaskSuggestions([]);
      setErrors({});
    }
  }, [show]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear field-specific errors
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const handleContentChange = (e) => {
    const value = e.target.value;
    const position = e.target.selectionStart;
    
    setFormData(prev => ({ ...prev, content: value }));
    setCursorPosition(position);
    
    // Check for @ symbol for task tagging
    const textBeforeCursor = value.substring(0, position);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtIndex !== -1) {
      const searchText = textBeforeCursor.substring(lastAtIndex + 1);
      
      // Only show suggestions if @ is at word boundary and search text is reasonable
      if (searchText.length <= 20 && !/\s/.test(searchText)) {
        setLastAtPosition(lastAtIndex);
        filterTaskSuggestions(searchText);
        setShowTaskSuggestions(true);
      } else {
        setShowTaskSuggestions(false);
      }
    } else {
      setShowTaskSuggestions(false);
    }
  };

  const filterTaskSuggestions = (searchText) => {
    // Check both projectTasks and tasks properties
    const tasks = project?.projectTasks || project?.tasks || [];
    
    if (!tasks || tasks.length === 0) {
      setTaskSuggestions([]);
      return;
    }

    const filtered = tasks.filter(task =>
      task.taskName.toLowerCase().includes(searchText.toLowerCase())
    ).slice(0, 10); // Increased limit to 10 suggestions

    setTaskSuggestions(filtered);
  };

  const insertTaskMention = (task) => {
    const content = formData.content;
    const beforeAt = content.substring(0, lastAtPosition);
    const afterCursor = content.substring(cursorPosition);
    
    // Create task mention: remove spaces, dashes, and special characters, keep only alphanumeric
    const taskMention = task.taskName.replace(/[^a-zA-Z0-9]/g, '');
    const newContent = beforeAt + '@' + taskMention + ' ' + afterCursor;
    
    setFormData(prev => ({ ...prev, content: newContent }));
    setShowTaskSuggestions(false);
    
    // Focus back to textarea
    setTimeout(() => {
      if (contentRef.current) {
        const newPosition = beforeAt.length + taskMention.length + 2;
        contentRef.current.focus();
        contentRef.current.setSelectionRange(newPosition, newPosition);
      }
    }, 0);
  };

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setErrors(prev => ({ ...prev, image: 'Please select a valid image file (PNG, JPG, etc.)' }));
      return;
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      setErrors(prev => ({ ...prev, image: 'Image size must be less than 5MB' }));
      return;
    }

    setErrors(prev => ({ ...prev, image: null }));

    // Convert to Base64
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64String = e.target.result;
      setImagePreview(base64String);
      
      // Store Base64 data (remove the data:image/jpeg;base64, prefix)
      const base64Data = base64String.split(',')[1];
      setFormData(prev => ({ 
        ...prev, 
        imageData: base64Data,
        imageType: file.type
      }));
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setFormData(prev => ({ ...prev, imageData: null, imageType: null }));
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (!formData.content.trim()) {
      newErrors.content = 'Content is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    onSubmit(formData);
  };

  // selectedPostType removed as it was unused
  
  // Extract mentioned tasks from content
  const getMentionedTasks = () => {
    const tasks = project?.projectTasks || project?.tasks || [];
    if (!formData.content || tasks.length === 0) {
      return [];
    }
    
    const mentionMatches = formData.content.match(/@(\w+)/g) || [];
    const mentionedTasks = [];
    
    mentionMatches.forEach(match => {
      const taskName = match.substring(1); // Remove @
      const task = tasks.find(t => 
        t.taskName.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() === taskName.toLowerCase()
      );
      
      if (task && !mentionedTasks.find(mt => mt._id === task._id)) {
        mentionedTasks.push(task);
      }
    });
    
    return mentionedTasks;
  };
  
  const mentionedTasks = getMentionedTasks();

  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Modal.Header closeButton>
        <Modal.Title>Create New Post</Modal.Title>
      </Modal.Header>
      
      <Form onSubmit={handleSubmit}>
        <Modal.Body>
          {/* Post Type Selection */}
          <Row className="mb-3">
            <Col>
              <Form.Label>Post Type</Form.Label>
              <div className="d-flex gap-2 flex-wrap">
                {postTypes.map(type => (
                  <Badge
                    key={type.value}
                    bg={formData.postType === type.value ? type.color : 'light'}
                    text={formData.postType === type.value ? 'white' : 'dark'}
                    className="p-2 cursor-pointer"
                    style={{ 
                      cursor: 'pointer',
                      fontSize: '0.9em',
                      border: formData.postType === type.value ? 'none' : '1px solid #dee2e6',
                      fontWeight: formData.postType === type.value ? '600' : '500'
                    }}
                    onClick={() => handleInputChange('postType', type.value)}
                  >
                    <span className="me-2">{type.icon}</span>
                    {type.label}
                  </Badge>
                ))}
              </div>
            </Col>
          </Row>

          {/* Title */}
          <Row className="mb-3">
            <Col>
              <Form.Label>Title *</Form.Label>
              <Form.Control
                type="text"
                placeholder="Enter post title..."
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                isInvalid={!!errors.title}
                maxLength={100}
              />
              <Form.Control.Feedback type="invalid">
                {errors.title}
              </Form.Control.Feedback>
              <Form.Text className="text-muted">
                {formData.title.length}/100 characters
              </Form.Text>
            </Col>
          </Row>

          {/* Content with Task Tagging */}
          <Row className="mb-3">
            <Col>
              <Form.Label>Content *</Form.Label>
              <div className="position-relative">
                <Form.Control
                  as="textarea"
                  ref={contentRef}
                  rows={6}
                  placeholder="Write your post content... Use @ to mention tasks."
                  value={formData.content}
                  onChange={handleContentChange}
                  onBlur={() => setTimeout(() => setShowTaskSuggestions(false), 200)}
                  isInvalid={!!errors.content}
                />
                
                {/* Task Suggestions Dropdown */}
                {showTaskSuggestions && taskSuggestions.length > 0 && (
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
                    {taskSuggestions.map((task, index) => (
                      <div
                        key={task._id}
                        className={`p-3 cursor-pointer ${index !== taskSuggestions.length - 1 ? 'border-bottom' : ''}`}
                        style={{ 
                          cursor: 'pointer',
                          transition: 'background-color 0.15s ease-in-out',
                          borderBottomColor: '#e3e6f0'
                        }}
                        onClick={() => insertTaskMention(task)}
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
              
              <Form.Control.Feedback type="invalid">
                {errors.content}
              </Form.Control.Feedback>
              
              <Form.Text className="text-muted">
                Type @ followed by task name to mention tasks. {formData.content.length}/1000 characters
              </Form.Text>
            </Col>
          </Row>

          {/* Image Attachment */}
          <Row className="mb-3">
            <Col>
              <Form.Label>Image Attachment (Optional)</Form.Label>
              <Form.Control
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                isInvalid={!!errors.image}
              />
              <Form.Control.Feedback type="invalid">
                {errors.image}
              </Form.Control.Feedback>
              <Form.Text className="text-muted">
                Supported formats: PNG, JPG, GIF, etc. Maximum size: 5MB
              </Form.Text>
              
              {/* Image Preview */}
              {imagePreview && (
                <div className="mt-3">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <small className="text-muted"><strong>Image Preview:</strong></small>
                    <Button 
                      variant="outline-danger" 
                      size="sm" 
                      onClick={removeImage}
                    >
                      Remove
                    </Button>
                  </div>
                  <div className="border rounded p-2" style={{ maxHeight: '200px', overflow: 'hidden' }}>
                    <img 
                      src={imagePreview} 
                      alt="Preview" 
                      className="img-fluid rounded"
                      style={{ maxHeight: '180px', width: 'auto' }}
                    />
                  </div>

                </div>
              )}
            </Col>
          </Row>

          {/* Post Preview Info */}
          <Row>
            <Col>
              <Alert variant="light" className="border">
                {/* Show mentioned tasks preview */}
                {mentionedTasks.length > 0 && (
                  <div>
                    <small className="text-muted d-block mb-1">
                      <strong>Mentioned Tasks:</strong>
                    </small>
                    <div className="d-flex flex-wrap gap-1">
                      {mentionedTasks.map((task, _index) => (
                        <span 
                          key={task._id}
                          className="badge d-flex align-items-center"
                          style={{ 
                            fontSize: '0.75rem',
                            fontWeight: '500',
                            backgroundColor: '#fbbf24',
                            color: '#92400e',
                            border: '1px solid rgb(251, 191, 36)',
                            borderRadius: '0.375rem',
                            padding: '0.25rem 0.5rem'
                          }}
                        >
                          <span className="me-1">📋</span>
                          {task.taskName}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Show message if no preview content */}
                {mentionedTasks.length === 0 && (
                  <small className="text-muted">Preview will appear here as you fill out the form</small>
                )}
              </Alert>
            </Col>
          </Row>
        </Modal.Body>
        
        <Modal.Footer>
          <Button variant="secondary" onClick={onHide} disabled={loading}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={loading}>
            {loading ? 'Creating...' : 'Create Post'}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}