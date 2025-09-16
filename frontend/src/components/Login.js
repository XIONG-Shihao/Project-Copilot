import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import AuthService from '../services/auth.service';
import { Form, Button, Container, Row, Col, Card, Alert } from 'react-bootstrap';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';

export default function Login() {
  const { register, handleSubmit } = useForm({
    defaultValues: {
      email: '',
      password: '',
      rememberMe: false
    },
  });
  const navigate = useNavigate();
  const location = useLocation();
  const [sessionMessage, setSessionMessage] = useState(null);

  useEffect(() => {
    // Check if we were redirected here due to session expiry
    if (location.state?.sessionExpired) {
      setSessionMessage('Your session has expired. Please log in again.');
      // Clear the state so the message doesn't persist on refresh
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const onSubmit = async (data) => {
    setSessionMessage(null); // Clear any session messages when user attempts to login
    try {
      const response = await AuthService.login(data.email, data.password, data.rememberMe);
      
      // Store user data in localStorage
      localStorage.setItem('user', JSON.stringify(response.data.user));
      
      // Show success toast and navigate
      toast.success('Login successful! Redirecting to dashboard...', {
        autoClose: 2000,
        onClose: () => navigate('/dashboard')
      });
    } catch (error) {
      toast.error(`Login failed: ${error.response?.data?.message || error.message}`, {
        autoClose: 4000
      });
    }
  };

  return (
    <Container className="d-flex align-items-center justify-content-center" style={{ minHeight: '100vh' }}>
      <Row className="w-100 justify-content-center">
        <Col md={6} lg={5}>
          <div className="text-center mb-3">
            <span style={{ color: '#007bff', fontWeight: 'bold', fontSize: '2rem', letterSpacing: '2px' }}>CollabMate</span>
          </div>
          <Card>
            <Card.Body>
              {sessionMessage && (
                <Alert variant="warning" className="mb-3">
                  {sessionMessage}
                </Alert>
              )}
              <h2 className="mb-4 text-center">Login</h2>
              <Form onSubmit={handleSubmit(onSubmit)}>
                <Form.Group className="mb-3" controlId="formEmail">
                  <Form.Label>Email address</Form.Label>
                  <Form.Control type="email" placeholder="Enter email" {...register('email')} required />
                </Form.Group>
                <Form.Group className="mb-3" controlId="formPassword">
                  <Form.Label>Password</Form.Label>
                  <Form.Control type="password" placeholder="Password" {...register('password')} required />
                </Form.Group>
                <Form.Group className="mb-3" controlId="formRememberMe">
                  <Form.Check 
                    type="checkbox" 
                    label="Remember me" 
                    {...register('rememberMe')} 
                  />
                </Form.Group>
                <Button variant="primary" type="submit" className="w-100">
                  Login
                </Button>
              </Form>
              <div className="mt-3 text-center">
                <span>Don't have an account? </span>
                <Link to="/register">Register</Link>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
} 