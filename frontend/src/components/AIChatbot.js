import { useState, useEffect, useRef } from 'react';
import { Button, Card, Form, InputGroup, Spinner, Alert } from 'react-bootstrap';
import { useParams } from 'react-router-dom';
import { marked } from 'marked';
import ChatService from '../services/chat.service';
import './AIChatbot.css';

function AIChatbot() {
  const { projectId } = useParams();
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const adjustTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  };

  useEffect(() => {
    adjustTextareaHeight();
  }, [inputMessage]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Initialise with a welcome message
    setMessages([
      {
        id: 1,
        type: 'bot',
        content: 'Hello! I\'m your AI project assistant. I can help you with questions about your project, tasks, team members, and provide general project management advice. What would you like to know?',
        timestamp: new Date()
      }
    ]);
  }, []);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: inputMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);
    setError(null);

    try {
      // Prepare conversation history for the API
      const conversationHistory = messages.map(msg => ({
        role: msg.type === 'user' ? 'user' : 'assistant',
        content: msg.content
      }));

      const response = await ChatService.sendMessage(
        projectId,
        inputMessage,
        conversationHistory
      );

      const botMessage = {
        id: Date.now() + 1,
        type: 'bot',
        content: response.response,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (!isOpen) {
    return (
      <div className="chatbot-toggle">
        <Button
          variant="primary"
          className="rounded-circle chatbot-toggle-btn"
          onClick={() => setIsOpen(true)}
          title="Open AI Assistant"
        >
          🤖
        </Button>
      </div>
    );
  }

  return (
    <div className="chatbot-container">
      <Card className="chatbot-card">
        <Card.Header className="d-flex justify-content-between align-items-center bg-primary text-white">
          <span>🤖 AI Project Assistant</span>
          <Button
            variant="outline-light"
            size="sm"
            onClick={() => setIsOpen(false)}
          >
            ✕
          </Button>
        </Card.Header>
        
        <Card.Body className="chatbot-messages p-0">
          <div className="messages-container">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`message ${message.type === 'user' ? 'user-message' : 'bot-message'}`}
              >
                <div className="message-content">
                  <div className="message-text">
                    {message.type === 'bot' ? (
                      <div dangerouslySetInnerHTML={{ __html: marked(message.content) }} />
                    ) : (
                      message.content
                    )}
                  </div>
                  <div className="message-time">{formatTime(message.timestamp)}</div>
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="message bot-message">
                <div className="message-content">
                  <div className="message-text">
                    <Spinner animation="grow" size="sm" className="me-2" />
                    Thinking...
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </Card.Body>

        {error && (
          <Alert variant="danger" className="m-2 mb-0" dismissible onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Card.Footer className="p-2">
          <InputGroup>
            <Form.Control
              ref={textareaRef}
              as="textarea"
              rows={1}
              placeholder="Ask me about your project..."
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isLoading}
              style={{ 
                resize: 'none',
                overflow: 'hidden',
                minHeight: '38px',
                maxHeight: '120px'
              }}
            />
            <Button
              variant="primary"
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || isLoading}
              style={{ alignSelf: 'flex-end' }}
            >
              {isLoading ? <Spinner animation="border" size="sm" /> : '➤'}
            </Button>
          </InputGroup>
        </Card.Footer>
      </Card>
    </div>
  );
}

export default AIChatbot;
