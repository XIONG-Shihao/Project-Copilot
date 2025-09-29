import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Import the component after all mocks are set up
import ProjectJoin from '../components/ProjectJoin';

// Create mock functions that will be accessible in tests
let mockNavigate;
let mockGetProjectDetailsFromInvite;
let mockJoinProjectViaInvite;
let mockToastSuccess;
let mockToastError;

// Mock modules before importing the component
jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => {
      if (!mockNavigate) mockNavigate = jest.fn();
      return mockNavigate;
    },
    useParams: () => ({ inviteToken: 'test-invite-token' }),
  };
});

jest.mock('../services/project.service', () => ({
  getProjectDetailsFromInvite: (...args) => {
    if (!mockGetProjectDetailsFromInvite) mockGetProjectDetailsFromInvite = jest.fn(() => 
      Promise.resolve({
        data: {
          project: {
            projectName: 'Test Project',
            projectDescription: 'This is a test project description',
            invitedBy: 'test@example.com'
          }
        }
      })
    );
    return mockGetProjectDetailsFromInvite(...args);
  },
  joinProjectViaInvite: (...args) => {
    if (!mockJoinProjectViaInvite) mockJoinProjectViaInvite = jest.fn(() => 
      Promise.resolve({
        data: {
          project: {
            projectId: 'test-project-id'
          }
        }
      })
    );
    return mockJoinProjectViaInvite(...args);
  }
}));

jest.mock('react-toastify', () => {
  return {
    toast: {
      success: (...args) => {
        if (!mockToastSuccess) mockToastSuccess = jest.fn();
        return mockToastSuccess(...args);
      },
      error: (...args) => {
        if (!mockToastError) mockToastError = jest.fn();
        return mockToastError(...args);
      },
    }
  };
});

// Silence all warnings in this file:
beforeAll(() => {
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterAll(() => {
  // eslint-disable-next-line no-console
  console.warn.mockRestore();
});

beforeEach(() => {
  // Reset mock functions before each test
  mockNavigate = jest.fn();
  mockGetProjectDetailsFromInvite = jest.fn(() => 
    Promise.resolve({
      data: {
        project: {
          projectName: 'Test Project',
          projectDescription: 'This is a test project description',
          invitedBy: 'test@example.com'
        }
      }
    })
  );
  mockJoinProjectViaInvite = jest.fn(() => 
    Promise.resolve({
      data: {
        project: {
          projectId: 'test-project-id'
        }
      }
    })
  );
  mockToastSuccess = jest.fn();
  mockToastError = jest.fn();
});

describe('ProjectJoin Component', () => {
  test('renders loading state initially', () => {
    render(
      <MemoryRouter>
        <ProjectJoin />
      </MemoryRouter>
    );
    
    expect(screen.getByText('Loading project details...')).toBeInTheDocument();
  });

  test('renders project details after successful fetch', async () => {
    render(
      <MemoryRouter>
        <ProjectJoin />
      </MemoryRouter>
    );
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText('Loading project details...')).not.toBeInTheDocument();
    });
    
    // Check that project details are displayed
    expect(screen.getByText('Project Invitation')).toBeInTheDocument();
    expect(screen.getByText('You\'ve been invited to join:')).toBeInTheDocument();
    expect(screen.getByText('Test Project')).toBeInTheDocument();
    expect(screen.getByText('This is a test project description')).toBeInTheDocument();
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /join project/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /back to dashboard/i })).toBeInTheDocument();
    
    // Verify API was called with correct token
    expect(mockGetProjectDetailsFromInvite).toHaveBeenCalledWith('test-invite-token');
  });

  test('handles successful project join', async () => {
    render(
      <MemoryRouter>
        <ProjectJoin />
      </MemoryRouter>
    );
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText('Loading project details...')).not.toBeInTheDocument();
    });
    
    // Click join project button
    const joinButton = screen.getByRole('button', { name: /join project/i });
    fireEvent.click(joinButton);
    
    // Check that button shows loading state
    expect(screen.getByText('Joining...')).toBeInTheDocument();
    expect(joinButton).toBeDisabled();
    
    // Wait for join operation to complete
    await waitFor(() => {
      expect(mockJoinProjectViaInvite).toHaveBeenCalledWith('test-invite-token');
    });
    
    await waitFor(() => {
      expect(mockToastSuccess).toHaveBeenCalledWith('Successfully joined the project!');
    });
    
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/project/test-project-id');
    });
  });

  test('handles invalid/expired invite link error', async () => {
    mockGetProjectDetailsFromInvite = jest.fn(() => 
      Promise.reject({
        response: { status: 404 }
      })
    );
    
    render(
      <MemoryRouter>
        <ProjectJoin />
      </MemoryRouter>
    );
    
    await waitFor(() => {
      expect(screen.getByText('Error')).toBeInTheDocument();
    });
    
    expect(screen.getByText('Invalid or expired invite link.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /back to dashboard/i })).toBeInTheDocument();
  });

  test('handles authentication error when fetching project details', async () => {
    mockGetProjectDetailsFromInvite = jest.fn(() => 
      Promise.reject({
        response: { status: 401 }
      })
    );
    
    render(
      <MemoryRouter>
        <ProjectJoin />
      </MemoryRouter>
    );
    
    await waitFor(() => {
      expect(screen.getByText('Error')).toBeInTheDocument();
    });
    
    expect(screen.getByText('You need to be logged in to join a project.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /back to login/i })).toBeInTheDocument();
  });

  test('handles general error when fetching project details', async () => {
    mockGetProjectDetailsFromInvite = jest.fn(() => 
      Promise.reject({
        response: { status: 500 }
      })
    );
    
    render(
      <MemoryRouter>
        <ProjectJoin />
      </MemoryRouter>
    );
    
    await waitFor(() => {
      expect(screen.getByText('Error')).toBeInTheDocument();
    });
    
    expect(screen.getByText('Failed to load project details. Please try again.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /back to dashboard/i })).toBeInTheDocument();
  });

  test('handles join project error - invalid/expired link', async () => {
    mockJoinProjectViaInvite = jest.fn(() => 
      Promise.reject({
        response: { status: 404 }
      })
    );
    
    render(
      <MemoryRouter>
        <ProjectJoin />
      </MemoryRouter>
    );
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText('Loading project details...')).not.toBeInTheDocument();
    });
    
    // Click join project button
    fireEvent.click(screen.getByRole('button', { name: /join project/i }));
    
    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith('Invalid or expired invite link.');
    });
  });

  test('handles join project error - already a member', async () => {
    mockJoinProjectViaInvite = jest.fn(() => 
      Promise.reject({
        response: { status: 409 }
      })
    );
    
    render(
      <MemoryRouter>
        <ProjectJoin />
      </MemoryRouter>
    );
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText('Loading project details...')).not.toBeInTheDocument();
    });
    
    // Click join project button
    fireEvent.click(screen.getByRole('button', { name: /join project/i }));
    
    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith('You are already a member of this project.');
    });
    
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });
  });

  test('handles join project error - authentication required', async () => {
    mockJoinProjectViaInvite = jest.fn(() => 
      Promise.reject({
        response: { status: 401 }
      })
    );
    
    render(
      <MemoryRouter>
        <ProjectJoin />
      </MemoryRouter>
    );
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText('Loading project details...')).not.toBeInTheDocument();
    });
    
    // Click join project button
    fireEvent.click(screen.getByRole('button', { name: /join project/i }));
    
    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith('You need to be logged in to join a project.');
    });
    
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/login');
    });
  });

  test('handles join project general error', async () => {
    mockJoinProjectViaInvite = jest.fn(() => 
      Promise.reject({
        response: { status: 500 }
      })
    );
    
    render(
      <MemoryRouter>
        <ProjectJoin />
      </MemoryRouter>
    );
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText('Loading project details...')).not.toBeInTheDocument();
    });
    
    // Click join project button
    fireEvent.click(screen.getByRole('button', { name: /join project/i }));
    
    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith('Failed to join project. Please try again.');
    });
  });

  test('navigates to dashboard when back to dashboard button is clicked from error state', async () => {
    mockGetProjectDetailsFromInvite = jest.fn(() => 
      Promise.reject({
        response: { status: 500 }
      })
    );
    
    render(
      <MemoryRouter>
        <ProjectJoin />
      </MemoryRouter>
    );
    
    await waitFor(() => {
      expect(screen.getByText('Failed to load project details. Please try again.')).toBeInTheDocument();
    });
    
    fireEvent.click(screen.getByRole('button', { name: /back to dashboard/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
  });

  test('navigates to login when back to login button is clicked from auth error state', async () => {
    mockGetProjectDetailsFromInvite = jest.fn(() => 
      Promise.reject({
        response: { status: 401 }
      })
    );
    
    render(
      <MemoryRouter>
        <ProjectJoin />
      </MemoryRouter>
    );
    
    await waitFor(() => {
      expect(screen.getByText('You need to be logged in to join a project.')).toBeInTheDocument();
    });
    
    fireEvent.click(screen.getByRole('button', { name: /back to login/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });

  test('navigates to dashboard when back to dashboard button is clicked from success state', async () => {
    render(
      <MemoryRouter>
        <ProjectJoin />
      </MemoryRouter>
    );
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText('Loading project details...')).not.toBeInTheDocument();
    });
    
    fireEvent.click(screen.getByRole('button', { name: /back to dashboard/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
  });

  test('disables buttons during join operation', async () => {
    render(
      <MemoryRouter>
        <ProjectJoin />
      </MemoryRouter>
    );
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText('Loading project details...')).not.toBeInTheDocument();
    });
    
    const joinButton = screen.getByRole('button', { name: /join project/i });
    const backButton = screen.getByRole('button', { name: /back to dashboard/i });
    
    // Start join operation
    fireEvent.click(joinButton);
    
    // Both buttons should be disabled during join operation
    expect(joinButton).toBeDisabled();
    expect(backButton).toBeDisabled();
    
    // Wait for operation to complete
    await waitFor(() => {
      expect(mockJoinProjectViaInvite).toHaveBeenCalled();
    });
  });
});

describe('ProjectJoin Component - Edge Cases', () => {
  test('handles network error when fetching project details', async () => {
    mockGetProjectDetailsFromInvite = jest.fn(() => 
      Promise.reject(new Error('Network Error'))
    );
    
    render(
      <MemoryRouter>
        <ProjectJoin />
      </MemoryRouter>
    );
    
    await waitFor(() => {
      expect(screen.getByText('Error')).toBeInTheDocument();
    });
    
    expect(screen.getByText('Failed to load project details. Please try again.')).toBeInTheDocument();
  });

  test('handles network error when joining project', async () => {
    mockJoinProjectViaInvite = jest.fn(() => 
      Promise.reject(new Error('Network Error'))
    );
    
    render(
      <MemoryRouter>
        <ProjectJoin />
      </MemoryRouter>
    );
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText('Loading project details...')).not.toBeInTheDocument();
    });
    
    // Click join project button
    fireEvent.click(screen.getByRole('button', { name: /join project/i }));
    
    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith('Failed to join project. Please try again.');
    });
  });
});
