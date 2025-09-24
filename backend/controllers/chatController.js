/**
 * @fileoverview Chat controller module for handling AI chatbot interactions
 * @module controllers/chatController
 */

const aiChatService = require('../services/aiChatService');

/**
 * Sends a message to the AI chatbot and returns the response
 * @async
 * @function sendMessage
 * @param {Object} req - Express request object
 * @param {Object} req.params - URL parameters
 * @param {string} req.params.projectId - ID of the project for context
 * @param {Object} req.body - Request body
 * @param {string} req.body.message - User message to send to AI
 * @param {Array<Object>} [req.body.conversationHistory] - Previous conversation messages for context
 * @param {Object} res - Express response object
 * @returns {Promise<void>} JSON response with AI response and usage information
 * @throws {400} When message is empty or conversation history format is invalid
 * @throws {500} When AI service fails or internal server error occurs
 * @description Processes user messages through AI service with project context and conversation history
 */
async function sendMessage(req, res) {
  try {
    const { projectId } = req.params;
    const { message, conversationHistory } = req.body;

    if (!message || message.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Message content is required'
      });
    }

    // Validate conversation history format if provided
    if (conversationHistory && !Array.isArray(conversationHistory)) {
      return res.status(400).json({
        success: false,
        message: 'Conversation history must be an array'
      });
    }

    // Send message to AI service
    const response = await aiChatService.sendMessage(
      projectId, 
      message, 
      conversationHistory || []
    );

    res.json({
      success: true,
      response: response.message,
      usage: response.usage
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to process chat message'
    });
  }
}

/**
 * Retrieves and formats project context information for AI chatbot
 * @async
 * @function getProjectContext
 * @param {Object} req - Express request object
 * @param {Object} req.params - URL parameters
 * @param {string} req.params.projectId - ID of the project to get context for
 * @param {Object} res - Express response object
 * @returns {Promise<void>} JSON response with formatted project context and summary data
 * @throws {500} When project context retrieval fails or internal server error occurs
 * @description Fetches comprehensive project information including tasks, members, and description for AI context
 */
async function getProjectContext(req, res) {
  try {
    const { projectId } = req.params;

    const projectContext = await aiChatService.getProjectContext(projectId);
    const contextSummary = aiChatService.formatProjectContextForAI(projectContext);

    res.json({
      success: true,
      context: contextSummary,
      projectData: {
        name: projectContext.projectName,
        description: projectContext.projectDescription,
        memberCount: projectContext.members ? projectContext.members.length : 0,
        taskCount: projectContext.tasks ? projectContext.tasks.length : 0
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get project context'
    });
  }
}

module.exports = {
  sendMessage,
  getProjectContext
};
