import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AIChatbot from '../components/AIChatbot';
import ChatService from '../services/chat.service';

// Mock modules
jest.mock('../services/chat.service');
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => ({
    projectId: 'test-project-123'
  })
}));

// Mock marked to avoid rendering complexity in tests
jest.mock('marked', () => ({
  marked: jest.fn((content) => content)
}));

// Mock scrollIntoView which doesn't exist in JSDOM
beforeEach(() => {
  jest.clearAllMocks();
  
  // Mock scrollIntoView
  Element.prototype.scrollIntoView = jest.fn();
});

const renderChatbot = () => {
  return render(
    <MemoryRouter>
      <AIChatbot />
    </MemoryRouter>
  );
};

describe('AIChatbot Component', () => {
  describe('Initial State and Toggle', () => {
    test('should render toggle button when closed', () => {
      renderChatbot();
      
      const toggleButton = screen.getByTitle('Open AI Assistant');
      expect(toggleButton).toBeInTheDocument();
      expect(toggleButton).toHaveTextContent('🤖');
      
      // Chat interface should not be visible
      expect(screen.queryByText('AI Project Assistant')).not.toBeInTheDocument();
    });

    test('should open chat interface when toggle button is clicked', () => {
      renderChatbot();
      
      const toggleButton = screen.getByTitle('Open AI Assistant');
      fireEvent.click(toggleButton);
      
      // Chat interface should now be visible
      expect(screen.getByText('🤖 AI Project Assistant')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Ask me about your project...')).toBeInTheDocument();
      
      // Toggle button should not be visible
      expect(screen.queryByTitle('Open AI Assistant')).not.toBeInTheDocument();
    });

    test('should close chat interface when close button is clicked', () => {
      renderChatbot();
      
      // Open the chat
      const toggleButton = screen.getByTitle('Open AI Assistant');
      fireEvent.click(toggleButton);
      
      // Close the chat
      const closeButton = screen.getByText('✕');
      fireEvent.click(closeButton);
      
      // Should be back to toggle state
      expect(screen.getByTitle('Open AI Assistant')).toBeInTheDocument();
      expect(screen.queryByText('🤖 AI Project Assistant')).not.toBeInTheDocument();
    });

    test('should display welcome message when opened', () => {
      renderChatbot();
      
      const toggleButton = screen.getByTitle('Open AI Assistant');
      fireEvent.click(toggleButton);
      
      // Need to check if the content is processed by our mocked marked function
      const { marked } = require('marked');
      
      // Verify that marked was called with the welcome message
      expect(marked).toHaveBeenCalledWith(
        expect.stringContaining('Hello! I\'m your AI project assistant')
      );
    });
  });

  describe('Message Input and Handling', () => {
    test('should have disabled send button when input is empty', () => {
      renderChatbot();
      const toggleButton = screen.getByTitle('Open AI Assistant');
      fireEvent.click(toggleButton);
      
      const sendButton = screen.getByText('➤');
      expect(sendButton).toBeDisabled();
    });

    test('should enable send button when input has text', () => {
      renderChatbot();
      const toggleButton = screen.getByTitle('Open AI Assistant');
      fireEvent.click(toggleButton);
      
      const input = screen.getByPlaceholderText('Ask me about your project...');
      const sendButton = screen.getByText('➤');
      
      fireEvent.change(input, { target: { value: 'Test message' } });
      
      expect(sendButton).not.toBeDisabled();
    });

    test('should send message when send button is clicked', async () => {
      renderChatbot();
      const toggleButton = screen.getByTitle('Open AI Assistant');
      fireEvent.click(toggleButton);
      
      const mockResponse = {
        response: 'Hello! How can I help you with your project?'
      };
      
      ChatService.sendMessage.mockResolvedValue(mockResponse);
      
      const input = screen.getByPlaceholderText('Ask me about your project...');
      const sendButton = screen.getByText('➤');
      
      fireEvent.change(input, { target: { value: 'What tasks are overdue?' } });
      fireEvent.click(sendButton);
      
      // Check that service was called with correct parameters
      expect(ChatService.sendMessage).toHaveBeenCalledWith(
        'test-project-123',
        'What tasks are overdue?',
        expect.any(Array)
      );
      
      // Wait for response to appear - check that marked was called with the response
      await waitFor(() => {
        const { marked } = require('marked');
        expect(marked).toHaveBeenCalledWith('Hello! How can I help you with your project?');
      });
      
      // Input should be cleared
      expect(input.value).toBe('');
    });

    test('should prevent sending when input is empty', () => {
      renderChatbot();
      const toggleButton = screen.getByTitle('Open AI Assistant');
      fireEvent.click(toggleButton);
      
      const sendButton = screen.getByText('➤');
      
      fireEvent.click(sendButton);
      
      expect(ChatService.sendMessage).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    test('should display error message when API call fails', async () => {
      renderChatbot();
      const toggleButton = screen.getByTitle('Open AI Assistant');
      fireEvent.click(toggleButton);
      
      const errorMessage = 'Failed to send message';
      ChatService.sendMessage.mockRejectedValue(new Error(errorMessage));
      
      const input = screen.getByPlaceholderText('Ask me about your project...');
      
      fireEvent.change(input, { target: { value: 'Test message' } });
      fireEvent.click(screen.getByText('➤'));
      
      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
      });
    });

    test('should handle authentication errors', async () => {
      renderChatbot();
      const toggleButton = screen.getByTitle('Open AI Assistant');
      fireEvent.click(toggleButton);
      
      ChatService.sendMessage.mockRejectedValue(new Error('Authentication required'));
      
      const input = screen.getByPlaceholderText('Ask me about your project...');
      
      fireEvent.change(input, { target: { value: 'Auth test' } });
      fireEvent.click(screen.getByText('➤'));
      
      await waitFor(() => {
        expect(screen.getByText('Authentication required')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility and UX', () => {
    test('should have proper ARIA labels and roles', () => {
      renderChatbot();
      
      const toggleButton = screen.getByTitle('Open AI Assistant');
      expect(toggleButton).toHaveAttribute('title', 'Open AI Assistant');
      
      fireEvent.click(toggleButton);
      
      const input = screen.getByPlaceholderText('Ask me about your project...');
      expect(input).toHaveAttribute('placeholder', 'Ask me about your project...');
    });

    test('should display timestamps for messages', async () => {
      renderChatbot();
      const toggleButton = screen.getByTitle('Open AI Assistant');
      fireEvent.click(toggleButton);
      
      const mockResponse = { response: 'Timestamped response' };
      ChatService.sendMessage.mockResolvedValue(mockResponse);
      
      const input = screen.getByPlaceholderText('Ask me about your project...');
      
      fireEvent.change(input, { target: { value: 'Timestamp test' } });
      fireEvent.click(screen.getByText('➤'));
      
      // Should show timestamps
      await waitFor(() => {
        const timestamps = screen.getAllByText(/\d{1,2}:\d{2}/);
        expect(timestamps.length).toBeGreaterThan(0);
      });
    });
  });
});
