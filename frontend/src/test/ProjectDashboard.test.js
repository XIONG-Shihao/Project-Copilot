// src/test/ProjectDashboard.test.js
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Import the component after all mocks are set up
import ProjectDashboard from '../components/ProjectDashboard';

// Create mock functions that will be accessible in tests
let mockNavigate;
let mockGetUserProfile;
let mockGetProjectById;

// Mock modules before importing the component
jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => {
      if (!mockNavigate) mockNavigate = jest.fn();
      return mockNavigate;
    },
    useParams: () => ({ projectId: 'test-project-id' }),
  };
});

jest.mock('../services/auth.service', () => ({
  getUserProfile: (...args) => {
    if (!mockGetUserProfile) mockGetUserProfile = jest.fn(() => Promise.resolve({ 
      data: { 
        user: { 
          _id: 'user1', 
          name: 'John Doe', 
          email: 'john@example.com' 
        } 
      } 
    }));
    return mockGetUserProfile(...args);
  }
}));

jest.mock('../services/project.service', () => ({
  getProjectById: (...args) => {
    if (!mockGetProjectById) mockGetProjectById = jest.fn(() => Promise.resolve({ 
      data: {
        _id: 'test-project-id',
        projectName: 'Test Project',
        projectDescription: 'A test project description',
        members: [
          {
            user: { _id: 'user1', name: 'John Doe' },
            role: { roleName: 'administrator' }
          },
          {
            user: { _id: 'user2', name: 'Jane Smith' },
            role: { roleName: 'developer' }
          }
        ],
        tasks: [
          { _id: 'task1', taskProgress: 'Completed' },
          { _id: 'task2', taskProgress: 'In Progress' },
          { _id: 'task3', taskProgress: 'To Do' }
        ],
        settings: {
          joinByLinkEnabled: true,
          pdfGenerationEnabled: true
        },
        projectOwner: 'user1',
        createdAt: '2024-01-01T00:00:00.000Z'
      }
    }));
    return mockGetProjectById(...args);
  },
  generateInviteLink: jest.fn(() => Promise.resolve({ data: { inviteLink: { token: 'test-token' } } })),
  assignRole: jest.fn(() => Promise.resolve()),
  removeMember: jest.fn(() => Promise.resolve()),
  exportProjectSummary: jest.fn(() => Promise.resolve({ data: 'pdf-data' }))
}));

jest.mock('react-toastify', () => {
  return {
    toast: {
      success: jest.fn(),
      error: jest.fn(),
    }
  };
});

// Mock Chart.js components
jest.mock('react-chartjs-2', () => ({
  Doughnut: ({ data }) => (
    <div data-testid="doughnut-chart">
      <div>Chart Data: {JSON.stringify(data.datasets[0].data)}</div>
    </div>
  )
}));

jest.mock('chart.js', () => ({
  Chart: {
    register: jest.fn(),
  },
  ArcElement: jest.fn(),
  Tooltip: jest.fn(),
  Legend: jest.fn(),
}));

// Mock child components
jest.mock('../components/AppNavbar', () => {
  return function MockAppNavbar({ showDashboardLink }) {
    return <div data-testid="app-navbar">Mock AppNavbar (showDashboardLink: {showDashboardLink?.toString()})</div>;
  };
});

jest.mock('../components/TasksSection', () => {
  return function MockTasksSection({ project }) {
    return <div data-testid="tasks-section">Mock TasksSection (Project: {project?.projectName})</div>;
  };
});

jest.mock('../components/ProjectNavbar', () => {
  return function MockProjectNavbar({ onSectionChange }) {
    return (
      <div data-testid="project-navbar">
        <button onClick={() => onSectionChange('overview')}>Overview</button>
        <button onClick={() => onSectionChange('tasks')}>Tasks</button>
        <button onClick={() => onSectionChange('members')}>Members</button>
      </div>
    );
  };
});

jest.mock('../components/MembersSection', () => {
  return function MockMembersSection() {
    return <div data-testid="members-section">Mock MembersSection</div>;
  };
});

jest.mock('../components/TasksDashboardSection', () => {
  return function MockTasksDashboardSection() {
    return <div data-testid="tasks-dashboard-section">Mock TasksDashboardSection</div>;
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
        _id: 'user1', 
        name: 'John Doe', 
        email: 'john@example.com' 
      } 
    } 
  }));
  mockGetProjectById = jest.fn(() => Promise.resolve({ 
    data: {
      _id: 'test-project-id',
      projectName: 'Test Project',
      projectDescription: 'A test project description',
      members: [
        {
          user: { _id: 'user1', name: 'John Doe' },
          role: { roleName: 'administrator' }
        },
        {
          user: { _id: 'user2', name: 'Jane Smith' },
          role: { roleName: 'developer' }
        }
      ],
      tasks: [
        { _id: 'task1', taskProgress: 'Completed' },
        { _id: 'task2', taskProgress: 'In Progress' },
        { _id: 'task3', taskProgress: 'To Do' }
      ],
      settings: {
        joinByLinkEnabled: true,
        pdfGenerationEnabled: true
      },
      projectOwner: 'user1',
      createdAt: '2024-01-01T00:00:00.000Z'
    }
  }));
});

test('renders ProjectDashboard with loading spinner initially', () => {
  render(
    <MemoryRouter>
      <ProjectDashboard />
    </MemoryRouter>
  );
  
  expect(screen.getByText('Loading...')).toBeInTheDocument();
});

test('renders project dashboard overview section after loading', async () => {
  render(
    <MemoryRouter>
      <ProjectDashboard />
    </MemoryRouter>
  );
  
  // Wait for project to load
  await waitFor(() => {
    expect(mockGetProjectById).toHaveBeenCalledWith('test-project-id');
  });
  
  await waitFor(() => {
    expect(mockGetUserProfile).toHaveBeenCalled();
  });
  
  await waitFor(() => {
    expect(screen.getByText('Test Project')).toBeInTheDocument();
  });
  
  await waitFor(() => {
    expect(screen.getByText('A test project description')).toBeInTheDocument();
  });
  
  await waitFor(() => {
    expect(screen.getByText('2 members')).toBeInTheDocument();
  });
});

test('displays project members in overview section', async () => {
  render(
    <MemoryRouter>
      <ProjectDashboard />
    </MemoryRouter>
  );
  
  await waitFor(() => {
    expect(screen.getByText('Project Members')).toBeInTheDocument();
  });
  
  await waitFor(() => {
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });
  
  await waitFor(() => {
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
  });
  
  await waitFor(() => {
    expect(screen.getByText('Administrators')).toBeInTheDocument();
  });
  
  await waitFor(() => {
    expect(screen.getByText('Developers')).toBeInTheDocument();
  });
});

test('displays project completion chart', async () => {
  render(
    <MemoryRouter>
      <ProjectDashboard />
    </MemoryRouter>
  );
  
  await waitFor(() => {
    expect(screen.getByText('Project Completion')).toBeInTheDocument();
  });
  
  await waitFor(() => {
    expect(screen.getByTestId('doughnut-chart')).toBeInTheDocument();
  });
  
  await waitFor(() => {
    expect(screen.getByText('33%')).toBeInTheDocument(); // 1 completed out of 3 tasks
  });
  
  await waitFor(() => {
    expect(screen.getByText('Overall Progress')).toBeInTheDocument();
  });
});

test('shows invite link button for project managers', async () => {
  render(
    <MemoryRouter>
      <ProjectDashboard />
    </MemoryRouter>
  );
  
  await waitFor(() => {
    expect(screen.getByText('+ Invite Link')).toBeInTheDocument();
  });
});

test('displays tasks section in overview', async () => {
  render(
    <MemoryRouter>
      <ProjectDashboard />
    </MemoryRouter>
  );
  
  await waitFor(() => {
    expect(screen.getByTestId('tasks-section')).toBeInTheDocument();
  });
});

test('navigates back to dashboard when back button is clicked', async () => {
  render(
    <MemoryRouter>
      <ProjectDashboard />
    </MemoryRouter>
  );
  
  await waitFor(() => {
    expect(screen.getByText('← Back to Dashboard')).toBeInTheDocument();
  });
  
  const backButton = screen.getByText('← Back to Dashboard');
  fireEvent.click(backButton);
  
  expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
});

test('shows download project summary button', async () => {
  render(
    <MemoryRouter>
      <ProjectDashboard />
    </MemoryRouter>
  );
  
  await waitFor(() => {
    expect(screen.getByText('📄 Download Project Summary')).toBeInTheDocument();
  });
});

test('handles 404 error when project not found', async () => {
  mockGetProjectById.mockRejectedValue({
    response: { status: 404, data: { message: 'Project not found' } }
  });
  
  const { toast } = require('react-toastify');
  
  render(
    <MemoryRouter>
      <ProjectDashboard />
    </MemoryRouter>
  );
  
  await waitFor(() => {
    expect(toast.error).toHaveBeenCalledWith('Project not found.', expect.any(Object));
  });
});

test('handles 401 error and redirects to login', async () => {
  mockGetProjectById.mockRejectedValue({
    response: { status: 401 }
  });
  
  render(
    <MemoryRouter>
      <ProjectDashboard />
    </MemoryRouter>
  );
  
  await waitFor(() => {
    expect(mockNavigate).toHaveBeenCalledWith('/login', { state: { sessionExpired: true } });
  });
});

test('switches between different sections using project navbar', async () => {
  render(
    <MemoryRouter>
      <ProjectDashboard />
    </MemoryRouter>
  );
  
  await waitFor(() => {
    expect(screen.getByTestId('project-navbar')).toBeInTheDocument();
  });
  
  // Click on Tasks section
  fireEvent.click(screen.getByText('Tasks'));
  
  await waitFor(() => {
    expect(screen.getByTestId('tasks-dashboard-section')).toBeInTheDocument();
  });
  
  // Click back to Overview section
  fireEvent.click(screen.getByText('Overview'));
  
  await waitFor(() => {
    expect(screen.getByTestId('tasks-section')).toBeInTheDocument();
  });
});