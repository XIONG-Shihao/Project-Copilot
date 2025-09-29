// src/test/Login.test.js
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Import the component after all mocks are set up
import Login from '../components/Login';

// Create mock functions that will be accessible in tests
let mockNavigate;
let mockLogin;

// Mock modules before importing the component
jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => {
      if (!mockNavigate) mockNavigate = jest.fn();
      return mockNavigate;
    },
  };
});

jest.mock('../services/auth.service', () => ({
  login: (...args) => {
    if (!mockLogin) mockLogin = jest.fn(() => Promise.resolve({ data: { user: { email: 'test@example.com' } } }));
    return mockLogin(...args);
  }
}));

jest.mock('react-toastify', () => {
  return {
    toast: {
      success: (message, options) => {
        // Immediately execute the onClose callback if provided
        if (options && typeof options.onClose === 'function') {
          setTimeout(options.onClose, 0);
        }
        return { id: 'mock-toast-id' };
      },
      error: jest.fn(),
    }
  };
});

// Silence all warnings in this file:
beforeAll(() => {
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  Object.defineProperty(window, 'localStorage', {
    value: {
      setItem: jest.fn(),
      getItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn(),
    },
    writable: true,
  });
});

afterAll(() => {
  // eslint-disable-next-line no-console
  console.warn.mockRestore();
});

beforeEach(() => {
  // Reset mock functions before each test
  mockNavigate = jest.fn();
  mockLogin = jest.fn(() => Promise.resolve({ data: { user: { email: 'test@example.com' } } }));
});

test('renders Login and finds form fields', () => {
  render(
    <MemoryRouter>
      <Login />
    </MemoryRouter>
  );
  expect(screen.getByText('ProjectCopilot')).toBeInTheDocument();
  expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/remember me/i)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
  expect(screen.getByText(/register/i)).toBeInTheDocument();
});

test('submits form and navigates to dashboard on success', async () => {
  render(
    <MemoryRouter>
      <Login />
    </MemoryRouter>
  );
  
  // Fill in the form
  fireEvent.change(screen.getByLabelText(/email address/i), { 
    target: { value: 'test@example.com' } 
  });
  fireEvent.change(screen.getByLabelText(/password/i), { 
    target: { value: 'Password123!' } 
  });
  
  // Submit the form
  fireEvent.click(screen.getByRole('button', { name: /login/i }));
  
  // Wait for the login API call
  await waitFor(() => {
    expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'Password123!', false);
  });
  
  // Wait for navigation to occur (the toast callback should trigger it)
  await waitFor(() => {
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
  }, { timeout: 3000 });
});

// Add a test for the remember me functionality
test('submits form with remember me checked', async () => {
  render(
    <MemoryRouter>
      <Login />
    </MemoryRouter>
  );
  
  // Fill in the form
  fireEvent.change(screen.getByLabelText(/email address/i), { 
    target: { value: 'test@example.com' } 
  });
  fireEvent.change(screen.getByLabelText(/password/i), { 
    target: { value: 'Password123!' } 
  });
  
  // Check the remember me box
  fireEvent.click(screen.getByLabelText(/remember me/i));
  
  // Submit the form
  fireEvent.click(screen.getByRole('button', { name: /login/i }));
  
  // Wait for the login API call
  await waitFor(() => {
    expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'Password123!', true);
  });
});