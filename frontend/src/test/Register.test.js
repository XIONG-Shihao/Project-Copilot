// src/test/Register.test.js
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Import the component after all mocks are set up
import Register from '../components/Register';

// Create mock functions that will be accessible in tests
let mockNavigate;
let mockRegister;

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
  register: (...args) => {
    if (!mockRegister) mockRegister = jest.fn(() => Promise.resolve({ data: { user: { name: 'Test User', email: 'test@example.com' } } }));
    return mockRegister(...args);
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
  mockRegister = jest.fn(() => Promise.resolve({ data: { user: { name: 'Test User', email: 'test@example.com' } } }));
  // Clear localStorage mock calls
  localStorage.setItem.mockClear();
});

test('renders Register form with all fields', () => {
  render(
    <MemoryRouter>
      <Register />
    </MemoryRouter>
  );
  
  // Check for component title and logo
  expect(screen.getByText('ProjectCopilot')).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Register' })).toBeInTheDocument();
  
  // Check for all form fields
  expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
  
  // Check for register button and login link
  expect(screen.getByRole('button', { name: /register/i })).toBeInTheDocument();
  expect(screen.getByText(/already have an account/i)).toBeInTheDocument();
  expect(screen.getByText(/login/i)).toBeInTheDocument();
});

test('shows error when passwords do not match', async () => {
  render(
    <MemoryRouter>
      <Register />
    </MemoryRouter>
  );
  
  // Fill in the form with mismatched passwords
  fireEvent.change(screen.getByLabelText(/name/i), { target: { value: 'Test User' } });
  fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: 'test@example.com' } });
  fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: 'Password123!' } });
  fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: 'DifferentPassword!' } });
  
  // Submit the form
  fireEvent.click(screen.getByRole('button', { name: /register/i }));
  
  // Check for error message
  await waitFor(() => {
    expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
  });
  
  // Verify the register function was not called
  expect(mockRegister).not.toHaveBeenCalled();
});

test('submits form and navigates to dashboard on success', async () => {
  render(
    <MemoryRouter>
      <Register />
    </MemoryRouter>
  );
  
  // Fill in the form with matching passwords
  fireEvent.change(screen.getByLabelText(/name/i), { target: { value: 'Test User' } });
  fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: 'test@example.com' } });
  fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: 'Password123!' } });
  fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: 'Password123!' } });
  
  // Submit the form
  fireEvent.click(screen.getByRole('button', { name: /register/i }));
  
  // Wait for the register API call
  await waitFor(() => {
    expect(mockRegister).toHaveBeenCalledWith('Test User', 'test@example.com', 'Password123!');
  });
  
  // Check that user data was stored in localStorage
  expect(localStorage.setItem).toHaveBeenCalledWith(
    'user', 
    JSON.stringify({ name: 'Test User', email: 'test@example.com' })
  );
  
  // Wait for navigation to occur (the toast callback should trigger it)
  await waitFor(() => {
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
  }, { timeout: 3000 });
}); 