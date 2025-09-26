/**
 * @fileoverview AI Chat service module for handling project-aware AI conversations
 * @module services/aiChatService
 */

const axios = require('axios');
const Project = require('../models/project');
const Task = require('../models/tasks');

/**
 * Service class for managing AI chatbot interactions with project context
 * @class AIChatService
 * @description Handles communication with external AI service and project context formatting
 */
class AIChatService {
  /**
   * Initializes AIChatService with environment configuration
   * @constructor
   * @description Sets up API credentials and endpoints from environment variables
   */
  constructor() {
    this.apiKey = process.env.GROQ_API_KEY;
    this.baseURL = process.env.GROQ_BASE_URL;
    this.model = process.env.GROQ_MODEL;
  }

  /**
   * Retrieves comprehensive project information for AI context
   * @async
   * @method getProjectContext
   * @param {string} projectId - ID of the project to get context for
   * @returns {Promise<Object>} Object containing project details, members, and tasks
   * @throws {Error} When project is not found
   * @description Fetches and populates project data including owner, members, roles, and tasks
   */
  async getProjectContext(projectId) {
    // Fetch project details with populated references
    const project = await Project.findById(projectId)
      .populate('projectOwner', 'name')
      .populate({
        path: 'projectMembers',
        populate: [
          {
            path: 'user',
            select: 'name'
          },
          {
            path: 'role',
            select: 'roleName'
          }
        ]
      })
      .populate('projectTasks');

    if (!project) {
      throw new Error('Project not found');
    }

    // Get all tasks for the project
    const tasks = await Task.find({ _id: { $in: project.projectTasks } })
      .populate('taskAssignee', 'name')
      .populate('taskCreator', 'name');

    return {
      projectName: project.projectName,
      projectDescription: project.projectDescription,
      owner: project.projectOwner,
      members: project.projectMembers,
      tasks: tasks,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt
    };
  }

  /**
   * Formats project context into AI-readable text format
   * @method formatProjectContextForAI
   * @param {Object} projectContext - Project context object from getProjectContext
   * @param {string} projectContext.projectName - Name of the project
   * @param {string} projectContext.projectDescription - Project description
   * @param {Object} projectContext.owner - Project owner information
   * @param {Array} projectContext.members - Array of project members with roles
   * @param {Array} projectContext.tasks - Array of project tasks
   * @returns {string} Formatted text string for AI consumption
   * @description Converts structured project data into natural language format for AI context
   */
  formatProjectContextForAI(projectContext) {
    const { projectName, projectDescription, owner, members, tasks } = projectContext;
    
    let context = `Project: ${projectName}\n`;
    context += `Description: ${projectDescription}\n`;
    context += `Owner: ${owner.name}\n`;
    
    if (members && members.length > 0) {
      context += '\nTeam Members:\n';
      members.forEach(member => {
        const roleName = member.role && member.role.roleName ? member.role.roleName : 'No role assigned';
        // Exclude viewers
        if (roleName.toLowerCase() !== 'viewer') {
          context += `- ${member.user.name} - Role: ${roleName}\n`;
        }
      });
    }

    if (tasks && tasks.length > 0) {
      context += '\nTasks:\n';
      tasks.forEach(task => {
        context += `- ${task.taskName}: ${task.taskDescription || 'No description'}\n`;
        context += `  Status: ${task.taskProgress}\n`;
        if (task.taskAssignee && task.taskAssignee.name) {
          context += `  Assigned to: ${task.taskAssignee.name}\n`;
        } else {
          context += '  Assigned to: Not assigned\n';
        }
        if (task.taskDeadline) {
          context += `  Due: ${new Date(task.taskDeadline).toLocaleDateString('en-AU', { 
            timeZone: 'Australia/Sydney',
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}\n`;
        }
        context += '\n';
      });
    }

    return context;
  }

  /**
   * Sends a message to the AI service with project context
   * @async
   * @method sendMessage
   * @param {string} projectId - ID of the project for context
   * @param {string} userMessage - User's message to send to AI
   * @param {Array<Object>} [conversationHistory=[]] - Previous conversation messages
   * @returns {Promise<Object>} Object containing AI response and usage statistics
   * @throws {Error} When AI service authentication fails (401)
   * @throws {Error} When rate limit is exceeded (429)
   * @throws {Error} When AI service is unavailable (5xx)
   * @throws {Error} When general AI response failure occurs
   * @description Combines user message with project context and conversation history for AI processing
   */
  async sendMessage(projectId, userMessage, conversationHistory = []) {
    try {
      // Get project context
      const projectContext = await this.getProjectContext(projectId);
      const contextString = this.formatProjectContextForAI(projectContext);

      // Prepare the system prompt
      const systemPrompt = `You are an AI assistant helping with project management.

CRITICAL: Keep responses very short and conversational - like a quick chat message, not a detailed report.
- Avoid bullet points, numbered lists, or complex formatting
- Don't repeat information unless specifically asked
- Be direct and casual in tone

You have access to project data: metadata, team members, roles, and tasks with status/deadlines.

CURRENT DATE: ${new Date().toLocaleDateString('en-AU', { 
    timeZone: 'Australia/Sydney',
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  })} (${new Date().toLocaleDateString('en-AU', { timeZone: 'Australia/Sydney', year: 'numeric', month: '2-digit', day: '2-digit' }).split('/').reverse().join('-')})

Task evaluation rules:
- Overdue = status "In Progress"/"To Do" AND due date before today
- Only "Completed" tasks are done, regardless of due date

PROJECT DATA:
${contextString}`;

      // Prepare messages for the API
      const messages = [
        { role: 'system', content: systemPrompt },
        ...conversationHistory,
        { role: 'user', content: userMessage }
      ];

      // Make API call
      const response = await axios.post(
        `${this.baseURL}/chat/completions`,
        {
          model: this.model,
          messages: messages,
          max_tokens: 2000,
          temperature: 0.7
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      // Remove <think> tags and their content from the response
      let cleanedMessage = response.data.choices[0].message.content;
      cleanedMessage = cleanedMessage.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

      return {
        success: true,
        message: cleanedMessage,
        usage: response.data.usage
      };

    } catch (error) {
      if (error.response?.status === 401) {
        throw new Error('AI service authentication failed');
      } else if (error.response?.status === 429) {
        throw new Error('AI service rate limit exceeded. Please try again later.');
      } else if (error.response?.status >= 500) {
        throw new Error('AI service is temporarily unavailable');
      }
      
      throw new Error('Failed to get AI response');
    }
  }
}

module.exports = new AIChatService();
