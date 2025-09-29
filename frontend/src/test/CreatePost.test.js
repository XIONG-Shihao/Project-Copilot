// src/test/CreatePost.test.js
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Import the component after all mocks are set up
import CreatePost from '../components/CreatePost';

// Mock FileReader for image handling tests
global.FileReader = class {
  constructor() {
    this.result = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=';
  }
  
  readAsDataURL() {
    setTimeout(() => {
      this.onload({ target: { result: this.result } });
    }, 0);
  }
};

const mockProject = {
  _id: 'project1',
  projectName: 'Test Project',
  projectDescription: 'A test project',
  projectTasks: [
    { _id: 'task1', taskName: 'Task 1', taskDescription: 'First task description' },
    { _id: 'task2', taskName: 'Task 2', taskDescription: 'Second task description' },
    { _id: 'task3', taskName: 'Complex Task Name', taskDescription: 'A more complex task name' }
  ]
};

const mockOnSubmit = jest.fn();
const mockOnHide = jest.fn();

const defaultProps = {
  show: true,
  onHide: mockOnHide,
  onSubmit: mockOnSubmit,
  project: mockProject,
  loading: false
};

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
  mockOnSubmit.mockClear();
  mockOnHide.mockClear();
});

test('renders CreatePost modal when show is true', () => {
  render(
    <MemoryRouter>
      <CreatePost {...defaultProps} />
    </MemoryRouter>
  );
  
  expect(screen.getByText('Create New Post')).toBeInTheDocument();
  expect(screen.getByText('Post Type')).toBeInTheDocument();
  expect(screen.getByText('Title *')).toBeInTheDocument();
  expect(screen.getByText('Content *')).toBeInTheDocument();
  expect(screen.getByText('Image Attachment (Optional)')).toBeInTheDocument();
});

test('does not render when show is false', () => {
  render(
    <MemoryRouter>
      <CreatePost {...defaultProps} show={false} />
    </MemoryRouter>
  );
  
  expect(screen.queryByText('Create New Post')).not.toBeInTheDocument();
});

test('displays all post type options', () => {
  render(
    <MemoryRouter>
      <CreatePost {...defaultProps} />
    </MemoryRouter>
  );
  
  expect(screen.getByText('🗣️')).toBeInTheDocument();
  expect(screen.getByText('Discussion')).toBeInTheDocument();
  expect(screen.getByText('💬')).toBeInTheDocument();
  expect(screen.getByText('Feedback')).toBeInTheDocument();
  expect(screen.getByText('📢')).toBeInTheDocument();
  expect(screen.getByText('Announcement')).toBeInTheDocument();
});

test('allows post type selection', () => {
  render(
    <MemoryRouter>
      <CreatePost {...defaultProps} />
    </MemoryRouter>
  );
  
  // Initially Discussion should be selected
  const discussionBadge = screen.getByText('Discussion');
  expect(discussionBadge).toHaveClass('bg-info');
  
  // Click on Feedback
  const feedbackBadge = screen.getByText('Feedback');
  fireEvent.click(feedbackBadge);
  expect(feedbackBadge).toHaveClass('bg-success');
  expect(discussionBadge).toHaveClass('bg-light');
});

test('handles title input correctly', () => {
  render(
    <MemoryRouter>
      <CreatePost {...defaultProps} />
    </MemoryRouter>
  );
  
  const titleInput = screen.getByPlaceholderText('Enter post title...');
  fireEvent.change(titleInput, { target: { value: 'Test Title' } });
  
  expect(titleInput).toHaveValue('Test Title');
  expect(screen.getByText('10/100 characters')).toBeInTheDocument();
});

test('handles content input correctly', () => {
  render(
    <MemoryRouter>
      <CreatePost {...defaultProps} />
    </MemoryRouter>
  );
  
  const contentInput = screen.getByPlaceholderText('Write your post content... Use @ to mention tasks.');
  fireEvent.change(contentInput, { target: { value: 'Test content' } });
  
  expect(contentInput).toHaveValue('Test content');
});

test('shows task suggestions when @ is typed', async () => {
  render(
    <MemoryRouter>
      <CreatePost {...defaultProps} />
    </MemoryRouter>
  );
  
  const contentInput = screen.getByPlaceholderText('Write your post content... Use @ to mention tasks.');
  
  // Type @ to trigger task suggestions
  fireEvent.change(contentInput, { target: { value: '@' } });
  
  await waitFor(() => {
    expect(screen.getByText('Task 1')).toBeInTheDocument();
  });
  
  await waitFor(() => {
    expect(screen.getByText('Task 2')).toBeInTheDocument();
  });
  
  await waitFor(() => {
    expect(screen.getByText('Complex Task Name')).toBeInTheDocument();
  });
});

test('filters task suggestions based on input', async () => {
  render(
    <MemoryRouter>
      <CreatePost {...defaultProps} />
    </MemoryRouter>
  );
  
  const contentInput = screen.getByPlaceholderText('Write your post content... Use @ to mention tasks.');
  
  // Type @task to filter suggestions
  fireEvent.change(contentInput, { target: { value: '@task' } });
  
  await waitFor(() => {
    expect(screen.getByText('Task 1')).toBeInTheDocument();
  });
  
  await waitFor(() => {
    expect(screen.getByText('Task 2')).toBeInTheDocument();
  });
  
  // Complex Task Name should still be shown since it contains "task" in the description
  await waitFor(() => {
    expect(screen.getByText('Complex Task Name')).toBeInTheDocument();
  });
});

test('inserts task mention when suggestion is clicked', async () => {
  render(
    <MemoryRouter>
      <CreatePost {...defaultProps} />
    </MemoryRouter>
  );
  
  const contentInput = screen.getByPlaceholderText('Write your post content... Use @ to mention tasks.');
  
  // Type @ to show suggestions
  fireEvent.change(contentInput, { target: { value: '@' } });
  
  await waitFor(() => {
    expect(screen.getByText('Task 1')).toBeInTheDocument();
  });
  
  // Click on Task 1
  fireEvent.click(screen.getByText('Task 1'));
  
  // Task mention should be inserted
  expect(contentInput).toHaveValue('@Task1 ');
});

test('handles image selection correctly', async () => {
  render(
    <MemoryRouter>
      <CreatePost {...defaultProps} />
    </MemoryRouter>
  );
  
  const fileInputs = screen.getAllByDisplayValue('').filter(input => input.type === 'file');
  const fileInput = fileInputs[0];
  const file = new File(['test image content'], 'test.jpg', { type: 'image/jpeg' });
  
  fireEvent.change(fileInput, { target: { files: [file] } });
  
  await waitFor(() => {
    expect(screen.getByText('Image Preview:')).toBeInTheDocument();
  });
  
  await waitFor(() => {
    expect(screen.getByText('Remove')).toBeInTheDocument();
  });
});

test('validates image file type', async () => {
  render(
    <MemoryRouter>
      <CreatePost {...defaultProps} />
    </MemoryRouter>
  );
  
  const fileInputs = screen.getAllByDisplayValue('').filter(input => input.type === 'file');
  const fileInput = fileInputs[0];
  const invalidFile = new File(['test content'], 'test.txt', { type: 'text/plain' });
  
  fireEvent.change(fileInput, { target: { files: [invalidFile] } });
  
  await waitFor(() => {
    expect(screen.getByText('Please select a valid image file (PNG, JPG, etc.)')).toBeInTheDocument();
  });
});

test('validates image file size', async () => {
  render(
    <MemoryRouter>
      <CreatePost {...defaultProps} />
    </MemoryRouter>
  );
  
  const fileInputs = screen.getAllByDisplayValue('').filter(input => input.type === 'file');
  const fileInput = fileInputs[0];
  
  // Create a mock file that exceeds 5MB
  const largeFile = new File(['x'.repeat(6 * 1024 * 1024)], 'large.jpg', { type: 'image/jpeg' });
  
  fireEvent.change(fileInput, { target: { files: [largeFile] } });
  
  await waitFor(() => {
    expect(screen.getByText('Image size must be less than 5MB')).toBeInTheDocument();
  });
});

test('removes selected image', async () => {
  render(
    <MemoryRouter>
      <CreatePost {...defaultProps} />
    </MemoryRouter>
  );
  
  const fileInputs = screen.getAllByDisplayValue('').filter(input => input.type === 'file');
  const fileInput = fileInputs[0];
  const file = new File(['test image content'], 'test.jpg', { type: 'image/jpeg' });
  
  fireEvent.change(fileInput, { target: { files: [file] } });
  
  await waitFor(() => {
    expect(screen.getByText('Remove')).toBeInTheDocument();
  });
  
  // Click remove button
  fireEvent.click(screen.getByText('Remove'));
  
  await waitFor(() => {
    expect(screen.queryByText('Image Preview:')).not.toBeInTheDocument();
  });
});

test('shows mentioned tasks preview', async () => {
  render(
    <MemoryRouter>
      <CreatePost {...defaultProps} />
    </MemoryRouter>
  );
  
  const contentInput = screen.getByPlaceholderText('Write your post content... Use @ to mention tasks.');
  
  // Type content with task mentions
  fireEvent.change(contentInput, { target: { value: 'Check @Task1 and @Task2' } });
  
  await waitFor(() => {
    expect(screen.getByText('Mentioned Tasks:')).toBeInTheDocument();
  });
  
  await waitFor(() => {
    expect(screen.getByText('Task 1')).toBeInTheDocument();
  });
  
  await waitFor(() => {
    expect(screen.getByText('Task 2')).toBeInTheDocument();
  });
});

test('validates form before submission', () => {
  render(
    <MemoryRouter>
      <CreatePost {...defaultProps} />
    </MemoryRouter>
  );
  
  // Try to submit without filling required fields
  const submitButton = screen.getByText('Create Post');
  fireEvent.click(submitButton);
  
  // Should show validation errors
  expect(screen.getByText('Title is required')).toBeInTheDocument();
  expect(screen.getByText('Content is required')).toBeInTheDocument();
  
  // onSubmit should not be called
  expect(mockOnSubmit).not.toHaveBeenCalled();
});

test('submits form successfully with valid data', async () => {
  render(
    <MemoryRouter>
      <CreatePost {...defaultProps} />
    </MemoryRouter>
  );
  
  // Fill in required fields
  const titleInput = screen.getByPlaceholderText('Enter post title...');
  const contentInput = screen.getByPlaceholderText('Write your post content... Use @ to mention tasks.');
  
  fireEvent.change(titleInput, { target: { value: 'Test Title' } });
  fireEvent.change(contentInput, { target: { value: 'Test content' } });
  
  // Submit form
  const submitButton = screen.getByText('Create Post');
  fireEvent.click(submitButton);
  
  expect(mockOnSubmit).toHaveBeenCalledWith({
    title: 'Test Title',
    content: 'Test content',
    postType: 'Discussion',
    imageData: null,
    imageType: null
  });
});

test('submits form with image data', async () => {
  render(
    <MemoryRouter>
      <CreatePost {...defaultProps} />
    </MemoryRouter>
  );
  
  // Fill in required fields
  const titleInput = screen.getByPlaceholderText('Enter post title...');
  const contentInput = screen.getByPlaceholderText('Write your post content... Use @ to mention tasks.');
  
  fireEvent.change(titleInput, { target: { value: 'Test Title' } });
  fireEvent.change(contentInput, { target: { value: 'Test content' } });
  
  // Add image
  const fileInputs = screen.getAllByDisplayValue('').filter(input => input.type === 'file');
  const fileInput = fileInputs[0];
  const file = new File(['test image content'], 'test.jpg', { type: 'image/jpeg' });
  
  fireEvent.change(fileInput, { target: { files: [file] } });
  
  await waitFor(() => {
    expect(screen.getByText('Image Preview:')).toBeInTheDocument();
  });
  
  // Submit form
  const submitButton = screen.getByText('Create Post');
  fireEvent.click(submitButton);
  
  expect(mockOnSubmit).toHaveBeenCalledWith({
    title: 'Test Title',
    content: 'Test content',
    postType: 'Discussion',
    imageData: expect.any(String), // Base64 string
    imageType: 'image/jpeg'
  });
});

test('submits form with task mentions', async () => {
  render(
    <MemoryRouter>
      <CreatePost {...defaultProps} />
    </MemoryRouter>
  );
  
  // Fill in required fields
  const titleInput = screen.getByPlaceholderText('Enter post title...');
  const contentInput = screen.getByPlaceholderText('Write your post content... Use @ to mention tasks.');
  
  fireEvent.change(titleInput, { target: { value: 'Test Title' } });
  fireEvent.change(contentInput, { target: { value: 'Check @Task1' } });
  
  // Submit form
  const submitButton = screen.getByText('Create Post');
  fireEvent.click(submitButton);
  
  expect(mockOnSubmit).toHaveBeenCalledWith({
    title: 'Test Title',
    content: 'Check @Task1',
    postType: 'Discussion',
    imageData: null,
    imageType: null
  });
});

test('handles cancel button click', () => {
  render(
    <MemoryRouter>
      <CreatePost {...defaultProps} />
    </MemoryRouter>
  );
  
  const cancelButton = screen.getByText('Cancel');
  fireEvent.click(cancelButton);
  
  expect(mockOnHide).toHaveBeenCalled();
});

test('disables submit button when loading', () => {
  render(
    <MemoryRouter>
      <CreatePost {...defaultProps} loading={true} />
    </MemoryRouter>
  );
  
  const submitButton = screen.getByText('Creating...');
  expect(submitButton).toBeDisabled();
});

test('disables cancel button when loading', () => {
  render(
    <MemoryRouter>
      <CreatePost {...defaultProps} loading={true} />
    </MemoryRouter>
  );
  
  const cancelButton = screen.getByText('Cancel');
  expect(cancelButton).toBeDisabled();
});

test('resets form when modal is closed and reopened', async () => {
  const { rerender } = render(
    <MemoryRouter>
      <CreatePost {...defaultProps} show={false} />
    </MemoryRouter>
  );
  
  // Modal should not be visible
  expect(screen.queryByText('Create New Post')).not.toBeInTheDocument();
  
  // Reopen modal
  rerender(
    <MemoryRouter>
      <CreatePost {...defaultProps} show={true} />
    </MemoryRouter>
  );
  
  // Form should be reset
  const titleInput = screen.getByPlaceholderText('Enter post title...');
  const contentInput = screen.getByPlaceholderText('Write your post content... Use @ to mention tasks.');
  
  expect(titleInput).toHaveValue('');
  expect(contentInput).toHaveValue('');
  
  // Check that Discussion is selected by looking for the badge with bg-info class
  const discussionBadge = screen.getByText('Discussion');
  expect(discussionBadge).toHaveClass('bg-info');
});

test('handles project without tasks gracefully', () => {
  const projectWithoutTasks = {
    ...mockProject,
    projectTasks: []
  };
  
  render(
    <MemoryRouter>
      <CreatePost {...defaultProps} project={projectWithoutTasks} />
    </MemoryRouter>
  );
  
  const contentInput = screen.getByPlaceholderText('Write your post content... Use @ to mention tasks.');
  
  // Type @ to trigger task suggestions
  fireEvent.change(contentInput, { target: { value: '@' } });
  
  // Should not crash and should not show suggestions
  expect(screen.queryByText('Task 1')).not.toBeInTheDocument();
});

test('handles project with undefined tasks gracefully', () => {
  const projectWithUndefinedTasks = {
    ...mockProject,
    projectTasks: undefined
  };
  
  render(
    <MemoryRouter>
      <CreatePost {...defaultProps} project={projectWithUndefinedTasks} />
    </MemoryRouter>
  );
  
  const contentInput = screen.getByPlaceholderText('Write your post content... Use @ to mention tasks.');
  
  // Type @ to trigger task suggestions
  fireEvent.change(contentInput, { target: { value: '@' } });
  
  // Should not crash and should not show suggestions
  expect(screen.queryByText('Task 1')).not.toBeInTheDocument();
});

test('handles task suggestions with long task names', async () => {
  const projectWithLongTaskNames = {
    ...mockProject,
    projectTasks: [
      { _id: 'task1', taskName: 'This is a very long task name that exceeds normal limits', taskDescription: 'Description' }
    ]
  };
  
  render(
    <MemoryRouter>
      <CreatePost {...defaultProps} project={projectWithLongTaskNames} />
    </MemoryRouter>
  );
  
  const contentInput = screen.getByPlaceholderText('Write your post content... Use @ to mention tasks.');
  
  // Type @ to show suggestions
  fireEvent.change(contentInput, { target: { value: '@' } });
  
  await waitFor(() => {
    expect(screen.getByText('This is a very long task name that exceeds normal limits')).toBeInTheDocument();
  });
});

test('handles special characters in task names', async () => {
  const projectWithSpecialChars = {
    ...mockProject,
    projectTasks: [
      { _id: 'task1', taskName: 'Task-With-Dashes', taskDescription: 'Description' },
      { _id: 'task2', taskName: 'Task With Spaces', taskDescription: 'Description' },
      { _id: 'task3', taskName: 'Task_With_Underscores', taskDescription: 'Description' }
    ]
  };
  
  render(
    <MemoryRouter>
      <CreatePost {...defaultProps} project={projectWithSpecialChars} />
    </MemoryRouter>
  );
  
  const contentInput = screen.getByPlaceholderText('Write your post content... Use @ to mention tasks.');
  
  // Type @ to show suggestions
  fireEvent.change(contentInput, { target: { value: '@' } });
  
  await waitFor(() => {
    expect(screen.getByText('Task-With-Dashes')).toBeInTheDocument();
  });
  
  await waitFor(() => {
    expect(screen.getByText('Task With Spaces')).toBeInTheDocument();
  });
  
  await waitFor(() => {
    expect(screen.getByText('Task_With_Underscores')).toBeInTheDocument();
  });
  
  // Click on a task with special characters
  fireEvent.click(screen.getByText('Task-With-Dashes'));
  
  // Task mention should be inserted with only alphanumeric characters
  expect(contentInput).toHaveValue('@TaskWithDashes ');
});
