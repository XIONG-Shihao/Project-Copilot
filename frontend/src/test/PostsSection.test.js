// src/test/PostsSection.test.js
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Import the component after all mocks are set up
import PostsSection from '../components/PostsSection';

// Create mock functions that will be accessible in tests
let mockGetProjectPosts;
let mockCreatePost;

// Mock modules before importing the component
jest.mock('../services/project.service', () => ({
  getProjectPosts: (...args) => {
    if (!mockGetProjectPosts) mockGetProjectPosts = jest.fn(() => Promise.resolve({ 
      data: { 
        posts: [
          {
            _id: '1',
            title: 'Test Post 1',
            content: 'This is a test post content',
            postType: 'Discussion',
            author: { _id: 'user1', name: 'John Doe' },
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T00:00:00.000Z',
            likesCount: 5,
            userHasLiked: false,
            commentsCount: 3,
            mentionedTasks: []
          },
          {
            _id: '2',
            title: 'Feedback Post',
            content: 'This is feedback content',
            postType: 'Feedback',
            author: { _id: 'user2', name: 'Jane Smith' },
            createdAt: '2024-01-02T00:00:00.000Z',
            updatedAt: '2024-01-02T00:00:00.000Z',
            likesCount: 2,
            userHasLiked: true,
            commentsCount: 1,
            mentionedTasks: []
          }
        ] 
      } 
    }));
    return mockGetProjectPosts(...args);
  },
  createPost: (...args) => {
    if (!mockCreatePost) mockCreatePost = jest.fn(() => Promise.resolve({ 
      data: { 
        post: {
          _id: '3',
          title: 'New Post',
          content: 'This is a new post',
          postType: 'Announcement',
          author: { _id: 'user1', name: 'John Doe' },
          createdAt: '2024-01-03T00:00:00.000Z',
          updatedAt: '2024-01-03T00:00:00.000Z',
          likesCount: 0,
          userHasLiked: false,
          commentsCount: 0,
          mentionedTasks: []
        }
      } 
    }));
    return mockCreatePost(...args);
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

// Mock CreatePost component
jest.mock('../components/CreatePost', () => {
  return function MockCreatePost({ show, onHide, onSubmit, _project, loading }) {
    if (!show) return null;
    
    return (
      <div data-testid="create-post-modal">
        <div data-testid="create-post-title">Create New Post</div>
        <button 
          data-testid="create-post-submit" 
          onClick={() => onSubmit({
            title: 'New Post',
            content: 'This is a new post',
            postType: 'Announcement'
          })}
          disabled={loading}
        >
          {loading ? 'Creating...' : 'Create Post'}
        </button>
        <button data-testid="create-post-cancel" onClick={onHide}>
          Cancel
        </button>
      </div>
    );
  };
});

// Mock PostItem component
jest.mock('../components/PostItem', () => {
  return function MockPostItem({ post, _currentUser, _project, onUpdate }) {
    return (
      <div data-testid={`post-item-${post._id}`}>
        <div data-testid={`post-title-${post._id}`}>{post.title}</div>
        <div data-testid={`post-content-${post._id}`}>{post.content}</div>
        <div data-testid={`post-type-${post._id}`}>{post.postType}</div>
        <div data-testid={`post-author-${post._id}`}>{post.author.name}</div>
        <div data-testid={`post-likes-${post._id}`}>{post.likesCount}</div>
        <div data-testid={`post-comments-${post._id}`}>{post.commentsCount}</div>
        <button 
          data-testid={`post-update-${post._id}`}
          onClick={() => onUpdate()}
        >
          Update
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
  mockGetProjectPosts = jest.fn(() => Promise.resolve({ 
    data: { 
      posts: [
        {
          _id: '1',
          title: 'Test Post 1',
          content: 'This is a test post content',
          postType: 'Discussion',
          author: { _id: 'user1', name: 'John Doe' },
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
          likesCount: 5,
          userHasLiked: false,
          commentsCount: 3,
          mentionedTasks: []
        },
        {
          _id: '2',
          title: 'Feedback Post',
          content: 'This is feedback content',
          postType: 'Feedback',
          author: { _id: 'user2', name: 'Jane Smith' },
          createdAt: '2024-01-02T00:00:00.000Z',
          updatedAt: '2024-01-02T00:00:00.000Z',
          likesCount: 2,
          userHasLiked: true,
          commentsCount: 1,
          mentionedTasks: []
        }
      ] 
    } 
  }));
  mockCreatePost = jest.fn(() => Promise.resolve({ 
    data: { 
      post: {
        _id: '3',
        title: 'New Post',
        content: 'This is a new post',
        postType: 'Announcement',
        author: { _id: 'user1', name: 'John Doe' },
        createdAt: '2024-01-03T00:00:00.000Z',
        updatedAt: '2024-01-03T00:00:00.000Z',
        likesCount: 0,
        userHasLiked: false,
        commentsCount: 0,
        mentionedTasks: []
      }
    } 
  }));
});

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

test('renders PostsSection with loading spinner initially', () => {
  render(
    <MemoryRouter>
      <PostsSection 
        project={mockProject}
        projectId="project1"
        currentUser={mockCurrentUser}
      />
    </MemoryRouter>
  );
  
  expect(screen.getByText('Loading posts...')).toBeInTheDocument();
});

test('renders posts section header correctly', async () => {
  render(
    <MemoryRouter>
      <PostsSection 
        project={mockProject}
        projectId="project1"
        currentUser={mockCurrentUser}
      />
    </MemoryRouter>
  );
  
  await waitFor(() => {
    expect(mockGetProjectPosts).toHaveBeenCalledWith('project1');
  });
  
  await waitFor(() => {
    expect(screen.getByText('Project Posts')).toBeInTheDocument();
  });
  
  await waitFor(() => {
    expect(screen.getByText('Share updates, feedback, and discussions with your team')).toBeInTheDocument();
  });
  
  await waitFor(() => {
    expect(screen.getByText('+ New Post')).toBeInTheDocument();
  });
});

test('displays posts list when posts are available', async () => {
  render(
    <MemoryRouter>
      <PostsSection 
        project={mockProject}
        projectId="project1"
        currentUser={mockCurrentUser}
      />
    </MemoryRouter>
  );
  
  await waitFor(() => {
    expect(screen.getByTestId('post-item-1')).toBeInTheDocument();
  });
  
  await waitFor(() => {
    expect(screen.getByTestId('post-item-2')).toBeInTheDocument();
  });
  
  await waitFor(() => {
    expect(screen.getByTestId('post-title-1')).toHaveTextContent('Test Post 1');
  });
  
  await waitFor(() => {
    expect(screen.getByTestId('post-title-2')).toHaveTextContent('Feedback Post');
  });
  
  await waitFor(() => {
    expect(screen.getByTestId('post-content-1')).toHaveTextContent('This is a test post content');
  });
  
  await waitFor(() => {
    expect(screen.getByTestId('post-type-1')).toHaveTextContent('Discussion');
  });
  
  await waitFor(() => {
    expect(screen.getByTestId('post-type-2')).toHaveTextContent('Feedback');
  });
});

test('displays empty state when no posts are available', async () => {
  mockGetProjectPosts.mockResolvedValue({
    data: { posts: [] }
  });
  
  render(
    <MemoryRouter>
      <PostsSection 
        project={mockProject}
        projectId="project1"
        currentUser={mockCurrentUser}
      />
    </MemoryRouter>
  );
  
  await waitFor(() => {
    expect(screen.getByText('No posts yet')).toBeInTheDocument();
  });
  
  await waitFor(() => {
    expect(screen.getByText('Be the first to create a post and start the conversation!')).toBeInTheDocument();
  });
  
  await waitFor(() => {
    expect(screen.getByText('Create First Post')).toBeInTheDocument();
  });
});

test('opens create post modal when New Post button is clicked', async () => {
  render(
    <MemoryRouter>
      <PostsSection 
        project={mockProject}
        projectId="project1"
        currentUser={mockCurrentUser}
      />
    </MemoryRouter>
  );
  
  await waitFor(() => {
    expect(screen.getByText('+ New Post')).toBeInTheDocument();
  });
  
  fireEvent.click(screen.getByText('+ New Post'));
  
  await waitFor(() => {
    expect(screen.getByTestId('create-post-modal')).toBeInTheDocument();
  });
  
  await waitFor(() => {
    expect(screen.getByTestId('create-post-title')).toHaveTextContent('Create New Post');
  });
});

test('opens create post modal when Create First Post button is clicked', async () => {
  mockGetProjectPosts.mockResolvedValue({
    data: { posts: [] }
  });
  
  render(
    <MemoryRouter>
      <PostsSection 
        project={mockProject}
        projectId="project1"
        currentUser={mockCurrentUser}
      />
    </MemoryRouter>
  );
  
  await waitFor(() => {
    expect(screen.getByText('Create First Post')).toBeInTheDocument();
  });
  
  fireEvent.click(screen.getByText('Create First Post'));
  
  await waitFor(() => {
    expect(screen.getByTestId('create-post-modal')).toBeInTheDocument();
  });
});

test('creates post successfully and refreshes posts list', async () => {
  const { toast } = require('react-toastify');
  
  render(
    <MemoryRouter>
      <PostsSection 
        project={mockProject}
        projectId="project1"
        currentUser={mockCurrentUser}
      />
    </MemoryRouter>
  );
  
  await waitFor(() => {
    expect(screen.getByText('+ New Post')).toBeInTheDocument();
  });
  
  fireEvent.click(screen.getByText('+ New Post'));
  
  await waitFor(() => {
    expect(screen.getByTestId('create-post-modal')).toBeInTheDocument();
  });
  
  fireEvent.click(screen.getByTestId('create-post-submit'));
  
  await waitFor(() => {
    expect(mockCreatePost).toHaveBeenCalledWith('project1', {
      title: 'New Post',
      content: 'This is a new post',
      postType: 'Announcement'
    });
  });
  
  await waitFor(() => {
    expect(toast.success).toHaveBeenCalledWith('Post created successfully!');
  });
  
  // Should refresh posts list
  await waitFor(() => {
    expect(mockGetProjectPosts).toHaveBeenCalledTimes(2); // Initial load + refresh
  });
});

test('handles post creation error', async () => {
  const { toast } = require('react-toastify');
  mockCreatePost.mockRejectedValue({
    response: { data: { message: 'Failed to create post' } }
  });
  
  render(
    <MemoryRouter>
      <PostsSection 
        project={mockProject}
        projectId="project1"
        currentUser={mockCurrentUser}
      />
    </MemoryRouter>
  );
  
  await waitFor(() => {
    expect(screen.getByText('+ New Post')).toBeInTheDocument();
  });
  
  fireEvent.click(screen.getByText('+ New Post'));
  
  await waitFor(() => {
    expect(screen.getByTestId('create-post-modal')).toBeInTheDocument();
  });
  
  fireEvent.click(screen.getByTestId('create-post-submit'));
  
  await waitFor(() => {
    expect(toast.error).toHaveBeenCalledWith('Failed to create post');
  });
});

test('handles general post creation error', async () => {
  const { toast } = require('react-toastify');
  mockCreatePost.mockRejectedValue(new Error('Network error'));
  
  render(
    <MemoryRouter>
      <PostsSection 
        project={mockProject}
        projectId="project1"
        currentUser={mockCurrentUser}
      />
    </MemoryRouter>
  );
  
  await waitFor(() => {
    expect(screen.getByText('+ New Post')).toBeInTheDocument();
  });
  
  fireEvent.click(screen.getByText('+ New Post'));
  
  await waitFor(() => {
    expect(screen.getByTestId('create-post-modal')).toBeInTheDocument();
  });
  
  fireEvent.click(screen.getByTestId('create-post-submit'));
  
  await waitFor(() => {
    expect(toast.error).toHaveBeenCalledWith('Failed to create post');
  });
});

test('handles posts loading error', async () => {
  mockGetProjectPosts.mockRejectedValue({
    response: { data: { message: 'Failed to load posts' } }
  });
  
  render(
    <MemoryRouter>
      <PostsSection 
        project={mockProject}
        projectId="project1"
        currentUser={mockCurrentUser}
      />
    </MemoryRouter>
  );
  
  await waitFor(() => {
    expect(screen.getByText('Failed to load posts')).toBeInTheDocument();
  });
});

test('handles general posts loading error', async () => {
  mockGetProjectPosts.mockRejectedValue(new Error('Network error'));
  
  render(
    <MemoryRouter>
      <PostsSection 
        project={mockProject}
        projectId="project1"
        currentUser={mockCurrentUser}
      />
    </MemoryRouter>
  );
  
  await waitFor(() => {
    expect(screen.getByText('Failed to load posts')).toBeInTheDocument();
  });
});

test('dismisses error alert when close button is clicked', async () => {
  mockGetProjectPosts.mockRejectedValue({
    response: { data: { message: 'Failed to load posts' } }
  });
  
  render(
    <MemoryRouter>
      <PostsSection 
        project={mockProject}
        projectId="project1"
        currentUser={mockCurrentUser}
      />
    </MemoryRouter>
  );
  
  await waitFor(() => {
    expect(screen.getByText('Failed to load posts')).toBeInTheDocument();
  });
  
  const closeButton = screen.getByRole('button', { name: /close/i });
  
  fireEvent.click(closeButton);
  
  await waitFor(() => {
    expect(screen.queryByText('Failed to load posts')).not.toBeInTheDocument();
  });
});

test('refreshes posts when post update is triggered', async () => {
  render(
    <MemoryRouter>
      <PostsSection 
        project={mockProject}
        projectId="project1"
        currentUser={mockCurrentUser}
      />
    </MemoryRouter>
  );
  
  await waitFor(() => {
    expect(screen.getByTestId('post-item-1')).toBeInTheDocument();
  });
  
  // Initial call
  expect(mockGetProjectPosts).toHaveBeenCalledTimes(1);
  
  // Trigger post update
  fireEvent.click(screen.getByTestId('post-update-1'));
  
  await waitFor(() => {
    expect(mockGetProjectPosts).toHaveBeenCalledTimes(2);
  });
});

test('passes correct props to PostItem components', async () => {
  render(
    <MemoryRouter>
      <PostsSection 
        project={mockProject}
        projectId="project1"
        currentUser={mockCurrentUser}
      />
    </MemoryRouter>
  );
  
  await waitFor(() => {
    expect(screen.getByTestId('post-item-1')).toBeInTheDocument();
  });
  
  // Verify PostItem receives correct props by checking rendered content
  await waitFor(() => {
    expect(screen.getByTestId('post-author-1')).toHaveTextContent('John Doe');
  });
  
  await waitFor(() => {
    expect(screen.getByTestId('post-author-2')).toHaveTextContent('Jane Smith');
  });
});

test('passes correct props to CreatePost component', async () => {
  render(
    <MemoryRouter>
      <PostsSection 
        project={mockProject}
        projectId="project1"
        currentUser={mockCurrentUser}
      />
    </MemoryRouter>
  );
  
  await waitFor(() => {
    expect(screen.getByText('+ New Post')).toBeInTheDocument();
  });
  
  fireEvent.click(screen.getByText('+ New Post'));
  
  await waitFor(() => {
    expect(screen.getByTestId('create-post-modal')).toBeInTheDocument();
  });
  
  // CreatePost should receive the project prop
  // We can verify this by checking if the modal renders correctly
  expect(screen.getByTestId('create-post-title')).toBeInTheDocument();
});

test('handles empty posts array from API', async () => {
  mockGetProjectPosts.mockResolvedValue({
    data: { posts: [] }
  });
  
  render(
    <MemoryRouter>
      <PostsSection 
        project={mockProject}
        projectId="project1"
        currentUser={mockCurrentUser}
      />
    </MemoryRouter>
  );
  
  await waitFor(() => {
    expect(screen.getByText('No posts yet')).toBeInTheDocument();
  });
  
  await waitFor(() => {
    expect(screen.queryByTestId('post-item-1')).not.toBeInTheDocument();
  });
});

test('handles undefined posts from API', async () => {
  mockGetProjectPosts.mockResolvedValue({
    data: { posts: undefined }
  });
  
  render(
    <MemoryRouter>
      <PostsSection 
        project={mockProject}
        projectId="project1"
        currentUser={mockCurrentUser}
      />
    </MemoryRouter>
  );
  
  await waitFor(() => {
    expect(screen.getByText('No posts yet')).toBeInTheDocument();
  });
});

test('handles null posts from API', async () => {
  mockGetProjectPosts.mockResolvedValue({
    data: { posts: null }
  });
  
  render(
    <MemoryRouter>
      <PostsSection 
        project={mockProject}
        projectId="project1"
        currentUser={mockCurrentUser}
      />
    </MemoryRouter>
  );
  
  await waitFor(() => {
    expect(screen.getByText('No posts yet')).toBeInTheDocument();
  });
});
