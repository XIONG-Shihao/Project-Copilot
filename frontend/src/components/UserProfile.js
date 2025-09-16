import { useState, useEffect } from 'react';
import { Container, Row, Col, Button, Form, Alert, Spinner, Modal } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import AuthService from '../services/auth.service';
import AppNavbar from './AppNavbar';

export default function UserProfile() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '' });
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordError, setPasswordError] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        setLoading(true);
        const response = await AuthService.getUserProfile();
        setUser(response.data.user);
        setFormData({
          name: response.data.user.name,
          email: response.data.user.email
        });
      } catch (err) {
        // Clear stale user data from localStorage to prevent redirect loop
        localStorage.removeItem('user');
        navigate('/login', { state: { sessionExpired: true } });
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, [navigate]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handlePasswordInputChange = (e) => {
    const { name, value } = e.target;
    setPasswordData({
      ...passwordData,
      [name]: value
    });
    // Clear password error when user starts typing
    if (passwordError) setPasswordError('');
  };

  const handleEditToggle = () => {
    if (editMode) {
      // Cancel edit, reset form data
      setFormData({
        name: user.name,
        email: user.email
      });
    }
    setEditMode(!editMode);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const response = await AuthService.updateProfile(formData.name, formData.email);
      setUser({
        ...user,
        name: response.data.user.name,
        email: response.data.user.email
      });
      toast.success('Profile updated successfully!');
      setEditMode(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  const openPasswordModal = () => {
    setPasswordData({
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
    setPasswordError('');
    setShowPasswordModal(true);
  };

  const closePasswordModal = () => {
    setShowPasswordModal(false);
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    
    // Validate passwords match
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('New passwords don\'t match');
      return;
    }
    
    setChangingPassword(true);
    try {
      await AuthService.changePassword(
        passwordData.currentPassword,
        passwordData.newPassword
      );
      toast.success('Password changed successfully!');
      closePasswordModal();
    } catch (err) {
      setPasswordError(err.response?.data?.message || 'Failed to change password.');
    } finally {
      setChangingPassword(false);
    }
  };

  if (loading) {
    return (
      <div>
        <AppNavbar showDashboardLink={true} />
        <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: 'calc(100vh - 76px)' }}>
          <Spinner animation="border" role="status">
            <span className="visually-hidden">Loading...</span>
          </Spinner>
        </Container>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <AppNavbar showDashboardLink={true} />
      
      {/* Banner Area */}
      <div 
        className="profile-banner"
        style={{
          background: 'linear-gradient(135deg, #3498db, #1abc9c)',
          height: '200px',
          position: 'relative'
        }}
      >
      </div>
      
      <Container className="position-relative">
        {/* Avatar and Quick Actions */}
        <div className="text-center" style={{ marginTop: '-75px' }}>
          <div 
            className="avatar-circle mx-auto shadow"
            style={{
              width: '150px',
              height: '150px',
              borderRadius: '50%',
              background: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '5px solid white'
            }}
          >
            <div
              className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center"
              style={{ width: '140px', height: '140px', fontSize: '60px' }}
            >
              {user?.name.charAt(0).toUpperCase()}
            </div>
          </div>
          
          <h2 className="mt-3 mb-1">{user?.name}</h2>
          <p className="text-muted mb-4">{user?.email}</p>
          
          <div className="d-flex justify-content-center gap-3 mb-5">
            <Button 
              variant={editMode ? 'outline-secondary' : 'outline-primary'}
              onClick={handleEditToggle}
              className="px-4 rounded-pill"
            >
              {editMode ? 'Cancel' : 'Edit Profile'}
            </Button>
            <Button 
              variant="outline-primary"
              onClick={openPasswordModal}
              className="px-4 rounded-pill"
            >
              Change Password
            </Button>
          </div>
        </div>
        
        {/* Profile Content */}
        <div className="profile-content bg-white rounded shadow-sm p-4 mb-5">
          {editMode ? (
            <Form onSubmit={handleSubmit}>
              <h4 className="border-bottom pb-3 mb-4">Edit Your Profile</h4>
              <Row>
                <Col md={6} className="mb-3">
                  <Form.Group>
                    <Form.Label>Name</Form.Label>
                    <Form.Control 
                      type="text" 
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                      className="rounded-pill"
                    />
                  </Form.Group>
                </Col>
                <Col md={6} className="mb-3">
                  <Form.Group>
                    <Form.Label>Email</Form.Label>
                    <Form.Control 
                      type="email" 
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                      className="rounded-pill"
                    />
                  </Form.Group>
                </Col>
              </Row>
              <div className="d-flex justify-content-end">
                <Button 
                  variant="primary" 
                  type="submit"
                  disabled={savingProfile}
                  className="rounded-pill px-4"
                >
                  {savingProfile ? (
                    <>
                      <Spinner
                        as="span"
                        animation="border"
                        size="sm"
                        role="status"
                        aria-hidden="true"
                        className="me-2"
                      />
                      Saving...
                    </>
                  ) : 'Save Changes'}
                </Button>
              </div>
            </Form>
          ) : (
            <div>
              <Row className="mb-4">
                <Col md={6}>
                  <h4 className="border-bottom pb-3 mb-4">Personal Information</h4>
                  <div className="mb-3">
                    <div className="text-muted mb-1">Full Name</div>
                    <div className="fs-5">{user?.name}</div>
                  </div>
                  <div className="mb-3">
                    <div className="text-muted mb-1">Email Address</div>
                    <div className="fs-5">{user?.email}</div>
                  </div>
                </Col>
                <Col md={6}>
                  <h4 className="border-bottom pb-3 mb-4">Account Statistics</h4>
                  <div className="mb-3">
                    <div className="text-muted mb-1">Projects</div>
                    <span className="fs-5">{user?.userProjects?.length || 0}</span>
                    {user?.userProjects?.length > 0 && (
                      <div className="badge bg-success">Active</div>
                    )}
                  </div>
                  <div className="mb-3">
                    <div className="text-muted mb-1">Account Status</div>
                    <div className="badge bg-success">Active</div>
                  </div>
                </Col>
              </Row>
              
              {user?.userProjects?.length > 0 && (
                <div>
                  <h4 className="border-bottom pb-3 mb-4">Your Projects</h4>
                  <Row>
                    {user.userProjects.map((project, index) => (
                      <Col md={4} key={index} className="mb-3">
                        <div 
                          className="project-card p-3 rounded shadow-sm" 
                          style={{ 
                            background: 'linear-gradient(135deg, #f5f7fa, #e9eef2)',
                            cursor: 'pointer',
                            transition: 'transform 0.2s',
                            height: '100%'
                          }}
                          onClick={() => navigate(`/project/${project._id}`)}
                          onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
                          onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                        >
                          <h5 className="mb-2">{project.projectName}</h5>
                          <div className="text-muted small mb-3">
                            {project.projectDescription?.substring(0, 60)}
                            {project.projectDescription?.length > 60 && '...'}
                          </div>
                          <div className="small">
                            <span className="text-muted">Members: </span>
                            <span className="fw-bold">{project.projectMembers?.length || 0}</span>
                          </div>
                        </div>
                      </Col>
                    ))}
                  </Row>
                </div>
              )}
            </div>
          )}
        </div>
      </Container>

      {/* Password Change Modal */}
      <Modal show={showPasswordModal} onHide={closePasswordModal}>
        <Modal.Header closeButton>
          <Modal.Title>Change Password</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handlePasswordSubmit}>
            {passwordError && (
              <Alert variant="danger">{passwordError}</Alert>
            )}
            <Form.Group className="mb-3">
              <Form.Label>Current Password</Form.Label>
              <Form.Control 
                type="password" 
                name="currentPassword"
                value={passwordData.currentPassword}
                onChange={handlePasswordInputChange}
                required
                className="rounded-pill"
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>New Password</Form.Label>
              <Form.Control 
                type="password" 
                name="newPassword"
                value={passwordData.newPassword}
                onChange={handlePasswordInputChange}
                required
                className="rounded-pill"
              />
              <Form.Text className="text-muted">
                Password must have at least 8 characters, 1 uppercase letter, and 1 special character.
              </Form.Text>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Confirm New Password</Form.Label>
              <Form.Control 
                type="password" 
                name="confirmPassword"
                value={passwordData.confirmPassword}
                onChange={handlePasswordInputChange}
                required
                className="rounded-pill"
              />
            </Form.Group>
            <div className="d-flex justify-content-end">
              <Button variant="outline-secondary" className="me-2 rounded-pill" onClick={closePasswordModal}>
                Cancel
              </Button>
              <Button 
                variant="primary" 
                type="submit"
                disabled={changingPassword}
                className="rounded-pill"
              >
                {changingPassword ? (
                  <>
                    <Spinner
                      as="span"
                      animation="border"
                      size="sm"
                      role="status"
                      aria-hidden="true"
                      className="me-2"
                    />
                    Changing...
                  </>
                ) : 'Change Password'}
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>
    </div>
  );
} 