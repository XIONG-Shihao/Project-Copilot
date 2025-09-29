import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Import the component after all mocks are set up
import ProgressView from '../components/ProgressView';

// Create mock functions that will be accessible in tests
let mockOnEditTask;
let mockCanEditTask;

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
  mockOnEditTask = jest.fn();
  mockCanEditTask = jest.fn(() => true);
});

// Mock data
const mockTasks = [
  {
    _id: 'task1',
    taskName: 'To Do Task 1',
    taskDescription: 'First to do task',
    taskDeadline: '2025-08-15T00:00:00.000Z',
    taskProgress: 'To Do',
    taskAssignee: {
      _id: 'user1',
      name: 'John Admin',
      email: 'john@example.com'
    }
  },
  {
    _id: 'task2',
    taskName: 'To Do Task 2',
    taskDescription: 'Second to do task',
    taskDeadline: '2025-08-20T00:00:00.000Z',
    taskProgress: 'To Do',
    taskAssignee: null
  },
  {
    _id: 'task3',
    taskName: 'In Progress Task',
    taskDescription: 'Task being worked on',
    taskDeadline: '2025-08-18T00:00:00.000Z',
    taskProgress: 'In Progress',
    taskAssignee: {
      _id: 'user2',
      name: 'Jane Developer',
      email: 'jane@example.com'
    }
  },
  {
    _id: 'task4',
    taskName: 'Completed Task',
    taskDescription: 'Task that is done',
    taskDeadline: '2025-08-10T00:00:00.000Z',
    taskProgress: 'Completed',
    taskAssignee: {
      _id: 'user1',
      name: 'John Admin',
      email: 'john@example.com'
    }
  },
  {
    _id: 'task5',
    taskName: 'Overdue Task',
    taskDescription: 'Task past deadline',
    taskDeadline: '2025-08-01T00:00:00.000Z', // Past date
    taskProgress: 'To Do',
    taskAssignee: null
  }
];

const mockEmptyTasks = [];

test('renders ProgressView with three columns', () => {
  render(
    <MemoryRouter>
      <ProgressView
        tasks={mockTasks}
        onEditTask={mockOnEditTask}
        canEditTask={mockCanEditTask}
      />
    </MemoryRouter>
  );

  expect(screen.getByText('To Do (3)')).toBeInTheDocument();
  expect(screen.getByText('In Progress (1)')).toBeInTheDocument();
  expect(screen.getByText('Completed (1)')).toBeInTheDocument();
});

test('displays tasks in correct columns', () => {
  render(
    <MemoryRouter>
      <ProgressView
        tasks={mockTasks}
        onEditTask={mockOnEditTask}
        canEditTask={mockCanEditTask}
      />
    </MemoryRouter>
  );

  // Check To Do column
  expect(screen.getByText('To Do Task 1')).toBeInTheDocument();
  expect(screen.getByText('To Do Task 2')).toBeInTheDocument();
  expect(screen.getByText('Overdue Task')).toBeInTheDocument();

  // Check In Progress column
  expect(screen.getByText('In Progress Task')).toBeInTheDocument();

  // Check Completed column
  expect(screen.getByText('Completed Task')).toBeInTheDocument();
});

test('displays task descriptions and deadlines', () => {
  render(
    <MemoryRouter>
      <ProgressView
        tasks={mockTasks}
        onEditTask={mockOnEditTask}
        canEditTask={mockCanEditTask}
      />
    </MemoryRouter>
  );

  expect(screen.getByText('First to do task')).toBeInTheDocument();
  expect(screen.getByText('Task being worked on')).toBeInTheDocument();
  expect(screen.getByText('Task that is done')).toBeInTheDocument();
  
  // Check formatted dates - they appear with calendar emoji and space
  expect(screen.getByText((content, _element) => {
    return content.includes('15/08/2025');
  })).toBeInTheDocument();
  expect(screen.getByText((content, _element) => {
    return content.includes('18/08/2025');
  })).toBeInTheDocument();
  expect(screen.getByText((content, _element) => {
    return content.includes('10/08/2025');
  })).toBeInTheDocument();
});

test('displays assignee avatars', () => {
  render(
    <MemoryRouter>
      <ProgressView
        tasks={mockTasks}
        onEditTask={mockOnEditTask}
        canEditTask={mockCanEditTask}
      />
    </MemoryRouter>
  );

  // Check that assignee initials are displayed
  const avatars = screen.getAllByText('J'); // John Admin and Jane Developer
  expect(avatars).toHaveLength(3); // John appears twice (task1 and task4), Jane once (task3)
});

test('shows overdue styling for past deadline tasks', () => {
  render(
    <MemoryRouter>
      <ProgressView
        tasks={mockTasks}
        onEditTask={mockOnEditTask}
        canEditTask={mockCanEditTask}
      />
    </MemoryRouter>
  );

  // Find the span element containing the overdue date
  const overdueElement = screen.getByText((content, _element) => {
    return content.includes('01/08/2025');
  });
  expect(overdueElement).toHaveStyle('color: rgb(220, 53, 69)'); // Red color for overdue
  expect(overdueElement).toHaveStyle('font-weight: bold');
});

test('does not show overdue styling for completed tasks', () => {
  render(
    <MemoryRouter>
      <ProgressView
        tasks={mockTasks}
        onEditTask={mockOnEditTask}
        canEditTask={mockCanEditTask}
      />
    </MemoryRouter>
  );

  // Find the span element containing the completed task date
  const completedElement = screen.getByText((content, _element) => {
    return content.includes('10/08/2025');
  });
  expect(completedElement).not.toHaveStyle('color: rgb(220, 53, 69)');
  expect(completedElement).not.toHaveStyle('font-weight: bold');
});

test('shows edit buttons when user can edit tasks', () => {
  render(
    <MemoryRouter>
      <ProgressView
        tasks={mockTasks}
        onEditTask={mockOnEditTask}
        canEditTask={mockCanEditTask}
      />
    </MemoryRouter>
  );

  const editButtons = screen.getAllByRole('button');
  expect(editButtons.length).toBeGreaterThan(0);
});

test('hides edit buttons when user cannot edit tasks', () => {
  mockCanEditTask.mockReturnValue(false);
  
  render(
    <MemoryRouter>
      <ProgressView
        tasks={mockTasks}
        onEditTask={mockOnEditTask}
        canEditTask={mockCanEditTask}
      />
    </MemoryRouter>
  );

  const editButtons = screen.queryAllByRole('button');
  expect(editButtons).toHaveLength(0);
});

test('calls onEditTask when edit button is clicked', () => {
  render(
    <MemoryRouter>
      <ProgressView
        tasks={mockTasks}
        onEditTask={mockOnEditTask}
        canEditTask={mockCanEditTask}
      />
    </MemoryRouter>
  );

  const editButtons = screen.getAllByRole('button');
  fireEvent.click(editButtons[0]);
  
  expect(mockOnEditTask).toHaveBeenCalledWith(mockTasks[0]);
});

test('displays empty state when no tasks in a column', () => {
  const onlyToDoTasks = mockTasks.filter(task => task.taskProgress === 'To Do');
  
  render(
    <MemoryRouter>
      <ProgressView
        tasks={onlyToDoTasks}
        onEditTask={mockOnEditTask}
        canEditTask={mockCanEditTask}
      />
    </MemoryRouter>
  );

  expect(screen.getByText('To Do (3)')).toBeInTheDocument();
  expect(screen.getByText('In Progress (0)')).toBeInTheDocument();
  expect(screen.getByText('Completed (0)')).toBeInTheDocument();
  
  // Check empty state messages
  const noTasksMessages = screen.getAllByText('No tasks');
  expect(noTasksMessages).toHaveLength(2); // In Progress and Completed columns
});

test('displays empty state when no tasks at all', () => {
  render(
    <MemoryRouter>
      <ProgressView
        tasks={mockEmptyTasks}
        onEditTask={mockOnEditTask}
        canEditTask={mockCanEditTask}
      />
    </MemoryRouter>
  );

  expect(screen.getByText('To Do (0)')).toBeInTheDocument();
  expect(screen.getByText('In Progress (0)')).toBeInTheDocument();
  expect(screen.getByText('Completed (0)')).toBeInTheDocument();
  
  const noTasksMessages = screen.getAllByText('No tasks');
  expect(noTasksMessages).toHaveLength(3); // All three columns
});

test('shows No date when task has no deadline', () => {
  const tasksWithoutDeadline = [{
    ...mockTasks[0],
    taskDeadline: null
  }];
  
  render(
    <MemoryRouter>
      <ProgressView
        tasks={tasksWithoutDeadline}
        onEditTask={mockOnEditTask}
        canEditTask={mockCanEditTask}
      />
    </MemoryRouter>
  );

  // Check for "No date" text that appears with calendar emoji
  expect(screen.getByText((content, _element) => {
    return content.includes('No date');
  })).toBeInTheDocument();
});

test('renders column headers', () => {
  render(
    <MemoryRouter>
      <ProgressView
        tasks={mockTasks}
        onEditTask={mockOnEditTask}
        canEditTask={mockCanEditTask}
      />
    </MemoryRouter>
  );

  // Check that column headers are present
  expect(screen.getByText('To Do (3)')).toBeInTheDocument();
  expect(screen.getByText('In Progress (1)')).toBeInTheDocument();
  expect(screen.getByText('Completed (1)')).toBeInTheDocument();
});

test('applies correct text color for headers', () => {
  render(
    <MemoryRouter>
      <ProgressView
        tasks={mockTasks}
        onEditTask={mockOnEditTask}
        canEditTask={mockCanEditTask}
      />
    </MemoryRouter>
  );

  // In Progress should have dark text, others should have white text
  const toDoHeaderText = screen.getByText('To Do (3)');
  const inProgressHeaderText = screen.getByText('In Progress (1)');
  const completedHeaderText = screen.getByText('Completed (1)');

  expect(toDoHeaderText).toHaveClass('text-white');
  expect(inProgressHeaderText).toHaveClass('text-dark'); // Different for better visibility on yellow
  expect(completedHeaderText).toHaveClass('text-white');
});

test('shows assignee tooltip on hover', () => {
  render(
    <MemoryRouter>
      <ProgressView
        tasks={mockTasks}
        onEditTask={mockOnEditTask}
        canEditTask={mockCanEditTask}
      />
    </MemoryRouter>
  );

  const avatars = screen.getAllByText('J');
  expect(avatars[0]).toHaveAttribute('title', 'John Admin');
});

test('handles tasks parameter being undefined', () => {
  render(
    <MemoryRouter>
      <ProgressView
        tasks={undefined}
        onEditTask={mockOnEditTask}
        canEditTask={mockCanEditTask}
      />
    </MemoryRouter>
  );

  expect(screen.getByText('To Do (0)')).toBeInTheDocument();
  expect(screen.getByText('In Progress (0)')).toBeInTheDocument();
  expect(screen.getByText('Completed (0)')).toBeInTheDocument();
});

test('handles tasks parameter being null', () => {
  render(
    <MemoryRouter>
      <ProgressView
        tasks={null}
        onEditTask={mockOnEditTask}
        canEditTask={mockCanEditTask}
      />
    </MemoryRouter>
  );

  expect(screen.getByText('To Do (0)')).toBeInTheDocument();
  expect(screen.getByText('In Progress (0)')).toBeInTheDocument();
  expect(screen.getByText('Completed (0)')).toBeInTheDocument();
});

test('displays task cards', () => {
  render(
    <MemoryRouter>
      <ProgressView
        tasks={mockTasks}
        onEditTask={mockOnEditTask}
        canEditTask={mockCanEditTask}
      />
    </MemoryRouter>
  );

  // Check that task cards are displayed
  expect(screen.getByText('To Do Task 1')).toBeInTheDocument();
});

test('displays tasks with and without assignees', () => {
  render(
    <MemoryRouter>
      <ProgressView
        tasks={mockTasks}
        onEditTask={mockOnEditTask}
        canEditTask={mockCanEditTask}
      />
    </MemoryRouter>
  );

  // Check that tasks with assignees show avatars and tasks without don't
  expect(screen.getByText('To Do Task 1')).toBeInTheDocument(); // Has assignee
  expect(screen.getByText('To Do Task 2')).toBeInTheDocument(); // No assignee
});
