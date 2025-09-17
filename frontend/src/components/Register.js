import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import AuthService from '../services/auth.service';
import { Form, Button, Container, Row, Col, Card, Alert } from 'react-bootstrap';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

export default function Register() {
  const { register, handleSubmit } = useForm({
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: ''
    },
  });
  const [passwordError, setPasswordError] = useState('');
  const navigate = useNavigate();

  const onSubmit = async (data) => {
    setPasswordError('');
    if (data.password !== data.confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }
    try {
      const response = await AuthService.register(data.name, data.email, data.password);
      
      // Store user data in localStorage
      localStorage.setItem('user', JSON.stringify(response.data.user));
      
      // Show success toast and navigate
      toast.success('Account created successfully! Setting up your workspace...', {
        autoClose: 2500,
        onClose: () => navigate('/dashboard')
      });
    } catch (error) {
      toast.error(`Registration failed: ${error.response?.data?.message || error.message}`, {
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
              <h2 className="mb-4 text-center">Register</h2>
              {passwordError && <Alert variant="danger">{passwordError}</Alert>}
              <Form onSubmit={handleSubmit(onSubmit)}>
                <Form.Group className="mb-3" controlId="formName">
                  <Form.Label>Name</Form.Label>
                  <Form.Control type="text" placeholder="Enter name" {...register('name')} required />
                </Form.Group>
                <Form.Group className="mb-3" controlId="formEmail">
                  <Form.Label>Email address</Form.Label>
                  <Form.Control type="email" placeholder="Enter email" {...register('email')} required />
                </Form.Group>
                <Form.Group className="mb-3" controlId="formPassword">
                  <Form.Label>Password</Form.Label>
                  <Form.Control type="password" placeholder="Password" {...register('password')} required />
                </Form.Group>
                <Form.Group className="mb-3" controlId="formConfirmPassword">
                  <Form.Label>Confirm Password</Form.Label>
                  <Form.Control type="password" placeholder="Confirm Password" {...register('confirmPassword')} required />
                </Form.Group>
                <Button variant="primary" type="submit" className="w-100">
                  Register
                </Button>
              </Form>
              <div className="mt-3 text-center">
                <span>Already have an account? </span>
                <Link to="/login">Login</Link>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}
