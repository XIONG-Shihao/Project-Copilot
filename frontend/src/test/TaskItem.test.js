import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Import the component after all mocks are set up
import TaskItem from '../components/TaskItem';

// Create mock functions that will be accessible in tests
let mockAssignTask;
let mockDeleteTask;
let mockOnTaskUpdated;
let mockOnEditTask;
let mockCanEditTask;

// Mock ProjectService
jest.mock('../services/project.service', () => ({
  assignTask: (...args) => {
    if (!mockAssignTask) mockAssignTask = jest.fn(() => Promise.resolve());
    return mockAssignTask(...args);
  },
  deleteTask: (...args) => {
    if (!mockDeleteTask) mockDeleteTask = jest.fn(() => Promise.resolve());
    return mockDeleteTask(...args);
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

// Mock window.confirm
Object.defineProperty(window, 'confirm', {
  value: jest.fn(() => true),
  writable: true,
});

// Silence all warnings in this file
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
  mockAssignTask = jest.fn(() => Promise.resolve());
  mockDeleteTask = jest.fn(() => Promise.resolve());
  mockOnTaskUpdated = jest.fn();
  mockOnEditTask = jest.fn();
  mockCanEditTask = jest.fn(() => true);
  window.confirm.mockReturnValue(true);
});

// Mock data
const mockProject = {
  _id: 'test-project-id',
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
  ]
};

const mockTaskAssigned = {
  _id: 'task1',
  taskName: 'Assigned Task',
  taskDescription: 'Task with assignee',
  taskDeadline: '2025-08-15T00:00:00.000Z',
  taskProgress: 'To Do',
  taskAssignee: {
    _id: 'user1',
    name: 'John Admin',
    email: 'john@example.com'
  }
};

const mockTaskUnassigned = {
  _id: 'task2',
  taskName: 'Unassigned Task',
  taskDescription: 'Task without assignee',
  taskDeadline: '2025-08-20T00:00:00.000Z',
  taskProgress: 'In Progress',
  taskAssignee: null
};

const mockTaskOverdue = {
  _id: 'task3',
  taskName: 'Overdue Task',
  taskDescription: 'Task past deadline',
  taskDeadline: '2025-08-01T00:00:00.000Z', // Past date
  taskProgress: 'To Do',
  taskAssignee: null
};

const mockTaskCompleted = {
  _id: 'task4',
  taskName: 'Completed Task',
  taskDescription: 'Task that is done',
  taskDeadline: '2025-08-01T00:00:00.000Z', // Past date but completed
  taskProgress: 'Completed',
  taskAssignee: {
    _id: 'user2',
    name: 'Jane Developer',
    email: 'jane@example.com'
  }
};

test('renders task item with basic information', () => {
  render(
    <MemoryRouter>
      <TaskItem
        task={mockTaskAssigned}
        project={mockProject}
        projectId="test-project-id"
        isProjectManager={true}
        onTaskUpdated={mockOnTaskUpdated}
        onEditTask={mockOnEditTask}
        canEditTask={mockCanEditTask}
      />
    </MemoryRouter>
  );

  expect(screen.getByText('Assigned Task')).toBeInTheDocument();
  expect(screen.getByText('Task with assignee')).toBeInTheDocument();
  expect(screen.getByText('To Do')).toBeInTheDocument();
  expect(screen.getByText('15/08/2025')).toBeInTheDocument(); // Formatted date
});

test('displays assigned user information', () => {
  render(
    <MemoryRouter>
      <TaskItem
        task={mockTaskAssigned}
        project={mockProject}
        projectId="test-project-id"
        isProjectManager={true}
        onTaskUpdated={mockOnTaskUpdated}
        onEditTask={mockOnEditTask}
        canEditTask={mockCanEditTask}
      />
    </MemoryRouter>
  );

  expect(screen.getByText('John Admin')).toBeInTheDocument();
  expect(screen.getByText('J')).toBeInTheDocument(); // Avatar initial
});

test('displays unassigned task correctly', () => {
  render(
    <MemoryRouter>
      <TaskItem
        task={mockTaskUnassigned}
        project={mockProject}
        projectId="test-project-id"
        isProjectManager={true}
        onTaskUpdated={mockOnTaskUpdated}
        onEditTask={mockOnEditTask}
        canEditTask={mockCanEditTask}
      />
    </MemoryRouter>
  );

  expect(screen.getByText('Unassigned')).toBeInTheDocument();
  expect(screen.getByText('?')).toBeInTheDocument(); // Unassigned avatar
});

test('shows overdue styling for past deadline tasks', () => {
  render(
    <MemoryRouter>
      <TaskItem
        task={mockTaskOverdue}
        project={mockProject}
        projectId="test-project-id"
        isProjectManager={true}
        onTaskUpdated={mockOnTaskUpdated}
        onEditTask={mockOnEditTask}
        canEditTask={mockCanEditTask}
      />
    </MemoryRouter>
  );

  const dateElement = screen.getByText('01/08/2025');
  expect(dateElement).toHaveStyle('color: rgb(220, 53, 69)'); // Red color for overdue
  expect(dateElement).toHaveStyle('font-weight: bold');
});

test('does not show overdue styling for completed tasks', () => {
  render(
    <MemoryRouter>
      <TaskItem
        task={mockTaskCompleted}
        project={mockProject}
        projectId="test-project-id"
        isProjectManager={true}
        onTaskUpdated={mockOnTaskUpdated}
        onEditTask={mockOnEditTask}
        canEditTask={mockCanEditTask}
      />
    </MemoryRouter>
  );

  const dateElement = screen.getByText('01/08/2025');
  expect(dateElement).not.toHaveStyle('color: rgb(220, 53, 69)');
  expect(dateElement).not.toHaveStyle('font-weight: bold');
});

test('shows edit and delete buttons when user can edit', () => {
  render(
    <MemoryRouter>
      <TaskItem
        task={mockTaskAssigned}
        project={mockProject}
        projectId="test-project-id"
        isProjectManager={true}
        onTaskUpdated={mockOnTaskUpdated}
        onEditTask={mockOnEditTask}
        canEditTask={mockCanEditTask}
      />
    </MemoryRouter>
  );

  expect(screen.getByText('Edit')).toBeInTheDocument();
  expect(screen.getByText('Delete')).toBeInTheDocument();
});

test('hides edit and delete buttons when user cannot edit', () => {
  mockCanEditTask.mockReturnValue(false);
  
  render(
    <MemoryRouter>
      <TaskItem
        task={mockTaskAssigned}
        project={mockProject}
        projectId="test-project-id"
        isProjectManager={false}
        onTaskUpdated={mockOnTaskUpdated}
        onEditTask={mockOnEditTask}
        canEditTask={mockCanEditTask}
      />
    </MemoryRouter>
  );

  const editButton = screen.getByText('Edit');
  const deleteButton = screen.getByText('Delete');
  
  expect(editButton).toBeDisabled();
  expect(deleteButton).toBeDisabled();
});

test('calls onEditTask when edit button is clicked', () => {
  render(
    <MemoryRouter>
      <TaskItem
        task={mockTaskAssigned}
        project={mockProject}
        projectId="test-project-id"
        isProjectManager={true}
        onTaskUpdated={mockOnTaskUpdated}
        onEditTask={mockOnEditTask}
        canEditTask={mockCanEditTask}
      />
    </MemoryRouter>
  );

  fireEvent.click(screen.getByText('Edit'));
  
  expect(mockOnEditTask).toHaveBeenCalledWith(mockTaskAssigned);
});

test('deletes task when delete button is clicked and confirmed', async () => {
  render(
    <MemoryRouter>
      <TaskItem
        task={mockTaskAssigned}
        project={mockProject}
        projectId="test-project-id"
        isProjectManager={true}
        onTaskUpdated={mockOnTaskUpdated}
        onEditTask={mockOnEditTask}
        canEditTask={mockCanEditTask}
      />
    </MemoryRouter>
  );

  fireEvent.click(screen.getByText('Delete'));
  
  expect(window.confirm).toHaveBeenCalledWith(
    'Are you sure you want to delete the task "Assigned Task"? This action cannot be undone.'
  );
  
  await waitFor(() => {
    expect(mockDeleteTask).toHaveBeenCalledWith('test-project-id', 'task1');
  });
  
  await waitFor(() => {
    expect(mockOnTaskUpdated).toHaveBeenCalled();
  });
});

test('does not delete task when confirmation is cancelled', async () => {
  window.confirm.mockReturnValue(false);
  
  render(
    <MemoryRouter>
      <TaskItem
        task={mockTaskAssigned}
        project={mockProject}
        projectId="test-project-id"
        isProjectManager={true}
        onTaskUpdated={mockOnTaskUpdated}
        onEditTask={mockOnEditTask}
        canEditTask={mockCanEditTask}
      />
    </MemoryRouter>
  );

  fireEvent.click(screen.getByText('Delete'));
  
  expect(mockDeleteTask).not.toHaveBeenCalled();
});

test('opens assignment dropdown when assignee is clicked for project manager', async () => {
  render(
    <MemoryRouter>
      <TaskItem
        task={mockTaskAssigned}
        project={mockProject}
        projectId="test-project-id"
        isProjectManager={true}
        onTaskUpdated={mockOnTaskUpdated}
        onEditTask={mockOnEditTask}
        canEditTask={mockCanEditTask}
      />
    </MemoryRouter>
  );

  fireEvent.click(screen.getByText('John Admin'));
  
  await waitFor(() => {
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });
  
  expect(screen.getByText('✓')).toBeInTheDocument();
  expect(screen.getByText('✕')).toBeInTheDocument();
});

test('shows assignable members in dropdown excluding viewers', async () => {
  render(
    <MemoryRouter>
      <TaskItem
        task={mockTaskUnassigned}
        project={mockProject}
        projectId="test-project-id"
        isProjectManager={true}
        onTaskUpdated={mockOnTaskUpdated}
        onEditTask={mockOnEditTask}
        canEditTask={mockCanEditTask}
      />
    </MemoryRouter>
  );

  fireEvent.click(screen.getByText('Unassigned'));
  
  await waitFor(() => {
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });
  
  expect(screen.getByText('John Admin (administrator)')).toBeInTheDocument();
  expect(screen.getByText('Jane Developer (developer)')).toBeInTheDocument();
  expect(screen.queryByText('Bob Viewer (viewer)')).not.toBeInTheDocument();
});

test('assigns task to selected member', async () => {
  render(
    <MemoryRouter>
      <TaskItem
        task={mockTaskUnassigned}
        project={mockProject}
        projectId="test-project-id"
        isProjectManager={true}
        onTaskUpdated={mockOnTaskUpdated}
        onEditTask={mockOnEditTask}
        canEditTask={mockCanEditTask}
      />
    </MemoryRouter>
  );

  fireEvent.click(screen.getByText('Unassigned'));
  
  await waitFor(() => {
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });
  
  fireEvent.change(screen.getByRole('combobox'), {
    target: { value: 'user1' }
  });
  
  fireEvent.click(screen.getByText('✓'));
  
  await waitFor(() => {
    expect(mockAssignTask).toHaveBeenCalledWith('test-project-id', 'task2', 'user1');
  });
  
  await waitFor(() => {
    expect(mockOnTaskUpdated).toHaveBeenCalled();
  });
});

test('cancels assignment when cancel button is clicked', async () => {
  render(
    <MemoryRouter>
      <TaskItem
        task={mockTaskUnassigned}
        project={mockProject}
        projectId="test-project-id"
        isProjectManager={true}
        onTaskUpdated={mockOnTaskUpdated}
        onEditTask={mockOnEditTask}
        canEditTask={mockCanEditTask}
      />
    </MemoryRouter>
  );

  fireEvent.click(screen.getByText('Unassigned'));
  
  await waitFor(() => {
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });
  
  fireEvent.click(screen.getByText('✕'));
  
  await waitFor(() => {
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });
  
  expect(mockAssignTask).not.toHaveBeenCalled();
});

test('does not show assignment dropdown for non-project managers', () => {
  render(
    <MemoryRouter>
      <TaskItem
        task={mockTaskAssigned}
        project={mockProject}
        projectId="test-project-id"
        isProjectManager={false}
        onTaskUpdated={mockOnTaskUpdated}
        onEditTask={mockOnEditTask}
        canEditTask={mockCanEditTask}
      />
    </MemoryRouter>
  );

  // Text should be static, not clickable
  const assigneeText = screen.getByText('John Admin');
  expect(assigneeText.tagName).not.toBe('BUTTON');
});

test('handles task assignment error', async () => {
  const { toast } = require('react-toastify');
  mockAssignTask.mockRejectedValue({
    response: { data: { message: 'Failed to assign task' } }
  });
  
  render(
    <MemoryRouter>
      <TaskItem
        task={mockTaskUnassigned}
        project={mockProject}
        projectId="test-project-id"
        isProjectManager={true}
        onTaskUpdated={mockOnTaskUpdated}
        onEditTask={mockOnEditTask}
        canEditTask={mockCanEditTask}
      />
    </MemoryRouter>
  );

  fireEvent.click(screen.getByText('Unassigned'));
  
  await waitFor(() => {
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });
  
  fireEvent.change(screen.getByRole('combobox'), {
    target: { value: 'user1' }
  });
  
  fireEvent.click(screen.getByText('✓'));
  
  await waitFor(() => {
    expect(toast.error).toHaveBeenCalledWith('Failed to assign task');
  });
});

test('handles task deletion error', async () => {
  const { toast } = require('react-toastify');
  mockDeleteTask.mockRejectedValue({
    response: { data: { message: 'Failed to delete task' } }
  });
  
  render(
    <MemoryRouter>
      <TaskItem
        task={mockTaskAssigned}
        project={mockProject}
        projectId="test-project-id"
        isProjectManager={true}
        onTaskUpdated={mockOnTaskUpdated}
        onEditTask={mockOnEditTask}
        canEditTask={mockCanEditTask}
      />
    </MemoryRouter>
  );

  fireEvent.click(screen.getByText('Delete'));
  
  await waitFor(() => {
    expect(toast.error).toHaveBeenCalledWith('Failed to delete task');
  });
});

test('displays correct status badge colors', () => {
  const { rerender } = render(
    <MemoryRouter>
      <TaskItem
        task={mockTaskAssigned}
        project={mockProject}
        projectId="test-project-id"
        isProjectManager={true}
        onTaskUpdated={mockOnTaskUpdated}
        onEditTask={mockOnEditTask}
        canEditTask={mockCanEditTask}
      />
    </MemoryRouter>
  );

  // To Do task - should have red variant
  expect(screen.getByText('To Do')).toHaveClass('bg-danger');

  // In Progress task
  rerender(
    <MemoryRouter>
      <TaskItem
        task={mockTaskUnassigned}
        project={mockProject}
        projectId="test-project-id"
        isProjectManager={true}
        onTaskUpdated={mockOnTaskUpdated}
        onEditTask={mockOnEditTask}
        canEditTask={mockCanEditTask}
      />
    </MemoryRouter>
  );
  
  expect(screen.getByText('In Progress')).toHaveClass('bg-warning');

  // Completed task
  rerender(
    <MemoryRouter>
      <TaskItem
        task={mockTaskCompleted}
        project={mockProject}
        projectId="test-project-id"
        isProjectManager={true}
        onTaskUpdated={mockOnTaskUpdated}
        onEditTask={mockOnEditTask}
        canEditTask={mockCanEditTask}
      />
    </MemoryRouter>
  );
  
  expect(screen.getByText('Completed')).toHaveClass('bg-success');
});

test('shows N/A when task has no deadline', () => {
  const taskWithoutDeadline = {
    ...mockTaskAssigned,
    taskDeadline: null
  };
  
  render(
    <MemoryRouter>
      <TaskItem
        task={taskWithoutDeadline}
        project={mockProject}
        projectId="test-project-id"
        isProjectManager={true}
        onTaskUpdated={mockOnTaskUpdated}
        onEditTask={mockOnEditTask}
        canEditTask={mockCanEditTask}
      />
    </MemoryRouter>
  );

  expect(screen.getByText('N/A')).toBeInTheDocument();
});

test('disables assignment buttons when assigning task', async () => {
  render(
    <MemoryRouter>
      <TaskItem
        task={mockTaskUnassigned}
        project={mockProject}
        projectId="test-project-id"
        isProjectManager={true}
        onTaskUpdated={mockOnTaskUpdated}
        onEditTask={mockOnEditTask}
        canEditTask={mockCanEditTask}
      />
    </MemoryRouter>
  );

  fireEvent.click(screen.getByText('Unassigned'));
  
  await waitFor(() => {
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });
  
  fireEvent.change(screen.getByRole('combobox'), {
    target: { value: 'user1' }
  });
  
  // Mock the assignment to take some time
  let resolveAssignment;
  mockAssignTask.mockReturnValue(new Promise(resolve => {
    resolveAssignment = resolve;
  }));
  
  fireEvent.click(screen.getByText('✓'));
  
  // Buttons should be disabled during assignment
  expect(screen.getByRole('combobox')).toBeDisabled();
  expect(screen.getByText('✓')).toBeDisabled();
  expect(screen.getByText('✕')).toBeDisabled();
  
  // Resolve the assignment
  resolveAssignment();
  
  await waitFor(() => {
    expect(mockOnTaskUpdated).toHaveBeenCalled();
  });
});
