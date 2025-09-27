import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { toast } from 'react-toastify';
import Dashboard from '../components/Dashboard';
import AuthService from '../services/auth.service';
import ProjectService from '../services/project.service';

// Mock the services
jest.mock('../services/auth.service');
jest.mock('../services/project.service');
jest.mock('react-toastify', () => ({
  toast: {
    warning: jest.fn(),
    promise: jest.fn(),
  },
}));

// Mock navigation
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

// Mock AppNavbar component
jest.mock('../components/AppNavbar', () => {
  return function MockAppNavbar() {
    return <nav data-testid="app-navbar">Navigation Bar</nav>;
  };
});

// Wrapper component for testing
const renderWithRouter = (component) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

describe('Dashboard Component', () => {
  const mockUser = {
    id: '1',
    name: 'Test User',
    email: 'test@example.com',
    userProjects: [
      {
        _id: 'project1',
        projectName: 'Test Project 1',
        projectDescription: 'First test project',
        projectMembers: [{ id: '1', name: 'Test User' }],
      },
      {
        _id: 'project2',
        projectName: 'Test Project 2',
        projectDescription: 'Second test project',
        projectMembers: [{ id: '1', name: 'Test User' }, { id: '2', name: 'User 2' }],
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    AuthService.getUserProfile.mockResolvedValue({
      data: { user: mockUser },
    });
  });

  test('renders loading state initially', () => {
    renderWithRouter(<Dashboard />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  test('renders dashboard with user data after loading', async () => {
    renderWithRouter(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText('Welcome, Test User! 👋')).toBeInTheDocument();
    });

    expect(screen.getByText('Your Projects')).toBeInTheDocument();
    expect(screen.getByText('Test Project 1')).toBeInTheDocument();
    expect(screen.getByText('Test Project 2')).toBeInTheDocument();
  });

  test('displays no projects message when user has no projects', async () => {
    const userWithNoProjects = { ...mockUser, userProjects: [] };
    AuthService.getUserProfile.mockResolvedValue({
      data: { user: userWithNoProjects },
    });

    renderWithRouter(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText('No projects yet')).toBeInTheDocument();
    });

    expect(screen.getByText('Create your first project to get started')).toBeInTheDocument();
  });

  test('shows create project modal when create button is clicked', async () => {
    renderWithRouter(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText('Welcome, Test User! 👋')).toBeInTheDocument();
    });

    const createButton = screen.getByText('+ Create New Project');
    fireEvent.click(createButton);

    expect(screen.getByText('Create New Project')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter project name')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter project description')).toBeInTheDocument();
  });

  test('validates empty fields when creating project', async () => {
    renderWithRouter(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText('Welcome, Test User! 👋')).toBeInTheDocument();
    });

    // Open modal
    const createButton = screen.getByText('+ Create New Project');
    fireEvent.click(createButton);

    // Try to create without filling fields
    const createProjectButton = screen.getByRole('button', { name: 'Create Project' });
    fireEvent.click(createProjectButton);

    expect(toast.warning).toHaveBeenCalledWith(
      'Please fill in both project name and description.',
      { autoClose: 3000 }
    );
  });

  test('creates project successfully with valid data', async () => {
    ProjectService.createProject.mockResolvedValue({});
    toast.promise.mockResolvedValue({});

    renderWithRouter(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText('Welcome, Test User! 👋')).toBeInTheDocument();
    });

    // Open modal
    const createButton = screen.getByText('+ Create New Project');
    fireEvent.click(createButton);

    // Fill in form
    const nameInput = screen.getByPlaceholderText('Enter project name');
    const descInput = screen.getByPlaceholderText('Enter project description');
    
    fireEvent.change(nameInput, { target: { value: 'New Test Project' } });
    fireEvent.change(descInput, { target: { value: 'New project description' } });

    // Submit form
    const createProjectButton = screen.getByRole('button', { name: 'Create Project' });
    fireEvent.click(createProjectButton);

    expect(toast.promise).toHaveBeenCalled();
    expect(ProjectService.createProject).toHaveBeenCalledWith('New Test Project', 'New project description');
  });

  test('closes modal when cancel button is clicked', async () => {
    renderWithRouter(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText('Welcome, Test User! 👋')).toBeInTheDocument();
    });

    // Open modal
    const createButton = screen.getByText('+ Create New Project');
    fireEvent.click(createButton);

    expect(screen.getByText('Create New Project')).toBeInTheDocument();

    // Close modal
    const cancelButton = screen.getByRole('button', { name: 'Cancel' });
    fireEvent.click(cancelButton);

    await waitFor(() => {
      expect(screen.queryByText('Create New Project')).not.toBeInTheDocument();
    });
  });

  test('navigates to project when View Project button is clicked', async () => {
    renderWithRouter(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText('Welcome, Test User! 👋')).toBeInTheDocument();
    });

    const viewProjectButtons = screen.getAllByText('View Project');
    fireEvent.click(viewProjectButtons[0]);

    expect(mockNavigate).toHaveBeenCalledWith('/project/project1');
  });

  test('displays correct member count for projects', async () => {
    renderWithRouter(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText('Welcome, Test User! 👋')).toBeInTheDocument();
    });

    expect(screen.getByText('1 members')).toBeInTheDocument();
    expect(screen.getByText('2 members')).toBeInTheDocument();
  });

  test('redirects to login on error', async () => {
    AuthService.getUserProfile.mockRejectedValue({
      response: { status: 401 },
    });

    renderWithRouter(<Dashboard />);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/login', { state: { sessionExpired: true } });
    });
  });
});
