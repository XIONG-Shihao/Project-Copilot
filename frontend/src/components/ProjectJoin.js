import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Card, Button, Alert, Spinner } from 'react-bootstrap';
import { toast } from 'react-toastify';
import ProjectService from '../services/project.service';

const ProjectJoin = () => {
  const { inviteToken } = useParams();
  const navigate = useNavigate();
  const [projectDetails, setProjectDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [joiningProject, setJoiningProject] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchProjectDetails = async () => {
      try {
        setLoading(true);
        setError('');
        
        const response = await ProjectService.getProjectDetailsFromInvite(inviteToken);
        setProjectDetails(response.data.project);
      } catch (error) {
        if (error.response?.status === 404) {
          setError('Invalid or expired invite link.');
        } else if (error.response?.status === 401) {
          setError('You need to be logged in to join a project.');
        } else {
          setError('Failed to load project details. Please try again.');
        }
      } finally {
        setLoading(false);
      }
    };

    if (inviteToken) {
      fetchProjectDetails();
    } else {
      setError('No invite token provided.');
      setLoading(false);
    }
  }, [inviteToken]);

  const handleJoinProject = async () => {
    try {
      setJoiningProject(true);
      
      const response = await ProjectService.joinProjectViaInvite(inviteToken);
      
      toast.success('Successfully joined the project!');
      
      // Redirect to the project dashboard
      navigate(`/project/${response.data.project.projectId}`);
    } catch (error) {
      if (error.response?.status === 404) {
        toast.error('Invalid or expired invite link.');
      } else if (error.response?.status === 409) {
        toast.error('You are already a member of this project.');
        navigate('/dashboard');
      } else if (error.response?.status === 401) {
        toast.error('You need to be logged in to join a project.');
        navigate('/login');
      } else {
        toast.error('Failed to join project. Please try again.');
      }
    } finally {
      setJoiningProject(false);
    }
  };

  const handleBackToDashboard = () => {
    navigate('/dashboard');
  };

  const handleBackToLogin = () => {
    navigate('/login');
  };

  if (loading) {
    return (
      <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: '100vh' }}>
        <div className="text-center">
          <Spinner animation="border" variant="primary" />
          <p className="mt-3">Loading project details...</p>
        </div>
      </Container>
    );
  }

  if (error) {
    const isAuthError = error === 'You need to be logged in to join a project.';
    
    return (
      <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: '100vh' }}>
        <Card style={{ maxWidth: '500px', width: '100%' }}>
          <Card.Body className="text-center">
            <Alert variant="danger">
              <Alert.Heading>Error</Alert.Heading>
              <p>{error}</p>
            </Alert>
            <Button 
              variant="outline-primary" 
              onClick={isAuthError ? handleBackToLogin : handleBackToDashboard}
            >
              {isAuthError ? 'Back to Login' : 'Back to Dashboard'}
            </Button>
          </Card.Body>
        </Card>
      </Container>
    );
  }

  return (
    <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: '100vh' }}>
      <Card style={{ maxWidth: '600px', width: '100%' }}>
        <Card.Header className="bg-primary text-white text-center">
          <h4 className="mb-0">Project Invitation</h4>
        </Card.Header>
        <Card.Body>
          {projectDetails && (
            <>
              <div className="mb-4">
                <h5 className="text-primary">You've been invited to join:</h5>
                <h3 className="mb-3">{projectDetails.projectName}</h3>
                
                <div className="mb-3">
                  <strong>Description:</strong>
                  <p className="mt-2 text-muted">{projectDetails.projectDescription}</p>
                </div>
                
                <div className="mb-4">
                  <strong>Invited by:</strong>
                  <span className="ms-2 text-primary">{projectDetails.invitedBy}</span>
                </div>
              </div>
              
              <div className="d-grid gap-2">
                <Button 
                  variant="success" 
                  size="lg"
                  onClick={handleJoinProject}
                  disabled={joiningProject}
                >
                  {joiningProject ? (
                    <>
                      <Spinner
                        as="span"
                        animation="border"
                        size="sm"
                        role="status"
                        aria-hidden="true"
                        className="me-2"
                      />
                      Joining...
                    </>
                  ) : (
                    'Join Project'
                  )}
                </Button>
                <Button 
                  variant="outline-secondary"
                  onClick={handleBackToDashboard}
                  disabled={joiningProject}
                >
                  Back to Dashboard
                </Button>
              </div>
            </>
          )}
        </Card.Body>
      </Card>
    </Container>
  );
};

export default ProjectJoin;
