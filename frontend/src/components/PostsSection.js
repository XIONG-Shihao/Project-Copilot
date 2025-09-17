import { useState, useEffect, useCallback } from 'react';
import { Card, Button, Row, Col, Alert, Spinner } from 'react-bootstrap';
import { toast } from 'react-toastify';
import ProjectService from '../services/project.service';
import CreatePost from './CreatePost';
import PostItem from './PostItem';

export default function PostsSection({ project, projectId, currentUser }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [creatingPost, setCreatingPost] = useState(false);

  const fetchPosts = useCallback(async () => {
    try {
      setLoading(true);
      const response = await ProjectService.getProjectPosts(projectId);
      setPosts(response.data.posts || []);
      setError(null);
    } catch (err) {
    // Error fetching posts
      setError(err.response?.data?.message || 'Failed to load posts');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const handleCreatePost = async (postData) => {
    try {
      setCreatingPost(true);
      await ProjectService.createPost(projectId, postData);
      toast.success('Post created successfully!');
      setShowCreatePost(false);
      await fetchPosts(); // Refresh posts
    } catch (err) {
      // Error creating post
      toast.error(err.response?.data?.message || 'Failed to create post');
    } finally {
      setCreatingPost(false);
    }
  };

  const handlePostUpdate = () => {
    // Refresh posts list to handle deletions and other updates that need server data
    fetchPosts();
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center py-5">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading posts...</span>
        </Spinner>
      </div>
    );
  }

  return (
    <div>
      {error && (
        <Alert variant="danger" dismissible onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Header with New Post Button */}
      <Row className="mb-4">
        <Col>
          <Card style={{ boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)' }}>
            <Card.Body className="p-4">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h4 className="mb-1 fw-semibold">Project Posts</h4>
                  <p className="text-muted mb-0" style={{ fontSize: '0.875rem' }}>
                    Share updates, feedback, and discussions with your team
                  </p>
                </div>
                <Button 
                  variant="primary" 
                  onClick={() => setShowCreatePost(true)}
                  disabled={creatingPost}
                  className="px-4 py-2"
                  style={{ fontSize: '0.875rem', fontWeight: '500' }}
                >
                  + New Post
                </Button>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>



      {/* Posts List */}
      <Row>
        <Col>
          {posts.length === 0 ? (
            <Card 
              className="text-center py-5"
              style={{ boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)' }}
            >
              <Card.Body className="p-5">
                <div className="text-muted">
                  <svg 
                    width="48" 
                    height="48" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="1" 
                    viewBox="0 0 24 24"
                    className="mx-auto mb-3"
                    style={{ color: '#9ca3af' }}
                  >
                    <path d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 0 1-4-.86L3 20l1.26-3.487A8.969 8.969 0 0 1 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
                  </svg>
                  <h5 className="mb-2">No posts yet</h5>
                  <p className="mb-3" style={{ fontSize: '0.875rem' }}>
                    Be the first to create a post and start the conversation!
                  </p>
                  <Button 
                    variant="primary" 
                    onClick={() => setShowCreatePost(true)}
                    className="px-4 py-2"
                    style={{ fontSize: '0.875rem', fontWeight: '500' }}
                  >
                    Create First Post
                  </Button>
                </div>
              </Card.Body>
            </Card>
          ) : (
            <div className="posts-list">
              {posts.map((post) => (
                <PostItem
                  key={post._id}
                  post={post}
                  currentUser={currentUser}
                  project={project}
                  onUpdate={handlePostUpdate}
                />
              ))}
            </div>
          )}
        </Col>
      </Row>

      {/* Create Post Modal */}
      <CreatePost
        show={showCreatePost}
        onHide={() => setShowCreatePost(false)}
        onSubmit={handleCreatePost}
        project={project}
        loading={creatingPost}
      />
    </div>
  );
}