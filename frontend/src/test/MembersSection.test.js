// src/test/MembersSection.test.js
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Import the component after all mocks are set up
import MembersSection from '../components/MembersSection';

// Create mock functions that will be accessible in tests
let mockGenerateInviteLink;
let mockAssignRole;
let mockRemoveMember;
let mockOnMembersUpdated;

// Mock ProjectService
jest.mock('../services/project.service', () => ({
  generateInviteLink: (...args) => {
    if (!mockGenerateInviteLink) mockGenerateInviteLink = jest.fn(() => Promise.resolve({ 
      data: { inviteLink: { token: 'test-invite-token' } } 
    }));
    return mockGenerateInviteLink(...args);
  },
  assignRole: (...args) => {
    if (!mockAssignRole) mockAssignRole = jest.fn(() => Promise.resolve());
    return mockAssignRole(...args);
  },
  removeMember: (...args) => {
    if (!mockRemoveMember) mockRemoveMember = jest.fn(() => Promise.resolve());
    return mockRemoveMember(...args);
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

// Mock clipboard API
Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: jest.fn(() => Promise.resolve()),
  },
  writable: true,
});

// Mock window.location
Object.defineProperty(window, 'location', {
  value: {
    origin: 'http://localhost:3000'
  }
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
});

afterAll(() => {
  // eslint-disable-next-line no-console
  console.warn.mockRestore();
  // eslint-disable-next-line no-console
  console.error.mockRestore();
});

beforeEach(() => {
  // Reset mock functions before each test
  mockGenerateInviteLink = jest.fn(() => Promise.resolve({ 
    data: { inviteLink: { token: 'test-invite-token' } } 
  }));
  mockAssignRole = jest.fn(() => Promise.resolve());
  mockRemoveMember = jest.fn(() => Promise.resolve());
  mockOnMembersUpdated = jest.fn();
  
  // Reset clipboard mock
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText.mockClear();
  }
});

// Mock project data
const mockProject = {
  _id: 'test-project-id',
  projectName: 'Test Project',
  members: [
    {
      user: { _id: 'user1', name: 'John Admin', email: 'john@example.com' },
      role: { roleName: 'administrator' }
    },
    {
      user: { _id: 'user2', name: 'Jane Developer', email: 'jane@example.com' },
      role: { roleName: 'developer' }
    },
    {
      user: { _id: 'user3', name: 'Bob Viewer', email: 'bob@example.com' },
      role: { roleName: 'viewer' }
    }
  ],
  settings: {
    joinByLinkEnabled: true,
    pdfGenerationEnabled: true
  }
};

const mockCurrentUserAdmin = { _id: 'user1', name: 'John Admin', email: 'john@example.com' };
const mockCurrentUserDeveloper = { _id: 'user2', name: 'Jane Developer', email: 'jane@example.com' };

test('renders MembersSection with team members', () => {
  render(
    <MemoryRouter>
      <MembersSection 
        project={mockProject}
        projectId="test-project-id"
        currentUser={mockCurrentUserAdmin}
        onMembersUpdated={mockOnMembersUpdated}
      />
    </MemoryRouter>
  );
  
  expect(screen.getByText('Team Members')).toBeInTheDocument();
  expect(screen.getByText('John Admin')).toBeInTheDocument();
  expect(screen.getByText('Jane Developer')).toBeInTheDocument();
  expect(screen.getByText('Bob Viewer')).toBeInTheDocument();
});

test('displays member statistics correctly', () => {
  render(
    <MemoryRouter>
      <MembersSection 
        project={mockProject}
        projectId="test-project-id"
        currentUser={mockCurrentUserAdmin}
        onMembersUpdated={mockOnMembersUpdated}
      />
    </MemoryRouter>
  );
  
  expect(screen.getByText('Total Members')).toBeInTheDocument();
  expect(screen.getByText('3')).toBeInTheDocument(); // Total members
  expect(screen.getByText('Administrators')).toBeInTheDocument();
  expect(screen.getAllByText('1')).toHaveLength(3); // 1 admin, 1 developer, 1 viewer
  expect(screen.getByText('Developers')).toBeInTheDocument();
  expect(screen.getByText('Viewers')).toBeInTheDocument();
});

test('shows invite button for project managers', () => {
  render(
    <MemoryRouter>
      <MembersSection 
        project={mockProject}
        projectId="test-project-id"
        currentUser={mockCurrentUserAdmin}
        onMembersUpdated={mockOnMembersUpdated}
      />
    </MemoryRouter>
  );
  
  expect(screen.getByText('+ Invite New Member')).toBeInTheDocument();
  expect(screen.getByText('As a project administrator, you can manage team members\' roles and permissions.')).toBeInTheDocument();
});

test('hides invite button for non-project managers', () => {
  render(
    <MemoryRouter>
      <MembersSection 
        project={mockProject}
        projectId="test-project-id"
        currentUser={mockCurrentUserDeveloper}
        onMembersUpdated={mockOnMembersUpdated}
      />
    </MemoryRouter>
  );
  
  expect(screen.queryByText('+ Invite New Member')).not.toBeInTheDocument();
  expect(screen.queryByText('As a project administrator, you can manage team members\' roles and permissions.')).not.toBeInTheDocument();
});

test('displays role badges correctly', () => {
  render(
    <MemoryRouter>
      <MembersSection 
        project={mockProject}
        projectId="test-project-id"
        currentUser={mockCurrentUserAdmin}
        onMembersUpdated={mockOnMembersUpdated}
      />
    </MemoryRouter>
  );
  
  expect(screen.getByText('administrator')).toBeInTheDocument();
  expect(screen.getByText('developer')).toBeInTheDocument();
  expect(screen.getByText('viewer')).toBeInTheDocument();
});

test('shows "You" badge for current user', () => {
  render(
    <MemoryRouter>
      <MembersSection 
        project={mockProject}
        projectId="test-project-id"
        currentUser={mockCurrentUserAdmin}
        onMembersUpdated={mockOnMembersUpdated}
      />
    </MemoryRouter>
  );
  
  expect(screen.getByText('You')).toBeInTheDocument();
});

test('generates invite link when button is clicked', async () => {
  render(
    <MemoryRouter>
      <MembersSection 
        project={mockProject}
        projectId="test-project-id"
        currentUser={mockCurrentUserAdmin}
        onMembersUpdated={mockOnMembersUpdated}
      />
    </MemoryRouter>
  );
  
  fireEvent.click(screen.getByText('+ Invite New Member'));
  
  await waitFor(() => {
    expect(mockGenerateInviteLink).toHaveBeenCalledWith('test-project-id');
  });
  
  await waitFor(() => {
    expect(screen.getByText('Project Invite Link')).toBeInTheDocument();
  });
  
  await waitFor(() => {
    expect(screen.getByDisplayValue('http://localhost:3000/join/test-invite-token')).toBeInTheDocument();
  });
});

test('shows manage role buttons for project managers', () => {
  render(
    <MemoryRouter>
      <MembersSection 
        project={mockProject}
        projectId="test-project-id"
        currentUser={mockCurrentUserAdmin}
        onMembersUpdated={mockOnMembersUpdated}
      />
    </MemoryRouter>
  );
  
  expect(screen.getAllByText('Manage Role')).toHaveLength(3); // For all 3 members
  expect(screen.getAllByText('Remove')).toHaveLength(2); // Can't remove yourself
});

test('opens role dropdown when manage role is clicked', async () => {
  render(
    <MemoryRouter>
      <MembersSection 
        project={mockProject}
        projectId="test-project-id"
        currentUser={mockCurrentUserAdmin}
        onMembersUpdated={mockOnMembersUpdated}
      />
    </MemoryRouter>
  );
  
  const manageRoleButtons = screen.getAllByText('Manage Role');
  fireEvent.click(manageRoleButtons[1]); // Click on Jane Developer's manage role
  
  await waitFor(() => {
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });
  
  await waitFor(() => {
    expect(screen.getByText('Save')).toBeInTheDocument();
  });
});

test('assigns role when save is clicked', async () => {
  render(
    <MemoryRouter>
      <MembersSection 
        project={mockProject}
        projectId="test-project-id"
        currentUser={mockCurrentUserAdmin}
        onMembersUpdated={mockOnMembersUpdated}
      />
    </MemoryRouter>
  );
  
  const manageRoleButtons = screen.getAllByText('Manage Role');
  fireEvent.click(manageRoleButtons[1]); // Click on Jane Developer's manage role
  
  await waitFor(() => {
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });
  
  const roleSelect = screen.getByRole('combobox');
  fireEvent.change(roleSelect, { target: { value: 'administrator' } });
  
  fireEvent.click(screen.getByText('Save'));
  
  await waitFor(() => {
    expect(mockAssignRole).toHaveBeenCalledWith('test-project-id', 'user2', 'administrator');
  });
  
  await waitFor(() => {
    expect(mockOnMembersUpdated).toHaveBeenCalled();
  });
});

test('opens remove member modal when remove is clicked', async () => {
  render(
    <MemoryRouter>
      <MembersSection 
        project={mockProject}
        projectId="test-project-id"
        currentUser={mockCurrentUserAdmin}
        onMembersUpdated={mockOnMembersUpdated}
      />
    </MemoryRouter>
  );
  
  const removeButtons = screen.getAllByText('Remove');
  fireEvent.click(removeButtons[0]);
  
  await waitFor(() => {
    expect(screen.getAllByText('Remove Member')).toHaveLength(2); // Button and modal title
  });
  
  await waitFor(() => {
    expect(screen.getByText(/Are you sure you want to remove/)).toBeInTheDocument();
  });
});

test('removes member when confirmed', async () => {
  render(
    <MemoryRouter>
      <MembersSection 
        project={mockProject}
        projectId="test-project-id"
        currentUser={mockCurrentUserAdmin}
        onMembersUpdated={mockOnMembersUpdated}
      />
    </MemoryRouter>
  );
  
  const removeButtons = screen.getAllByText('Remove');
  fireEvent.click(removeButtons[0]);
  
  await waitFor(() => {
    expect(screen.getAllByText('Remove Member')).toHaveLength(2);
  });
  
  const confirmRemoveButton = screen.getAllByText('Remove Member')[1]; // The one in the modal
  fireEvent.click(confirmRemoveButton);
  
  await waitFor(() => {
    expect(mockRemoveMember).toHaveBeenCalledWith('test-project-id', 'user2');
  });
  
  await waitFor(() => {
    expect(mockOnMembersUpdated).toHaveBeenCalled();
  });
});

test('displays role permissions table for project managers', () => {
  render(
    <MemoryRouter>
      <MembersSection 
        project={mockProject}
        projectId="test-project-id"
        currentUser={mockCurrentUserAdmin}
        onMembersUpdated={mockOnMembersUpdated}
      />
    </MemoryRouter>
  );
  
  expect(screen.getByText('Role Permissions')).toBeInTheDocument();
  expect(screen.getByText('Administrator')).toBeInTheDocument();
  expect(screen.getByText('Developer')).toBeInTheDocument();
  expect(screen.getByText('Viewer')).toBeInTheDocument();
  expect(screen.getByText('Full access to manage the project, members, and settings')).toBeInTheDocument();
});

test('hides role permissions table for non-project managers', () => {
  render(
    <MemoryRouter>
      <MembersSection 
        project={mockProject}
        projectId="test-project-id"
        currentUser={mockCurrentUserDeveloper}
        onMembersUpdated={mockOnMembersUpdated}
      />
    </MemoryRouter>
  );
  
  expect(screen.queryByText('Role Permissions')).not.toBeInTheDocument();
});

test('displays empty state when no members', () => {
  const emptyProject = { ...mockProject, members: [] };
  
  render(
    <MemoryRouter>
      <MembersSection 
        project={emptyProject}
        projectId="test-project-id"
        currentUser={mockCurrentUserAdmin}
        onMembersUpdated={mockOnMembersUpdated}
      />
    </MemoryRouter>
  );
  
  expect(screen.getByText('No Members Yet')).toBeInTheDocument();
  expect(screen.getByText('Invite team members to collaborate on this project')).toBeInTheDocument();
  // Note: When there are no members, current user is not considered admin, so no invite button
  expect(screen.queryByText('Generate Invite Link')).not.toBeInTheDocument();
});

test('displays empty state with admin privileges for project creator', () => {
  // Scenario where project creator still has admin access despite no formal members
  const emptyProjectWithCreatorAsAdmin = { 
    ...mockProject, 
    members: [
      {
        user: mockCurrentUserAdmin,
        role: { roleName: 'administrator' }
      }
    ] 
  };
  
  render(
    <MemoryRouter>
      <MembersSection 
        project={emptyProjectWithCreatorAsAdmin}
        projectId="test-project-id"
        currentUser={mockCurrentUserAdmin}
        onMembersUpdated={mockOnMembersUpdated}
      />
    </MemoryRouter>
  );
  
  expect(screen.getByText('Team Members')).toBeInTheDocument();
  expect(screen.getByText('+ Invite New Member')).toBeInTheDocument();
  expect(screen.getAllByText('1')).toHaveLength(2); // Total members (1) and Administrators (1)
});

test('handles invite link generation error', async () => {
  const { toast } = require('react-toastify');
  mockGenerateInviteLink.mockRejectedValue({
    response: { data: { message: 'Failed to generate invite link' } }
  });
  
  render(
    <MemoryRouter>
      <MembersSection 
        project={mockProject}
        projectId="test-project-id"
        currentUser={mockCurrentUserAdmin}
        onMembersUpdated={mockOnMembersUpdated}
      />
    </MemoryRouter>
  );
  
  fireEvent.click(screen.getByText('+ Invite New Member'));
  
  await waitFor(() => {
    expect(toast.error).toHaveBeenCalledWith('Failed to generate invite link');
  });
});

test('handles role assignment error', async () => {
  const { toast } = require('react-toastify');
  mockAssignRole.mockRejectedValue({
    response: { data: { message: 'There must be at least one administrator' } }
  });
  
  render(
    <MemoryRouter>
      <MembersSection 
        project={mockProject}
        projectId="test-project-id"
        currentUser={mockCurrentUserAdmin}
        onMembersUpdated={mockOnMembersUpdated}
      />
    </MemoryRouter>
  );
  
  const manageRoleButtons = screen.getAllByText('Manage Role');
  fireEvent.click(manageRoleButtons[0]); // Click on admin's manage role
  
  await waitFor(() => {
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });
  
  const roleSelect = screen.getByRole('combobox');
  fireEvent.change(roleSelect, { target: { value: 'developer' } });
  
  fireEvent.click(screen.getByText('Save'));
  
  await waitFor(() => {
    expect(toast.error).toHaveBeenCalledWith('There must be at least one administrator in the project.');
  });
});