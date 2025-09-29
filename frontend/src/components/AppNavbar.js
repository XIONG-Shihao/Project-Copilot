import { Navbar, Nav, Container } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import AuthService from '../services/auth.service';

export default function AppNavbar({ showDashboardLink = false }) {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await AuthService.logout();
      toast.success('Logged out successfully!', {
        autoClose: 2000,
        onClose: () => {
          localStorage.removeItem('user');
          navigate('/login');
        }
      });
    } catch (err) {
      toast.error('Logout failed. Please try again.', {
        autoClose: 3000
      });
    }
  };

  const goBackToDashboard = () => {
    navigate('/dashboard');
  };
  
  const goToProfile = () => {
    navigate('/profile');
  };

  return (
    <Navbar bg="light" expand="lg" className="px-3 shadow-sm">
      <Container fluid>
        <Navbar.Brand>
          <span style={{ color: '#007bff', fontWeight: 'bold', fontSize: '1.5rem', letterSpacing: '2px' }}>
            ProjectCopilot
          </span>
        </Navbar.Brand>
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="ms-auto">
            {showDashboardLink && (
              <Nav.Link onClick={goBackToDashboard}>Dashboard</Nav.Link>
            )}
            <Nav.Link onClick={goToProfile}>Profile</Nav.Link>
            <Nav.Link onClick={handleLogout}>Logout</Nav.Link>
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}
