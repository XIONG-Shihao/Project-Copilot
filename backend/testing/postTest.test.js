const request = require('supertest');
const app = require('../app');
const mockingoose = require('mockingoose');
const Post = require('../models/post');
const Comment = require('../models/comment');
const Like = require('../models/like');
const Project = require('../models/project');
const jwt = require('jsonwebtoken');

/**
 * @fileoverview Jest tests for post system including posts, comments, and likes.
 */

const mockUserId = '507f1f77bcf86cd799439011';
const mockUserId2 = '507f1f77bcf86cd799439014';
const mockProjectId = '507f1f77bcf86cd799439012';
const mockPostId = '507f1f77bcf86cd799439013';
const mockCommentId = '507f1f77bcf86cd799439015';

// Helper function to create mock JWT token
const createMockToken = (userId = mockUserId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET || 'testsecret');
};

describe('Post System Tests', () => {
  beforeEach(() => {
    mockingoose.resetAll();
    jest.clearAllMocks();
  });

  describe('POST /api/posts/project/:projectId/posts - Create Post', () => {


    test('should return 404 if project not found', async () => {
      mockingoose(Project).toReturn(null, 'findOne');

      const newPost = {
        title: 'Test Post',
        content: 'Test content',
        postType: 'Discussion'
      };

      const token = createMockToken();
      const response = await request(app)
        .post(`/api/posts/project/${mockProjectId}/posts`)
        .set('Cookie', `token=${token}`)
        .send(newPost);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Project not found');
    });

    test('should require authentication', async () => {
      const newPost = {
        title: 'Test Post',
        content: 'Test content',
        postType: 'Discussion'
      };

      const response = await request(app)
        .post(`/api/posts/project/${mockProjectId}/posts`)
        .send(newPost);

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/posts/project/:projectId/posts - Get Project Posts', () => {
    test('should get all posts for a project', async () => {
      const mockPosts = [
        {
          _id: mockPostId,
          title: 'Test Post',
          content: 'Test content',
          author: { _id: mockUserId, name: 'Test User' },
          project: mockProjectId,
          mentionedTasks: [],
          toObject: () => ({
            _id: mockPostId,
            title: 'Test Post',
            content: 'Test content',
            author: { _id: mockUserId, name: 'Test User' },
            project: mockProjectId,
            mentionedTasks: []
          })
        }
      ];

      // Mock Like static methods
      Like.getLikeCount = jest.fn().mockResolvedValue(0);
      Like.hasUserLiked = jest.fn().mockResolvedValue(false);

      mockingoose(Post).toReturn(mockPosts, 'find');
      mockingoose(Comment).toReturn(2, 'countDocuments');

      const token = createMockToken();
      const response = await request(app)
        .get(`/api/posts/project/${mockProjectId}/posts`)
        .set('Cookie', `token=${token}`);

      expect(response.status).toBe(200);
      expect(response.body.posts).toBeDefined();
      expect(response.body.posts).toHaveLength(1);
      expect(response.body.posts[0].likesCount).toBe(0);
      expect(response.body.posts[0].commentsCount).toBe(2);
      expect(response.body.posts[0].userHasLiked).toBe(false);
    });

    test('should require authentication', async () => {
      const response = await request(app)
        .get(`/api/posts/project/${mockProjectId}/posts`);

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/posts/posts/:postId - Get Single Post', () => {
    test('should get a specific post with comments', async () => {
      const mockPost = {
        _id: mockPostId,
        title: 'Test Post',
        content: 'Test content',
        author: { _id: mockUserId, name: 'Test User' },
        project: mockProjectId,
        mentionedTasks: []
      };

      const mockComments = [
        {
          _id: mockCommentId,
          content: 'Test comment',
          author: { _id: mockUserId, name: 'Test User' },
          post: mockPostId
        }
      ];

      mockingoose(Post).toReturn(mockPost, 'findOne');
      mockingoose(Comment).toReturn(mockComments, 'find');

      const token = createMockToken();
      const response = await request(app)
        .get(`/api/posts/posts/${mockPostId}`)
        .set('Cookie', `token=${token}`);

      expect(response.status).toBe(200);
      expect(response.body.post).toBeDefined();
      expect(response.body.comments).toBeDefined();
      expect(response.body.comments).toHaveLength(1);
    });

    test('should return 404 if post not found', async () => {
      mockingoose(Post).toReturn(null, 'findOne');

      const token = createMockToken();
      const response = await request(app)
        .get(`/api/posts/posts/${mockPostId}`)
        .set('Cookie', `token=${token}`);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Post not found');
    });
  });

  describe('PUT /api/posts/posts/:postId - Update Post', () => {


    test('should return 403 if user is not the author', async () => {
      const mockPost = {
        _id: mockPostId,
        author: mockUserId2, // Different user
        project: mockProjectId
      };

      mockingoose(Post).toReturn(mockPost, 'findOne');

      const updateData = {
        title: 'Updated Title'
      };

      const token = createMockToken(); // Token for mockUserId
      const response = await request(app)
        .put(`/api/posts/posts/${mockPostId}`)
        .set('Cookie', `token=${token}`)
        .send(updateData);

      expect(response.status).toBe(403);
      expect(response.body.message).toBe('Not authorized to edit this post');
    });
  });

  describe('DELETE /api/posts/posts/:postId - Delete Post', () => {
    test('should delete post successfully by author', async () => {
      const mockPost = {
        _id: mockPostId,
        author: mockUserId,
        project: mockProjectId
      };

      mockingoose(Post).toReturn(mockPost, 'findOne');
      mockingoose(Comment).toReturn({}, 'deleteMany');
      mockingoose(Like).toReturn({}, 'deleteMany');
      mockingoose(Post).toReturn(mockPost, 'findOneAndDelete');

      const token = createMockToken();
      const response = await request(app)
        .delete(`/api/posts/posts/${mockPostId}`)
        .set('Cookie', `token=${token}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Post deleted successfully');
    });

    test('should return 403 if user is not the author', async () => {
      const mockPost = {
        _id: mockPostId,
        author: mockUserId2, // Different user
        project: mockProjectId
      };

      mockingoose(Post).toReturn(mockPost, 'findOne');

      const token = createMockToken(); // Token for mockUserId
      const response = await request(app)
        .delete(`/api/posts/posts/${mockPostId}`)
        .set('Cookie', `token=${token}`);

      expect(response.status).toBe(403);
      expect(response.body.message).toBe('Not authorized to delete this post');
    });

    test('should return 404 if post not found', async () => {
      mockingoose(Post).toReturn(null, 'findOne');

      const token = createMockToken();
      const response = await request(app)
        .delete(`/api/posts/posts/${mockPostId}`)
        .set('Cookie', `token=${token}`);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Post not found');
    });
  });

  describe('POST /api/posts/posts/:postId/like - Toggle Post Like', () => {
    test('should like a post successfully', async () => {
      const mockPost = {
        _id: mockPostId,
        project: mockProjectId
      };

      // Mock Like static methods
      Like.toggleLike = jest.fn().mockResolvedValue({
        action: 'liked',
        like: {
          _id: 'like-id',
          user: mockUserId,
          targetType: 'Post',
          targetId: mockPostId
        }
      });
      Like.getLikeCount = jest.fn().mockResolvedValue(1);
      Like.hasUserLiked = jest.fn().mockResolvedValue(true);

      mockingoose(Post).toReturn(mockPost, 'findOne');

      const token = createMockToken();
      const response = await request(app)
        .post(`/api/posts/posts/${mockPostId}/like`)
        .set('Cookie', `token=${token}`);

      expect(response.status).toBe(200);
      expect(response.body.action).toBe('liked');
      expect(response.body.likesCount).toBe(1);
      expect(response.body.userHasLiked).toBe(true);
    });

    test('should unlike a post successfully', async () => {
      const mockPost = {
        _id: mockPostId,
        project: mockProjectId
      };

      // Mock Like static methods
      Like.toggleLike = jest.fn().mockResolvedValue({
        action: 'unliked',
        like: null
      });
      Like.getLikeCount = jest.fn().mockResolvedValue(0);
      Like.hasUserLiked = jest.fn().mockResolvedValue(false);

      mockingoose(Post).toReturn(mockPost, 'findOne');

      const token = createMockToken();
      const response = await request(app)
        .post(`/api/posts/posts/${mockPostId}/like`)
        .set('Cookie', `token=${token}`);

      expect(response.status).toBe(200);
      expect(response.body.action).toBe('unliked');
      expect(response.body.likesCount).toBe(0);
      expect(response.body.userHasLiked).toBe(false);
    });

    test('should return 404 if post not found', async () => {
      mockingoose(Post).toReturn(null, 'findOne');

      const token = createMockToken();
      const response = await request(app)
        .post(`/api/posts/posts/${mockPostId}/like`)
        .set('Cookie', `token=${token}`);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Post not found');
    });
  });

  describe('POST /api/posts/posts/:postId/comments - Create Comment', () => {


    test('should return 404 if post not found', async () => {
      mockingoose(Post).toReturn(null, 'findOne');

      const newComment = {
        content: 'This is a test comment'
      };

      const token = createMockToken();
      const response = await request(app)
        .post(`/api/posts/posts/${mockPostId}/comments`)
        .set('Cookie', `token=${token}`)
        .send(newComment);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Post not found');
    });
  });

  describe('DELETE /api/posts/comments/:commentId - Delete Comment', () => {
    test('should delete comment successfully by author', async () => {
      const mockComment = {
        _id: mockCommentId,
        author: mockUserId,
        post: mockPostId
      };

      mockingoose(Comment).toReturn(mockComment, 'findOne');
      mockingoose(Comment).toReturn({}, 'deleteMany'); // Delete replies
      mockingoose(Like).toReturn({}, 'deleteMany'); // Delete likes
      mockingoose(Comment).toReturn(mockComment, 'findOneAndDelete');

      const token = createMockToken();
      const response = await request(app)
        .delete(`/api/posts/comments/${mockCommentId}`)
        .set('Cookie', `token=${token}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Comment deleted successfully');
    });

    test('should return 403 if user is not the author', async () => {
      const mockComment = {
        _id: mockCommentId,
        author: mockUserId2, // Different user
        post: mockPostId
      };

      mockingoose(Comment).toReturn(mockComment, 'findOne');

      const token = createMockToken(); // Token for mockUserId
      const response = await request(app)
        .delete(`/api/posts/comments/${mockCommentId}`)
        .set('Cookie', `token=${token}`);

      expect(response.status).toBe(403);
      expect(response.body.message).toBe('Not authorized to delete this comment');
    });

    test('should return 404 if comment not found', async () => {
      mockingoose(Comment).toReturn(null, 'findOne');

      const token = createMockToken();
      const response = await request(app)
        .delete(`/api/posts/comments/${mockCommentId}`)
        .set('Cookie', `token=${token}`);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Comment not found');
    });
  });

  describe('Post Validation Tests', () => {
    test('should validate required fields when creating post', async () => {
      const mockProject = {
        _id: mockProjectId,
        projectTasks: []
      };
      mockingoose(Project).toReturn(mockProject, 'findOne');

      const invalidPost = {
        content: 'Missing title',
        postType: 'Discussion'
      };

      const token = createMockToken();
      const response = await request(app)
        .post(`/api/posts/project/${mockProjectId}/posts`)
        .set('Cookie', `token=${token}`)
        .send(invalidPost);

      expect(response.status).toBe(500); // Server error due to missing required field
    });

    test('should validate postType enum values', async () => {
      const mockProject = {
        _id: mockProjectId,
        projectTasks: []
      };
      mockingoose(Project).toReturn(mockProject, 'findOne');

      const invalidPost = {
        title: 'Test Post',
        content: 'Test content',
        postType: 'InvalidType' // Invalid enum value
      };

      const token = createMockToken();
      const response = await request(app)
        .post(`/api/posts/project/${mockProjectId}/posts`)
        .set('Cookie', `token=${token}`)
        .send(invalidPost);

      expect(response.status).toBe(500); // Server error due to invalid enum
    });
  });
});