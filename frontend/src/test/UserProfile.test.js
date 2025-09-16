// src/test/UserProfile.test.js
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Import the component after all mocks are set up
import UserProfile from '../components/UserProfile';

// Create mock functions that will be accessible in tests
let mockNavigate;
let mockGetUserProfile;
let mockUpdateProfile;
let mockChangePassword;

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
  getUserProfile: (...args) => {
    if (!mockGetUserProfile) mockGetUserProfile = jest.fn(() => Promise.resolve({ 
      data: { 
        user: { 
          name: 'John Doe', 
          email: 'john@example.com',
          userProjects: [
            {
              _id: '1',
              projectName: 'Test Project',
              projectDescription: 'A test project description',
              projectMembers: ['user1', 'user2']
            }
          ]
        } 
      } 
    }));
    return mockGetUserProfile(...args);
  },
  updateProfile: (...args) => {
    if (!mockUpdateProfile) mockUpdateProfile = jest.fn(() => Promise.resolve({ 
      data: { 
        user: { 
          name: 'Updated Name', 
          email: 'updated@example.com' 
        } 
      } 
    }));
    return mockUpdateProfile(...args);
  },
  changePassword: (...args) => {
    if (!mockChangePassword) mockChangePassword = jest.fn(() => Promise.resolve());
    return mockChangePassword(...args);
  }
}));

jest.mock('react-toastify', () => {
  return {
    toast: {
      success: jest.fn(),
      error: jest.fn(),
    }
  };
});

// Mock AppNavbar component
jest.mock('../components/AppNavbar', () => {
  return function MockAppNavbar({ showDashboardLink }) {
    return <div data-testid="app-navbar">Mock AppNavbar (showDashboardLink: {showDashboardLink?.toString()})</div>;
  };
});

// Silence all warnings in this file:
beforeAll(() => {
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation((message) => {
    // Suppress React act() warnings during tests
    if (message.includes('Warning: An update to') || message.includes('act(...)')) {
      return;
    }
    // Let other errors through
    // eslint-disable-next-line no-console
    console.log(message);
  });
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
  // eslint-disable-next-line no-console
  console.error.mockRestore();
});

beforeEach(() => {
  // Reset mock functions before each test
  mockNavigate = jest.fn();
  mockGetUserProfile = jest.fn(() => Promise.resolve({ 
    data: { 
      user: { 
        name: 'John Doe', 
        email: 'john@example.com',
        userProjects: [
          {
            _id: '1',
            projectName: 'Test Project',
            projectDescription: 'A test project description',
            projectMembers: ['user1', 'user2']
          }
        ]
      } 
    } 
  }));
  mockUpdateProfile = jest.fn(() => Promise.resolve({ 
    data: { 
      user: { 
        name: 'Updated Name', 
        email: 'updated@example.com' 
      } 
    } 
  }));
  mockChangePassword = jest.fn(() => Promise.resolve());
});

test('renders UserProfile with loading spinner initially', () => {
  render(
    <MemoryRouter>
      <UserProfile />
    </MemoryRouter>
  );
  
  expect(screen.getByTestId('app-navbar')).toBeInTheDocument();
  expect(screen.getByText('Loading...')).toBeInTheDocument();
});

test('renders user profile after loading', async () => {
  render(
    <MemoryRouter>
      <UserProfile />
    </MemoryRouter>
  );
  
  // Wait for profile to load
  await waitFor(() => {
    expect(mockGetUserProfile).toHaveBeenCalled();
  });
  
  await waitFor(() => {
    expect(screen.getAllByText('John Doe')).toHaveLength(2); // Header and personal info section
  });
  
  await waitFor(() => {
    expect(screen.getAllByText('john@example.com')).toHaveLength(2); // Header and personal info section
  });
  
  await waitFor(() => {
    expect(screen.getByText('Edit Profile')).toBeInTheDocument();
  });
  
  await waitFor(() => {
    expect(screen.getByText('Change Password')).toBeInTheDocument();
  });
});

test('displays user projects when available', async () => {
  render(
    <MemoryRouter>
      <UserProfile />
    </MemoryRouter>
  );
  
  await waitFor(() => {
    expect(screen.getByText('Your Projects')).toBeInTheDocument();
  });
  
  await waitFor(() => {
    expect(screen.getByText('Test Project')).toBeInTheDocument();
  });
  
  await waitFor(() => {
    expect(screen.getByText('A test project description')).toBeInTheDocument();
  });
});

test('enters edit mode when Edit Profile is clicked', async () => {
  render(
    <MemoryRouter>
      <UserProfile />
    </MemoryRouter>
  );
  
  await waitFor(() => {
    expect(screen.getByText('Edit Profile')).toBeInTheDocument();
  });
  
  fireEvent.click(screen.getByText('Edit Profile'));
  
  await waitFor(() => {
    expect(screen.getByText('Edit Your Profile')).toBeInTheDocument();
  });
  
  await waitFor(() => {
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });
  
  await waitFor(() => {
    expect(screen.getByText('Save Changes')).toBeInTheDocument();
  });
  
  await waitFor(() => {
    expect(screen.getByDisplayValue('John Doe')).toBeInTheDocument();
  });
  
  await waitFor(() => {
    expect(screen.getByDisplayValue('john@example.com')).toBeInTheDocument();
  });
});

test('cancels edit mode when Cancel is clicked', async () => {
  render(
    <MemoryRouter>
      <UserProfile />
    </MemoryRouter>
  );
  
  await waitFor(() => {
    expect(screen.getByText('Edit Profile')).toBeInTheDocument();
  });
  
  fireEvent.click(screen.getByText('Edit Profile'));
  
  await waitFor(() => {
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });
  
  fireEvent.click(screen.getByText('Cancel'));
  
  await waitFor(() => {
    expect(screen.getByText('Edit Profile')).toBeInTheDocument();
  });
  
  await waitFor(() => {
    expect(screen.queryByText('Edit Your Profile')).not.toBeInTheDocument();
  });
});

test('submits profile update successfully', async () => {
  const { toast } = require('react-toastify');
  
  render(
    <MemoryRouter>
      <UserProfile />
    </MemoryRouter>
  );
  
  await waitFor(() => {
    expect(screen.getByText('Edit Profile')).toBeInTheDocument();
  });
  
  fireEvent.click(screen.getByText('Edit Profile'));
  
  // Update form fields
  const nameInput = screen.getByDisplayValue('John Doe');
  const emailInput = screen.getByDisplayValue('john@example.com');
  
  fireEvent.change(nameInput, { target: { value: 'Updated Name' } });
  fireEvent.change(emailInput, { target: { value: 'updated@example.com' } });
  
  // Submit form
  fireEvent.click(screen.getByText('Save Changes'));
  
  await waitFor(() => {
    expect(mockUpdateProfile).toHaveBeenCalledWith('Updated Name', 'updated@example.com');
  });
  
  await waitFor(() => {
    expect(toast.success).toHaveBeenCalledWith('Profile updated successfully!');
  });
});

test('opens password change modal', async () => {
  render(
    <MemoryRouter>
      <UserProfile />
    </MemoryRouter>
  );
  
  await waitFor(() => {
    expect(screen.getByText('Change Password')).toBeInTheDocument();
  });
  
  fireEvent.click(screen.getByText('Change Password'));
  
  await waitFor(() => {
    expect(screen.getAllByText('Change Password')).toHaveLength(3); // Button, modal title, submit button
  });
  
  await waitFor(() => {
    expect(screen.getByText('Current Password')).toBeInTheDocument();
  });
  
  await waitFor(() => {
    expect(screen.getByText('New Password')).toBeInTheDocument();
  });
  
  await waitFor(() => {
    expect(screen.getByText('Confirm New Password')).toBeInTheDocument();
  });
});

test('submits password change successfully', async () => {
  const { toast } = require('react-toastify');
  
  render(
    <MemoryRouter>
      <UserProfile />
    </MemoryRouter>
  );
  
  await waitFor(() => {
    expect(screen.getByText('Change Password')).toBeInTheDocument();
  });
  
  fireEvent.click(screen.getByText('Change Password'));
  
  await waitFor(() => {
    expect(screen.getAllByText('Change Password')).toHaveLength(3);
  });
  
  // Fill in password form using Testing Library methods
  const passwordInputs = screen.getAllByDisplayValue('');
  const currentPasswordInput = passwordInputs.find(input => input.name === 'currentPassword');
  const newPasswordInput = passwordInputs.find(input => input.name === 'newPassword');
  const confirmPasswordInput = passwordInputs.find(input => input.name === 'confirmPassword');
  
  fireEvent.change(currentPasswordInput, { 
    target: { value: 'currentPassword123!' } 
  });
  fireEvent.change(newPasswordInput, { 
    target: { value: 'newPassword123!' } 
  });
  fireEvent.change(confirmPasswordInput, { 
    target: { value: 'newPassword123!' } 
  });
  
  // Submit password change
  const changePasswordButtons = screen.getAllByText('Change Password');
  const submitButton = changePasswordButtons.find(button => button.type === 'submit');
  fireEvent.click(submitButton);
  
  await waitFor(() => {
    expect(mockChangePassword).toHaveBeenCalledWith('currentPassword123!', 'newPassword123!');
  });
  
  await waitFor(() => {
    expect(toast.success).toHaveBeenCalledWith('Password changed successfully!');
  });
});

test('shows error when passwords do not match', async () => {
  render(
    <MemoryRouter>
      <UserProfile />
    </MemoryRouter>
  );
  
  await waitFor(() => {
    expect(screen.getByText('Change Password')).toBeInTheDocument();
  });
  
  fireEvent.click(screen.getByText('Change Password'));
  
  await waitFor(() => {
    expect(screen.getAllByText('Change Password')).toHaveLength(3);
  });
  
  // Fill in password form with mismatched passwords
  const passwordInputs = screen.getAllByDisplayValue('');
  const currentPasswordInput = passwordInputs.find(input => input.name === 'currentPassword');
  const newPasswordInput = passwordInputs.find(input => input.name === 'newPassword');
  const confirmPasswordInput = passwordInputs.find(input => input.name === 'confirmPassword');
  
  fireEvent.change(currentPasswordInput, { 
    target: { value: 'currentPassword123!' } 
  });
  fireEvent.change(newPasswordInput, { 
    target: { value: 'newPassword123!' } 
  });
  fireEvent.change(confirmPasswordInput, { 
    target: { value: 'differentPassword123!' } 
  });
  
  // Submit password change
  const changePasswordButtons = screen.getAllByText('Change Password');
  const submitButton = changePasswordButtons.find(button => button.type === 'submit');
  fireEvent.click(submitButton);
  
  await waitFor(() => {
    expect(screen.getByText('New passwords don\'t match')).toBeInTheDocument();
  });
  
  expect(mockChangePassword).not.toHaveBeenCalled();
});

test('handles 401 error and navigates to login', async () => {
  mockGetUserProfile.mockRejectedValue({
    response: { status: 401 }
  });
  
  render(
    <MemoryRouter>
      <UserProfile />
    </MemoryRouter>
  );
  
  await waitFor(() => {
    expect(mockNavigate).toHaveBeenCalledWith('/login', { state: { sessionExpired: true } });
  });
});

test('navigates to project when project card is clicked', async () => {
  render(
    <MemoryRouter>
      <UserProfile />
    </MemoryRouter>
  );
  
  await waitFor(() => {
    expect(screen.getByText('Test Project')).toBeInTheDocument();
  });
  
  fireEvent.click(screen.getByText('Test Project'));
  
  expect(mockNavigate).toHaveBeenCalledWith('/project/1');
});

test('handles profile update error', async () => {
  const { toast } = require('react-toastify');
  mockUpdateProfile.mockRejectedValue({
    response: { data: { message: 'Update failed' } }
  });
  
  render(
    <MemoryRouter>
      <UserProfile />
    </MemoryRouter>
  );
  
  await waitFor(() => {
    expect(screen.getByText('Edit Profile')).toBeInTheDocument();
  });
  
  fireEvent.click(screen.getByText('Edit Profile'));
  
  fireEvent.click(screen.getByText('Save Changes'));
  
  await waitFor(() => {
    expect(toast.error).toHaveBeenCalledWith('Update failed');
  });
});

test('handles password change error', async () => {
  mockChangePassword.mockRejectedValue({
    response: { data: { message: 'Password change failed' } }
  });
  
  render(
    <MemoryRouter>
      <UserProfile />
    </MemoryRouter>
  );
  
  await waitFor(() => {
    expect(screen.getByText('Change Password')).toBeInTheDocument();
  });
  
  fireEvent.click(screen.getByText('Change Password'));
  
  await waitFor(() => {
    expect(screen.getAllByText('Change Password')).toHaveLength(3);
  });
  
  // Fill in password form using Testing Library methods
  const passwordInputs = screen.getAllByDisplayValue('');
  const currentPasswordInput = passwordInputs.find(input => input.name === 'currentPassword');
  const newPasswordInput = passwordInputs.find(input => input.name === 'newPassword');
  const confirmPasswordInput = passwordInputs.find(input => input.name === 'confirmPassword');
  
  fireEvent.change(currentPasswordInput, { 
    target: { value: 'currentPassword123!' } 
  });
  fireEvent.change(newPasswordInput, { 
    target: { value: 'newPassword123!' } 
  });
  fireEvent.change(confirmPasswordInput, { 
    target: { value: 'newPassword123!' } 
  });
  
  // Submit password change
  const changePasswordButtons = screen.getAllByText('Change Password');
  const submitButton = changePasswordButtons.find(button => button.type === 'submit');
  fireEvent.click(submitButton);
  
  await waitFor(() => {
    expect(screen.getByText('Password change failed')).toBeInTheDocument();
  });
});