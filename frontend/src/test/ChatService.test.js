import axios from 'axios';
import ChatService from '../services/chat.service';

// Mock axios
jest.mock('axios');
const mockedAxios = axios;

describe('ChatService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('sendMessage', () => {
    const projectId = 'test-project-123';
    const message = 'Test message';
    const conversationHistory = [
      { role: 'user', content: 'Previous message' },
      { role: 'assistant', content: 'Previous response' }
    ];

    test('should send message successfully', async () => {
      const mockResponse = {
        data: {
          success: true,
          response: 'AI response',
          usage: { total_tokens: 50 }
        }
      };

      mockedAxios.post.mockResolvedValue(mockResponse);

      const result = await ChatService.sendMessage(projectId, message, conversationHistory);

      expect(mockedAxios.post).toHaveBeenCalledWith(
        '/api/chat/test-project-123/message',
        {
          message: 'Test message',
          conversationHistory
        },
        {
          withCredentials: true,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      expect(result).toEqual(mockResponse.data);
    });

    test('should send message with default empty conversation history', async () => {
      const mockResponse = {
        data: {
          success: true,
          response: 'AI response'
        }
      };

      mockedAxios.post.mockResolvedValue(mockResponse);

      await ChatService.sendMessage(projectId, message);

      expect(mockedAxios.post).toHaveBeenCalledWith(
        '/api/chat/test-project-123/message',
        {
          message: 'Test message',
          conversationHistory: []
        },
        expect.any(Object)
      );
    });

    test('should handle authentication error', async () => {
      const mockError = {
        response: {
          status: 401,
          data: { message: 'Unauthorized' }
        }
      };

      mockedAxios.post.mockRejectedValue(mockError);

      await expect(ChatService.sendMessage(projectId, message))
        .rejects.toThrow('Authentication required');
    });

    test('should handle generic API error with message', async () => {
      const mockError = {
        response: {
          status: 500,
          data: { message: 'Internal server error' }
        }
      };

      mockedAxios.post.mockRejectedValue(mockError);

      await expect(ChatService.sendMessage(projectId, message))
        .rejects.toThrow('Internal server error');
    });

    test('should handle generic API error without message', async () => {
      const mockError = {
        response: {
          status: 500,
          data: {}
        }
      };

      mockedAxios.post.mockRejectedValue(mockError);

      await expect(ChatService.sendMessage(projectId, message))
        .rejects.toThrow('Failed to send message');
    });

    test('should handle network error', async () => {
      const mockError = new Error('Network Error');

      mockedAxios.post.mockRejectedValue(mockError);

      await expect(ChatService.sendMessage(projectId, message))
        .rejects.toThrow('Failed to send message');
    });
  });

  describe('getProjectContext', () => {
    const projectId = 'test-project-123';

    test('should get project context successfully', async () => {
      const mockResponse = {
        data: {
          success: true,
          context: 'Project context string',
          projectData: {
            name: 'Test Project',
            memberCount: 5,
            taskCount: 10
          }
        }
      };

      mockedAxios.get.mockResolvedValue(mockResponse);

      const result = await ChatService.getProjectContext(projectId);

      expect(mockedAxios.get).toHaveBeenCalledWith(
        '/api/chat/test-project-123/context',
        {
          withCredentials: true
        }
      );

      expect(result).toEqual(mockResponse.data);
    });

    test('should handle authentication error', async () => {
      const mockError = {
        response: {
          status: 401,
          data: { message: 'Unauthorized' }
        }
      };

      mockedAxios.get.mockRejectedValue(mockError);

      await expect(ChatService.getProjectContext(projectId))
        .rejects.toThrow('Authentication required');
    });

    test('should handle project not found error', async () => {
      const mockError = {
        response: {
          status: 404,
          data: { message: 'Project not found' }
        }
      };

      mockedAxios.get.mockRejectedValue(mockError);

      await expect(ChatService.getProjectContext(projectId))
        .rejects.toThrow('Project not found');
    });

    test('should handle generic error', async () => {
      const mockError = {
        response: {
          status: 500,
          data: {}
        }
      };

      mockedAxios.get.mockRejectedValue(mockError);

      await expect(ChatService.getProjectContext(projectId))
        .rejects.toThrow('Failed to get project context');
    });

    test('should handle network error', async () => {
      const mockError = new Error('Network Error');

      mockedAxios.get.mockRejectedValue(mockError);

      await expect(ChatService.getProjectContext(projectId))
        .rejects.toThrow('Failed to get project context');
    });
  });
});
