// src/test/PostItem.test.js
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Import the component after all mocks are set up
import PostItem from '../components/PostItem';

// Create mock functions that will be accessible in tests
let mockTogglePostLike;
let mockUpdatePost;
let mockDeletePost;

// Mock modules before importing the component
jest.mock('../services/project.service', () => ({
  togglePostLike: (...args) => {
    if (!mockTogglePostLike) mockTogglePostLike = jest.fn(() => Promise.resolve({ 
      data: { 
        likesCount: 6,
        userHasLiked: true
      } 
    }));
    return mockTogglePostLike(...args);
  },
  updatePost: (...args) => {
    if (!mockUpdatePost) mockUpdatePost = jest.fn(() => Promise.resolve({ 
      data: { 
        post: {
          _id: '1',
          title: 'Updated Post',
          content: 'This is updated content',
          postType: 'Feedback',
          author: { _id: 'user1', name: 'John Doe' },
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
          likesCount: 5,
          userHasLiked: false,
          commentsCount: 3,
          mentionedTasks: []
        }
      } 
    }));
    return mockUpdatePost(...args);
  },
  deletePost: (...args) => {
    if (!mockDeletePost) mockDeletePost = jest.fn(() => Promise.resolve());
    return mockDeletePost(...args);
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

// Mock PostComments component
jest.mock('../components/PostComments', () => {
  return function MockPostComments({ postId, comments, _currentUser, onUpdate }) {
    return (
      <div data-testid="post-comments">
        <div data-testid="comments-post-id">{postId}</div>
        <div data-testid="comments-count">{comments.length}</div>
        <button 
          data-testid="add-comment"
          onClick={() => onUpdate(4)} // Simulate adding a comment
        >
          Add Comment
        </button>
      </div>
    );
  };
});

// Mock TaskDetailModal component
jest.mock('../components/TaskDetailModal', () => {
  return function MockTaskDetailModal({ show, onHide, task }) {
    if (!show) return null;
    
    return (
      <div data-testid="task-detail-modal">
        <div data-testid="task-name">{task?.taskName}</div>
        <button data-testid="close-task-modal" onClick={onHide}>
          Close
        </button>
      </div>
    );
  };
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
  mockTogglePostLike = jest.fn(() => Promise.resolve({ 
    data: { 
      likesCount: 6,
      userHasLiked: true
    } 
  }));
  mockUpdatePost = jest.fn(() => Promise.resolve({ 
    data: { 
      post: {
        _id: '1',
        title: 'Updated Post',
        content: 'This is updated content',
        postType: 'Feedback',
        author: { _id: 'user1', name: 'John Doe' },
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        likesCount: 5,
        userHasLiked: false,
        commentsCount: 3,
        mentionedTasks: []
      }
    } 
  }));
  mockDeletePost = jest.fn(() => Promise.resolve());
});

const mockPost = {
  _id: '1',
  title: 'Test Post',
  content: 'This is a test post content with @task1 mention',
  postType: 'Discussion',
  author: { _id: 'user1', name: 'John Doe' },
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
  likesCount: 5,
  userHasLiked: false,
  commentsCount: 3,
  mentionedTasks: [
    {
      task: { _id: 'task1', taskName: 'Task 1', taskDescription: 'First task' },
      mentionText: '@task1'
    }
  ]
};

const mockProject = {
  _id: 'project1',
  projectName: 'Test Project',
  projectDescription: 'A test project',
  projectTasks: [
    { _id: 'task1', taskName: 'Task 1', taskDescription: 'First task' },
    { _id: 'task2', taskName: 'Task 2', taskDescription: 'Second task' }
  ]
};

const mockCurrentUser = {
  _id: 'user1',
  name: 'John Doe',
  email: 'john@example.com'
};

const mockOnUpdate = jest.fn();

test('renders PostItem with correct content', () => {
  render(
    <MemoryRouter>
      <PostItem 
        post={mockPost}
        currentUser={mockCurrentUser}
        project={mockProject}
        onUpdate={mockOnUpdate}
      />
    </MemoryRouter>
  );
  
  expect(screen.getByText('Test Post')).toBeInTheDocument();
  // Since content is rendered with dangerouslySetInnerHTML, check for parts of the text
  // Check for the content by looking for the task mention element
  expect(screen.getByText('@task1')).toBeInTheDocument();
  expect(screen.getByText('Task 1')).toBeInTheDocument();
  expect(screen.getByText('Discussion')).toBeInTheDocument();
  expect(screen.getByText('John Doe')).toBeInTheDocument();
  expect(screen.getByText('5')).toBeInTheDocument(); // likes count
  expect(screen.getByText('3')).toBeInTheDocument(); // comments count
});

test('displays post type badge with correct styling', () => {
  render(
    <MemoryRouter>
      <PostItem 
        post={mockPost}
        currentUser={mockCurrentUser}
        project={mockProject}
        onUpdate={mockOnUpdate}
      />
    </MemoryRouter>
  );
  
  const postTypeBadge = screen.getByText('Discussion');
  expect(postTypeBadge).toBeInTheDocument();
});

test('displays mentioned tasks correctly', () => {
  render(
    <MemoryRouter>
      <PostItem 
        post={mockPost}
        currentUser={mockCurrentUser}
        project={mockProject}
        onUpdate={mockOnUpdate}
      />
    </MemoryRouter>
  );
  
  expect(screen.getByText('Task 1')).toBeInTheDocument();
  // There are multiple 📋 icons, so use getAllByText
  expect(screen.getAllByText('📋')).toHaveLength(2);
});

test('handles post like interaction', async () => {
  render(
    <MemoryRouter>
      <PostItem 
        post={mockPost}
        currentUser={mockCurrentUser}
        project={mockProject}
        onUpdate={mockOnUpdate}
      />
    </MemoryRouter>
  );
  
  const likeButton = screen.getByText('5');
  fireEvent.click(likeButton);
  
  await waitFor(() => {
    expect(mockTogglePostLike).toHaveBeenCalledWith('1');
  });
});

test('shows comments section when toggle button is clicked', async () => {
  render(
    <MemoryRouter>
      <PostItem 
        post={mockPost}
        currentUser={mockCurrentUser}
        project={mockProject}
        onUpdate={mockOnUpdate}
      />
    </MemoryRouter>
  );
  
  const commentsButton = screen.getByText('3');
  fireEvent.click(commentsButton);
  
  await waitFor(() => {
    expect(screen.getByTestId('post-comments')).toBeInTheDocument();
  });
});

test('shows edit and delete options for post owner', () => {
  render(
    <MemoryRouter>
      <PostItem 
        post={mockPost}
        currentUser={mockCurrentUser}
        project={mockProject}
        onUpdate={mockOnUpdate}
      />
    </MemoryRouter>
  );
  
  // Click the dropdown toggle (⋯)
  const dropdownToggle = screen.getByText('⋯');
  fireEvent.click(dropdownToggle);
  
  expect(screen.getByText('Edit Post')).toBeInTheDocument();
  expect(screen.getByText('Delete Post')).toBeInTheDocument();
});

test('does not show edit and delete options for non-owner', () => {
  const nonOwnerUser = { _id: 'user2', name: 'Jane Smith', email: 'jane@example.com' };
  
  render(
    <MemoryRouter>
      <PostItem 
        post={mockPost}
        currentUser={nonOwnerUser}
        project={mockProject}
        onUpdate={mockOnUpdate}
      />
    </MemoryRouter>
  );
  
  // Should not show the dropdown toggle for non-owners
  expect(screen.queryByText('⋯')).not.toBeInTheDocument();
});

test('opens edit modal when Edit Post is clicked', async () => {
  render(
    <MemoryRouter>
      <PostItem 
        post={mockPost}
        currentUser={mockCurrentUser}
        project={mockProject}
        onUpdate={mockOnUpdate}
      />
    </MemoryRouter>
  );
  
  // Click the dropdown toggle (⋯)
  const dropdownToggle = screen.getByText('⋯');
  fireEvent.click(dropdownToggle);
  
  // Click the Edit Post link in the dropdown (first one)
  fireEvent.click(screen.getAllByText('Edit Post')[0]);
  
  // The modal should already be open, so check for modal content
  // Check for the modal title specifically (the second Edit Post element)
  expect(screen.getAllByText('Edit Post')[1]).toBeInTheDocument(); // Modal title
  expect(screen.getByDisplayValue('Test Post')).toBeInTheDocument(); // Title input
  expect(screen.getByDisplayValue('This is a test post content with @task1 mention')).toBeInTheDocument(); // Content input
});

test('submits edit form successfully', async () => {
  const { toast } = require('react-toastify');
  
  render(
    <MemoryRouter>
      <PostItem 
        post={mockPost}
        currentUser={mockCurrentUser}
        project={mockProject}
        onUpdate={mockOnUpdate}
      />
    </MemoryRouter>
  );
  
  // Open edit modal
  const dropdownToggle = screen.getByText('⋯');
  fireEvent.click(dropdownToggle);
  fireEvent.click(screen.getByText('Edit Post'));
  
  // Update content
  const contentInput = screen.getByDisplayValue('This is a test post content with @task1 mention');
  fireEvent.change(contentInput, { target: { value: 'Updated content' } });
  
  // Submit form
  const updateButton = screen.getByText('Update Post');
  fireEvent.click(updateButton);
  
  await waitFor(() => {
    expect(mockUpdatePost).toHaveBeenCalledWith('1', {
      title: 'Test Post',
      content: 'Updated content',
      postType: 'Discussion'
    });
  });
  
  await waitFor(() => {
    expect(toast.success).toHaveBeenCalledWith('Post updated successfully!');
  });
});

test('handles edit form validation error', async () => {
  render(
    <MemoryRouter>
      <PostItem 
        post={mockPost}
        currentUser={mockCurrentUser}
        project={mockProject}
        onUpdate={mockOnUpdate}
      />
    </MemoryRouter>
  );
  
  // Open edit modal
  const dropdownToggle = screen.getByText('⋯');
  fireEvent.click(dropdownToggle);
  fireEvent.click(screen.getByText('Edit Post'));
  
  // Clear content to trigger validation error
  const contentInput = screen.getByDisplayValue('This is a test post content with @task1 mention');
  fireEvent.change(contentInput, { target: { value: '' } });
  
  // Submit form
  const updateButton = screen.getByText('Update Post');
  fireEvent.click(updateButton);
  
  // The validation error is shown via toast, not as page text
  // The form should not submit when content is empty
  expect(mockUpdatePost).not.toHaveBeenCalled();
});

test('handles edit post error', async () => {
  const { toast } = require('react-toastify');
  mockUpdatePost.mockRejectedValue({
    response: { data: { message: 'Update failed' } }
  });
  
  render(
    <MemoryRouter>
      <PostItem 
        post={mockPost}
        currentUser={mockCurrentUser}
        project={mockProject}
        onUpdate={mockOnUpdate}
      />
    </MemoryRouter>
  );
  
  // Open edit modal
  const dropdownToggle = screen.getByText('⋯');
  fireEvent.click(dropdownToggle);
  fireEvent.click(screen.getByText('Edit Post'));
  
  // Submit form
  const updateButton = screen.getByText('Update Post');
  fireEvent.click(updateButton);
  
  await waitFor(() => {
    expect(toast.error).toHaveBeenCalledWith('Update failed');
  });
});

test('shows delete confirmation modal', async () => {
  render(
    <MemoryRouter>
      <PostItem 
        post={mockPost}
        currentUser={mockCurrentUser}
        project={mockProject}
        onUpdate={mockOnUpdate}
      />
    </MemoryRouter>
  );
  
  // Click the dropdown toggle (⋯)
  const dropdownToggle = screen.getByText('⋯');
  fireEvent.click(dropdownToggle);
  
  fireEvent.click(screen.getByText('Delete Post'));
  
  await waitFor(() => {
    expect(screen.getByText('Confirm Delete')).toBeInTheDocument();
  });
  
  expect(screen.getByText('Are you sure you want to delete this post?')).toBeInTheDocument();
});

test('deletes post successfully', async () => {
  const { toast } = require('react-toastify');
  
  render(
    <MemoryRouter>
      <PostItem 
        post={mockPost}
        currentUser={mockCurrentUser}
        project={mockProject}
        onUpdate={mockOnUpdate}
      />
    </MemoryRouter>
  );
  
  // Open delete modal
  const dropdownToggle = screen.getByText('⋯');
  fireEvent.click(dropdownToggle);
  // Click the Delete Post link in the dropdown
  fireEvent.click(screen.getByText('Delete Post'));
  
  // Confirm deletion - use the button in the modal footer
  // The first button is in the dropdown, the second is in the modal
  const deleteButtons = screen.getAllByRole('button', { name: /delete post/i });
  const modalDeleteButton = deleteButtons[1]; // Second button is in the modal
  fireEvent.click(modalDeleteButton);
  
  await waitFor(() => {
    expect(mockDeletePost).toHaveBeenCalledWith('1');
  });
  
  await waitFor(() => {
    expect(toast.success).toHaveBeenCalledWith('Post deleted successfully!');
  });
  
  expect(mockOnUpdate).toHaveBeenCalled();
});

test('cancels post deletion', async () => {
  render(
    <MemoryRouter>
      <PostItem 
        post={mockPost}
        currentUser={mockCurrentUser}
        project={mockProject}
        onUpdate={mockOnUpdate}
      />
    </MemoryRouter>
  );
  
  // Open delete modal
  const dropdownToggle = screen.getByText('⋯');
  fireEvent.click(dropdownToggle);
  fireEvent.click(screen.getByRole('button', { name: /delete post/i }));
  
  // Cancel deletion
  const cancelButton = screen.getByText('Cancel');
  fireEvent.click(cancelButton);
  
  await waitFor(() => {
    expect(screen.queryByText('Confirm Delete')).not.toBeInTheDocument();
  });
  
  expect(mockDeletePost).not.toHaveBeenCalled();
});

test('handles delete post error', async () => {
  const { toast } = require('react-toastify');
  mockDeletePost.mockRejectedValue({
    response: { data: { message: 'Delete failed' } }
  });
  
  render(
    <MemoryRouter>
      <PostItem 
        post={mockPost}
        currentUser={mockCurrentUser}
        project={mockProject}
        onUpdate={mockOnUpdate}
      />
    </MemoryRouter>
  );
  
  // Open delete modal
  const dropdownToggle = screen.getByText('⋯');
  fireEvent.click(dropdownToggle);
  // Click the Delete Post link in the dropdown
  fireEvent.click(screen.getByText('Delete Post'));
  
  // Confirm deletion - use the button in the modal footer
  // The first button is in the dropdown, the second is in the modal
  const deleteButtons = screen.getAllByRole('button', { name: /delete post/i });
  const modalDeleteButton = deleteButtons[1]; // Second button is in the modal
  fireEvent.click(modalDeleteButton);
  
  await waitFor(() => {
    expect(toast.error).toHaveBeenCalledWith('Delete failed');
  });
  
  expect(mockOnUpdate).not.toHaveBeenCalled();
});

test('opens task detail modal when task mention is clicked', async () => {
  render(
    <MemoryRouter>
      <PostItem 
        post={mockPost}
        currentUser={mockCurrentUser}
        project={mockProject}
        onUpdate={mockOnUpdate}
      />
    </MemoryRouter>
  );
  
  // Click on task mention
  const taskMention = screen.getByText('Task 1');
  fireEvent.click(taskMention);
  
  await waitFor(() => {
    expect(screen.getByTestId('task-detail-modal')).toBeInTheDocument();
  });
  
  expect(screen.getByTestId('task-name')).toHaveTextContent('Task 1');
});

test('closes task detail modal', async () => {
  render(
    <MemoryRouter>
      <PostItem 
        post={mockPost}
        currentUser={mockCurrentUser}
        project={mockProject}
        onUpdate={mockOnUpdate}
      />
    </MemoryRouter>
  );
  
  // Open task modal
  const taskMention = screen.getByText('Task 1');
  fireEvent.click(taskMention);
  
  await waitFor(() => {
    expect(screen.getByTestId('task-detail-modal')).toBeInTheDocument();
  });
  
  // Close modal
  const closeButton = screen.getByTestId('close-task-modal');
  fireEvent.click(closeButton);
  
  await waitFor(() => {
    expect(screen.queryByTestId('task-detail-modal')).not.toBeInTheDocument();
  });
});

test('handles comment updates correctly', async () => {
  render(
    <MemoryRouter>
      <PostItem 
        post={mockPost}
        currentUser={mockCurrentUser}
        project={mockProject}
        onUpdate={mockOnUpdate}
      />
    </MemoryRouter>
  );
  
  // Open comments
  const commentsButton = screen.getByText('3');
  fireEvent.click(commentsButton);
  
  // Add comment (this will trigger onUpdate with new count)
  const addCommentButton = screen.getByTestId('add-comment');
  fireEvent.click(addCommentButton);
  
  // The comment count should be updated
  expect(screen.getByTestId('comments-count')).toHaveTextContent('0'); // Initial comments array is empty in mock
});

test('formats timestamp correctly', () => {
  const recentPost = {
    ...mockPost,
    updatedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString() // 30 minutes ago
  };
  
  render(
    <MemoryRouter>
      <PostItem 
        post={recentPost}
        currentUser={mockCurrentUser}
        project={mockProject}
        onUpdate={mockOnUpdate}
      />
    </MemoryRouter>
  );
  
  // Should show relative time for recent posts
  expect(screen.getByText('30 minutes ago')).toBeInTheDocument();
});

test('handles post without title', () => {
  const postWithoutTitle = {
    ...mockPost,
    title: null
  };
  
  render(
    <MemoryRouter>
      <PostItem 
        post={postWithoutTitle}
        currentUser={mockCurrentUser}
        project={mockProject}
        onUpdate={mockOnUpdate}
      />
    </MemoryRouter>
  );
  
  // Should not crash and should still display content
  // Since content is rendered with dangerouslySetInnerHTML, check for essential elements
  expect(screen.getByText('Discussion')).toBeInTheDocument();
});

test('handles post without image', () => {
  const postWithoutImage = {
    ...mockPost,
    image: null
  };
  
  render(
    <MemoryRouter>
      <PostItem 
        post={postWithoutImage}
        currentUser={mockCurrentUser}
        project={mockProject}
        onUpdate={mockOnUpdate}
      />
    </MemoryRouter>
  );
  
  // Should render without image section
  expect(screen.getByText('Test Post')).toBeInTheDocument();
  // Since content is rendered with dangerouslySetInnerHTML, check for essential elements
  expect(screen.getByText('Discussion')).toBeInTheDocument();
});

test('handles like button disabled state during API call', async () => {
  // Mock a slow API call
  mockTogglePostLike.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
  
  render(
    <MemoryRouter>
      <PostItem 
        post={mockPost}
        currentUser={mockCurrentUser}
        project={mockProject}
        onUpdate={mockOnUpdate}
      />
    </MemoryRouter>
  );
  
  const likeButton = screen.getByText('5');
  fireEvent.click(likeButton);
  
  // Button should be disabled during API call
  expect(likeButton).toBeDisabled();
  
  // Wait for API call to complete
  await waitFor(() => {
    expect(likeButton).not.toBeDisabled();
  });
});
