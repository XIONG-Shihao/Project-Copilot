import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';

class ChatService {
  // Send a message to the AI chatbot
  async sendMessage(projectId, message, conversationHistory = []) {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/chat/${projectId}/message`,
        {
          message,
          conversationHistory
        },
        {
          withCredentials: true,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
      return response.data;
    } catch (error) {
      if (error.response?.status === 401) {
        throw new Error('Authentication required');
      }
      throw new Error(error.response?.data?.message || 'Failed to send message');
    }
  }

  // Get project context for the chatbot
  async getProjectContext(projectId) {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/chat/${projectId}/context`,
        {
          withCredentials: true
        }
      );
      return response.data;
    } catch (error) {
      if (error.response?.status === 401) {
        throw new Error('Authentication required');
      }
      throw new Error(error.response?.data?.message || 'Failed to get project context');
    }
  }
}

const chatService = new ChatService();
export default chatService;
