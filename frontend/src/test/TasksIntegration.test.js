import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Simple integration test for Tasks functionality
import TasksSection from '../components/TasksSection';

// Mock the services
jest.mock('../services/project.service', () => ({
  createTask: jest.fn(() => Promise.resolve()),
  updateTask: jest.fn(() => Promise.resolve()),
  deleteTask: jest.fn(() => Promise.resolve()),
  assignTask: jest.fn(() => Promise.resolve())
}));

jest.mock('react-toastify', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  }
}));

// Mock child components to avoid complexity
jest.mock('../components/TaskItem', () => {
  return function MockTaskItem({ task }) {
    return <div data-testid={`task-${task._id}`}>{task.taskName}</div>;
  };
});

jest.mock('../components/ProgressView', () => {
  return function MockProgressView({ tasks }) {
    return (
      <div data-testid="progress-view">
        {tasks?.map(task => (
          <div key={task._id}>{task.taskName}</div>
        ))}
      </div>
    );
  };
});

// Silence warnings
beforeAll(() => {
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterAll(() => {
  // eslint-disable-next-line no-console
  console.warn.mockRestore();
  // eslint-disable-next-line no-console
  console.error.mockRestore();
});

const mockProject = {
  _id: 'test-project',
  tasks: [
    {
      _id: 'task1',
      taskName: 'Test Task',
      taskDescription: 'Test Description',
      taskDeadline: '2025-08-15T00:00:00.000Z',
      taskProgress: 'To Do',
      taskAssignee: null
    }
  ]
};

const mockUser = { _id: 'user1', name: 'Test User' };

test('renders basic TasksSection structure', () => {
  render(
    <MemoryRouter>
      <TasksSection
        project={mockProject}
        projectId="test-project"
        onTasksUpdated={jest.fn()}
        isProjectManager={true}
        isViewer={false}
        canEditTask={() => true}
        currentUser={mockUser}
      />
    </MemoryRouter>
  );

  expect(screen.getByText('Task Summary')).toBeInTheDocument();
  expect(screen.getByText('All Tasks')).toBeInTheDocument();
  expect(screen.getByText('List View')).toBeInTheDocument();
  expect(screen.getByText('Progress View')).toBeInTheDocument();
});

test('shows create task button', () => {
  render(
    <MemoryRouter>
      <TasksSection
        project={mockProject}
        projectId="test-project"
        onTasksUpdated={jest.fn()}
        isProjectManager={true}
        isViewer={false}
        canEditTask={() => true}
        currentUser={mockUser}
      />
    </MemoryRouter>
  );

  expect(screen.getByText('+ Create Task')).toBeInTheDocument();
});

test('switches to progress view', () => {
  render(
    <MemoryRouter>
      <TasksSection
        project={mockProject}
        projectId="test-project"
        onTasksUpdated={jest.fn()}
        isProjectManager={true}
        isViewer={false}
        canEditTask={() => true}
        currentUser={mockUser}
      />
    </MemoryRouter>
  );

  fireEvent.click(screen.getByText('Progress View'));
  expect(screen.getByTestId('progress-view')).toBeInTheDocument();
});

test('displays empty state when no tasks', () => {
  const emptyProject = { ...mockProject, tasks: [] };
  
  render(
    <MemoryRouter>
      <TasksSection
        project={emptyProject}
        projectId="test-project"
        onTasksUpdated={jest.fn()}
        isProjectManager={true}
        isViewer={false}
        canEditTask={() => true}
        currentUser={mockUser}
      />
    </MemoryRouter>
  );

  expect(screen.getByText('No tasks yet')).toBeInTheDocument();
  expect(screen.getByText('Create your first task to get started')).toBeInTheDocument();
});
