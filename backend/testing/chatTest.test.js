const request = require('supertest');
const app = require('../app');
const mockingoose = require('mockingoose');
const Project = require('../models/project');
const jwt = require('jsonwebtoken');
const aiChatService = require('../services/aiChatService');

/**
 * @fileoverview Jest tests for chat functionality and AI chatbot service.
 */

// Mock the AI service to avoid external API calls
jest.mock('../services/aiChatService', () => ({
  sendMessage: jest.fn(),
  getProjectContext: jest.fn(),
  formatProjectContextForAI: jest.fn(),
}));

beforeEach(() => {
  mockingoose.resetAll();
  jest.clearAllMocks();
});

// Helper function to create a valid JWT token
function createValidToken(userId = '507f1f77bcf86cd799439011') {
  return jwt.sign({ userId }, process.env.JWT_SECRET || 'test_secret', {
    expiresIn: '1h',
  });
}

describe('Chat API Endpoints', () => {
  const projectId = '507f1f77bcf86cd799439012';
  const userId = '507f1f77bcf86cd799439011';
  const validToken = createValidToken(userId);

  describe('POST /api/chat/:projectId/message', () => {
    test('should send message successfully with valid input', async () => {
      const mockResponse = {
        success: true,
        message: 'Hello! I can help you with your project.',
        usage: { total_tokens: 50 },
      };

      aiChatService.sendMessage.mockResolvedValue(mockResponse);

      const res = await request(app)
        .post(`/api/chat/${projectId}/message`)
        .set('Cookie', `token=${validToken}`)
        .send({
          message: 'Hello, can you help me?',
          conversationHistory: [
            { role: 'user', content: 'Previous message' },
            { role: 'assistant', content: 'Previous response' },
          ],
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.response).toBe(mockResponse.message);
      expect(res.body.usage).toEqual(mockResponse.usage);
      expect(aiChatService.sendMessage).toHaveBeenCalledWith(
        projectId,
        'Hello, can you help me?',
        [
          { role: 'user', content: 'Previous message' },
          { role: 'assistant', content: 'Previous response' },
        ]
      );
    });

    test('should reject empty message', async () => {
      const res = await request(app)
        .post(`/api/chat/${projectId}/message`)
        .set('Cookie', `token=${validToken}`)
        .send({
          message: '',
          conversationHistory: [],
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Message content is required');
    });

    test('should reject whitespace-only message', async () => {
      const res = await request(app)
        .post(`/api/chat/${projectId}/message`)
        .set('Cookie', `token=${validToken}`)
        .send({
          message: '   \n\t  ',
          conversationHistory: [],
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Message content is required');
    });

    test('should reject invalid conversation history format', async () => {
      const res = await request(app)
        .post(`/api/chat/${projectId}/message`)
        .set('Cookie', `token=${validToken}`)
        .send({
          message: 'Valid message',
          conversationHistory: 'invalid format',
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Conversation history must be an array');
    });

    test('should work without conversation history', async () => {
      const mockResponse = {
        success: true,
        message: 'First message response',
        usage: { total_tokens: 30 },
      };

      aiChatService.sendMessage.mockResolvedValue(mockResponse);

      const res = await request(app)
        .post(`/api/chat/${projectId}/message`)
        .set('Cookie', `token=${validToken}`)
        .send({
          message: 'First message',
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(aiChatService.sendMessage).toHaveBeenCalledWith(
        projectId,
        'First message',
        []
      );
    });

    test('should handle AI service errors', async () => {
      aiChatService.sendMessage.mockRejectedValue(
        new Error('AI service unavailable')
      );

      const res = await request(app)
        .post(`/api/chat/${projectId}/message`)
        .set('Cookie', `token=${validToken}`)
        .send({
          message: 'Test message',
        });

      expect(res.statusCode).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('AI service unavailable');
    });

    test('should require authentication', async () => {
      const res = await request(app)
        .post(`/api/chat/${projectId}/message`)
        .send({
          message: 'Test message',
        });

      expect(res.statusCode).toBe(401);
    });
  });

  describe('GET /api/chat/:projectId/context', () => {
    test('should get project context successfully', async () => {
      const mockProjectContext = {
        projectName: 'Test Project',
        projectDescription: 'A test project',
        owner: { name: 'John Doe' },
        members: [
          { user: { name: 'Alice' }, role: { roleName: 'Developer' } },
          { user: { name: 'Bob' }, role: { roleName: 'Designer' } },
        ],
        tasks: [
          { taskName: 'Task 1', taskDescription: 'First task' },
          { taskName: 'Task 2', taskDescription: 'Second task' },
        ],
      };

      const mockFormattedContext =
        'Project: Test Project\nDescription: A test project\n...';

      aiChatService.getProjectContext.mockResolvedValue(mockProjectContext);
      aiChatService.formatProjectContextForAI.mockReturnValue(
        mockFormattedContext
      );

      const res = await request(app)
        .get(`/api/chat/${projectId}/context`)
        .set('Cookie', `token=${validToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.context).toBe(mockFormattedContext);
      expect(res.body.projectData).toEqual({
        name: 'Test Project',
        description: 'A test project',
        memberCount: 2,
        taskCount: 2,
      });
    });

    test('should handle missing project', async () => {
      aiChatService.getProjectContext.mockRejectedValue(
        new Error('Project not found')
      );

      const res = await request(app)
        .get(`/api/chat/${projectId}/context`)
        .set('Cookie', `token=${validToken}`);

      expect(res.statusCode).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Project not found');
    });

    test('should require authentication', async () => {
      const res = await request(app).get(`/api/chat/${projectId}/context`);

      expect(res.statusCode).toBe(401);
    });
  });
});

describe('AI Chat Service Unit Tests', () => {
  // Temporarily unmock for unit tests
  beforeAll(() => {
    jest.unmock('../services/aiChatService');
  });

  afterAll(() => {
    jest.clearAllMocks();
  });

  describe('formatProjectContextForAI', () => {
    test('should format project context correctly', () => {
      // Re-require to get unmocked version
      const realAiChatService = require('../services/aiChatService');

      const projectContext = {
        projectName: 'Test Project',
        projectDescription: 'A sample project',
        owner: { name: 'John Doe' },
        members: [
          { user: { name: 'Alice Smith' }, role: { roleName: 'Developer' } },
          { user: { name: 'Bob Johnson' }, role: { roleName: 'Designer' } },
          { user: { name: 'Charlie Brown' }, role: { roleName: 'viewer' } }, // Should be excluded
        ],
        tasks: [
          {
            taskName: 'Setup Environment',
            taskDescription: 'Set up development environment',
            taskProgress: 'In Progress',
            taskAssignee: { name: 'Alice Smith' },
            taskDeadline: new Date('2025-08-15'),
          },
          {
            taskName: 'Design UI',
            taskDescription: null,
            taskProgress: 'To Do',
            taskAssignee: null,
            taskDeadline: null,
          },
        ],
      };

      const formatted =
        realAiChatService.formatProjectContextForAI(projectContext);

      expect(formatted).toContain('Project: Test Project');
      expect(formatted).toContain('Description: A sample project');
      expect(formatted).toContain('Owner: John Doe');
      expect(formatted).toContain('- Alice Smith - Role: Developer');
      expect(formatted).toContain('- Bob Johnson - Role: Designer');
      expect(formatted).not.toContain('Charlie Brown'); // Viewer should be excluded
      expect(formatted).toContain(
        '- Setup Environment: Set up development environment'
      );
      expect(formatted).toContain('Status: In Progress');
      expect(formatted).toContain('Assigned to: Alice Smith');
      expect(formatted).toContain('Due: 15 August 2025');
      expect(formatted).toContain('- Design UI: No description');
      expect(formatted).toContain('Assigned to: Not assigned');
    });

    test('should handle empty members and tasks', () => {
      const realAiChatService = require('../services/aiChatService');

      const projectContext = {
        projectName: 'Empty Project',
        projectDescription: 'Project with no members or tasks',
        owner: { name: 'Solo Owner' },
        members: [],
        tasks: [],
      };

      const formatted =
        realAiChatService.formatProjectContextForAI(projectContext);

      expect(formatted).toContain('Project: Empty Project');
      expect(formatted).toContain('Owner: Solo Owner');
      expect(formatted).not.toContain('Team Members:');
      expect(formatted).not.toContain('Tasks:');
    });

    test('should handle missing role information', () => {
      const realAiChatService = require('../services/aiChatService');

      const projectContext = {
        projectName: 'Test Project',
        projectDescription: 'Test description',
        owner: { name: 'Owner' },
        members: [
          { user: { name: 'Member1' }, role: null },
          { user: { name: 'Member2' }, role: { roleName: null } },
        ],
        tasks: [],
      };

      const formatted =
        realAiChatService.formatProjectContextForAI(projectContext);

      expect(formatted).toContain('- Member1 - Role: No role assigned');
      expect(formatted).toContain('- Member2 - Role: No role assigned');
    });
  });

  describe('getProjectContext', () => {
    test('should handle project not found', async () => {
      const realAiChatService = require('../services/aiChatService');

      mockingoose(Project).toReturn(null, 'findById');

      await expect(
        realAiChatService.getProjectContext('nonexistent')
      ).rejects.toThrow('Project not found');
    });
  });

  describe('AI Chat Service - sendMessage() missing tests (isolated)', () => {
    const projectId = '507f1f77bcf86cd799439012';

    /**
     * Helper to build a fresh, isolated instance of aiChatService
     * with axios + models mocked for each test.
     */
    function loadIsolatedService({ axiosBehavior }) {
      jest.resetModules();

      // 1) Mock axios first
      jest.doMock('axios', () => ({
        post: jest.fn(axiosBehavior),
      }));

      // 2) Mock models that aiChatService requires
      // lightweight stubs; we won’t actually hit DB in these tests
      jest.doMock('../models/project', () => ({
        findById: jest.fn(),
      }));
      jest.doMock('../models/tasks', () => ({
        find: jest.fn(),
      }));

      let svc, axios;
      jest.isolateModules(() => {
        // require AFTER mocks so aiChatService wires to mocked deps
        svc = require('../services/aiChatService');
        axios = require('axios');
      });

      // stub out getProjectContext + formatter so sendMessage can run without DB
      jest.spyOn(svc, 'getProjectContext').mockResolvedValue({
        projectName: 'X',
        projectDescription: 'Y',
        owner: { name: 'Owner' },
        members: [],
        tasks: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      jest
        .spyOn(svc, 'formatProjectContextForAI')
        .mockReturnValue('formatted context');

      return { svc, axios };
    }

    afterEach(() => {
      jest.clearAllMocks();
      jest.resetModules();
    });

    test('strips <think> tags from model response', async () => {
      const { svc } = loadIsolatedService({
        axiosBehavior: () =>
          Promise.resolve({
            data: {
              choices: [
                {
                  message: {
                    content:
                      '<think>\ninternal chain of thought\n</think>\nHello! Here is the visible answer.',
                  },
                },
              ],
              usage: { total_tokens: 123 },
            },
          }),
      });

      const result = await svc.sendMessage(projectId, 'Hi', []);
      expect(result.success).toBe(true);
      expect(result.message).toBe('Hello! Here is the visible answer.');
      expect(result.usage).toEqual({ total_tokens: 123 });
    });

    test('maps 401 from provider to "AI service authentication failed"', async () => {
      const { svc } = loadIsolatedService({
        axiosBehavior: () => Promise.reject({ response: { status: 401 } }),
      });

      await expect(svc.sendMessage(projectId, 'Hi', [])).rejects.toThrow(
        'AI service authentication failed'
      );
    });

    test('maps 429 from provider to rate-limit message', async () => {
      const { svc } = loadIsolatedService({
        axiosBehavior: () => Promise.reject({ response: { status: 429 } }),
      });

      await expect(svc.sendMessage(projectId, 'Hi', [])).rejects.toThrow(
        'AI service rate limit exceeded. Please try again later.'
      );
    });

    test('maps 5xx from provider to "temporarily unavailable"', async () => {
      const { svc } = loadIsolatedService({
        axiosBehavior: () => Promise.reject({ response: { status: 503 } }),
      });

      await expect(svc.sendMessage(projectId, 'Hi', [])).rejects.toThrow(
        'AI service is temporarily unavailable'
      );
    });

    test('maps generic error (no response) to "Failed to get AI response"', async () => {
      const { svc } = loadIsolatedService({
        axiosBehavior: () => Promise.reject(new Error('socket hang up')),
      });

      await expect(svc.sendMessage(projectId, 'Hi', [])).rejects.toThrow(
        'Failed to get AI response'
      );
    });
  });
});
