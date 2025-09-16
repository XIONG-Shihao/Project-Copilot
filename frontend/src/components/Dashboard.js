import { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Badge, Alert, Modal, Form } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import AuthService from '../services/auth.service';
import ProjectService from '../services/project.service';
import AppNavbar from './AppNavbar';

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newProject, setNewProject] = useState({ name: '', description: '' });

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const response = await AuthService.getUserProfile();
        setUser(response.data.user);
        setProjects(response.data.user.userProjects || []);
        setLoading(false);
      } catch (err) {
        // Clear stale user data from localStorage to prevent redirect loop
        localStorage.removeItem('user');
        navigate('/login', { state: { sessionExpired: true } });
      }
    };

    fetchUserProfile();
  }, [navigate]);

  const refreshUserProfile = async () => {
    try {
      const response = await AuthService.getUserProfile();
      setUser(response.data.user);
      setProjects(response.data.user.userProjects || []);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Profile refresh error:', err);
      if (err.response?.status === 401) {
        // Clear stale user data from localStorage to prevent redirect loop
        localStorage.removeItem('user');
        navigate('/login', { state: { sessionExpired: true } });
      } else {
        setError(`Failed to refresh user profile: ${err.response?.data?.message || err.message}`);
      }
    }
  };

  const handleCreateProject = async () => {
    if (!newProject.name.trim() || !newProject.description.trim()) {
      toast.warning('Please fill in both project name and description.', {
        autoClose: 3000
      });
      return;
    }

    try {
      const promise = toast.promise(
        ProjectService.createProject(newProject.name, newProject.description),
        {
          loading: 'Creating your project...',
          success: 'Project created successfully! 🎉',
          error: 'Failed to create project. Please try again.'
        }
      );

      await promise;
      setShowCreateModal(false);
      setNewProject({ name: '', description: '' });
      refreshUserProfile(); // Refresh the projects list
    } catch (error) {
      // Error already handled by toast.promise
    }
  };

  const handleCloseModal = () => {
    setShowCreateModal(false);
    setNewProject({ name: '', description: '' });
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '100vh' }}>
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <div>
      {/* Navigation Bar */}
      <AppNavbar />

      {/* Main Content */}
      <Container className="mt-4">
        {error && (
          <Alert variant="danger" dismissible onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Welcome Section */}
        <Row className="mb-4">
          <Col>
            <h2>Welcome, {user?.name}! 👋</h2>
            <p className="text-muted">Manage your projects and collaborate with your team</p>
          </Col>
        </Row>

        {/* Projects Section */}
        <Row className="mb-4">
          <Col>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h4>Your Projects</h4>
              <Button variant="primary" onClick={() => setShowCreateModal(true)}>
                + Create New Project
              </Button>
            </div>
          </Col>
        </Row>

        {/* Projects Grid */}
        <Row>
          {projects.length === 0 ? (
            <Col>
              <Card className="text-center py-5">
                <Card.Body>
                  <h5 className="text-muted">No projects yet</h5>
                  <p className="text-muted">Create your first project to get started</p>
                  <Button variant="outline-primary" onClick={() => setShowCreateModal(true)}>
                    Create Your First Project
                  </Button>
                </Card.Body>
              </Card>
            </Col>
          ) : (
            projects.map((project) => (
              <Col key={project._id} md={6} lg={4} className="mb-3">
                <Card className="h-100 shadow-sm">
                  <Card.Body>
                    <Card.Title>{project.projectName}</Card.Title>
                    <Card.Text className="text-muted">
                      {project.projectDescription}
                    </Card.Text>
                    <div className="d-flex justify-content-between align-items-center">
                      <Badge bg="secondary">
                        {project.projectMembers?.length || 0} members
                      </Badge>
                      <Button 
                        variant="outline-primary" 
                        size="sm"
                        onClick={() => navigate(`/project/${project._id}`)}
                      >
                        View Project
                      </Button>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            ))
          )}
        </Row>
      </Container>

      {/* Create Project Modal */}
      <Modal show={showCreateModal} onHide={handleCloseModal}>
        <Modal.Header closeButton>
          <Modal.Title>Create New Project</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3" controlId="projectName">
              <Form.Label>Project Name</Form.Label>
              <Form.Control
                type="text"
                placeholder="Enter project name"
                value={newProject.name}
                onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
              />
            </Form.Group>
            <Form.Group className="mb-3" controlId="projectDescription">
              <Form.Label>Project Description</Form.Label>
              <Form.Control
                as="textarea"
                placeholder="Enter project description"
                value={newProject.description}
                onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseModal}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleCreateProject}>
            Create Project
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
} 