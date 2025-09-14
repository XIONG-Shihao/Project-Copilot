/**
 * @fileoverview Project controller module for handling project management operations
 * @module controllers/projectController
 */

const Project = require('../models/project');
const User = require('../models/user');
const projectService = require('../services/projectService');
const PDFService = require('../services/pdfService');
const pdfService = new PDFService();

/**
 * Creates a new project with the authenticated user as owner
 * @async
 * @function createProject
 * @param {Object} req - Express request object
 * @param {Object} req.body - Request body
 * @param {string} req.body.projectName - Name of the project
 * @param {string} req.body.projectDescription - Description of the project
 * @param {Object} req.user - User object from authentication middleware
 * @param {string} req.user.userId - ID of the authenticated user
 * @param {Object} res - Express response object
 * @returns {Promise<void>} JSON response with created project data
 * @throws {400} When project name or description is missing
 * @throws {500} When internal server error occurs
 * @description Creates a new project and automatically adds the creator as project owner with admin role
 */
async function createProject(req, res) {
  const { projectName, projectDescription } = req.body;
  const userId = req.user.userId;

  if (!projectName || !projectDescription) {
    return res
      .status(400)
      .json({ message: 'Project name and description are required' });
  }

  try {
    const newProject = await projectService.createProject(
      userId,
      projectName,
      projectDescription
    );

    // Populate projectMembers.role and projectMembers.user for the response
    const populatedProject = await Project.findById(newProject._id)
      .populate({ path: 'projectMembers.user', select: 'name email' })
      .populate({ path: 'projectMembers.role', select: 'roleName' });

    res.status(201).json({
      message: 'Project created successfully',
      project: populatedProject,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

/**
 * Retrieves all projects that the authenticated user is a member of
 * @async
 * @function getUserProjects
 * @param {Object} req - Express request object
 * @param {Object} req.user - User object from authentication middleware
 * @param {string} req.user.userId - ID of the authenticated user
 * @param {Object} res - Express response object
 * @returns {Promise<void>} JSON response with array of user's projects
 * @throws {500} When internal server error occurs
 * @description Fetches all projects where the user is a member, including project details and member information
 */
async function getUserProjects(req, res) {
  const userId = req.user.userId;

  try {
    const user = await User.findById(userId).populate({
      path: 'userProjects',
      select: 'projectName projectDescription projectMembers',
      populate: {
        path: 'projectMembers.user',
        select: 'name email',
      },
    });

    res.status(200).json({ projects: user.userProjects });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

/**
 * Retrieves detailed information about a specific project
 * @async
 * @function getProjectById
 * @param {Object} req - Express request object
 * @param {Object} req.params - URL parameters
 * @param {string} req.params.projectId - ID of the project to retrieve
 * @param {Object} req.user - User object from authentication middleware
 * @param {string} req.user.userId - ID of the authenticated user
 * @param {Object} res - Express response object
 * @returns {Promise<void>} JSON response with project details including members, tasks, and settings
 * @throws {404} When project is not found
 * @throws {403} When user is not a project member
 * @throws {500} When internal server error occurs
 * @description Fetches comprehensive project information including populated member and task data, with access control validation
 */
async function getProjectById(req, res) {
  const { projectId } = req.params;
  const userId = req.user.userId;

  try {
    const project = await Project.findById(projectId)
      .populate({
        path: 'projectMembers.user',
        select: 'name email',
      })
      .populate({
        path: 'projectMembers.role',
        select: 'roleName',
      })
      .populate({
        path: 'projectTasks',
        select: 'taskName taskDescription taskDeadline taskCreator taskAssignee taskProgress',
        populate: [
          { path: 'taskCreator', select: 'name email' },
          { path: 'taskAssignee', select: 'name email' }
        ]
      });

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // check if user is a project member
    const isMember = project.projectMembers.some(
      (member) => member.user._id.toString() === userId
    );

    if (!isMember) {
      return res
        .status(403)
        .json({ message: 'Access denied: not a project member.' });
    }

    res.status(200).json({
      projectName: project.projectName,
      projectDescription: project.projectDescription,
      members: project.projectMembers,
      tasks: project.projectTasks,
      settings: project.settings,
      projectOwner: project.projectOwner,
      createdAt: project.createdAt
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

/**
 * Creates a new task within a project
 * @async
 * @function createTask
 * @param {Object} req - Express request object
 * @param {Object} req.params - URL parameters
 * @param {string} req.params.projectId - ID of the project to create task in
 * @param {Object} req.body - Request body
 * @param {string} req.body.taskName - Name of the task
 * @param {string} req.body.taskDescription - Description of the task
 * @param {string} req.body.taskDeadline - Deadline for the task (ISO date string)
 * @param {Object} req.user - User object from authentication middleware
 * @param {string} req.user.userId - ID of the authenticated user
 * @param {Object} res - Express response object
 * @returns {Promise<void>} JSON response with created task data
 * @throws {400} When required fields are missing or deadline is invalid/in the past
 * @throws {403} When user is not a project member or lacks permission to create tasks
 * @throws {500} When internal server error occurs
 * @description Creates a new task in the specified project with validation for deadline and user permissions
 */
async function createTask(req, res) {
  const { projectId } = req.params;
  const userId = req.user.userId;
  const { taskName, taskDescription, taskDeadline } = req.body;

  if (!taskName) {
    return res.status(400).json({ message: 'Task name required!' });
  }

  if (!taskDescription) {
    return res.status(400).json({ message: 'Task description required!' });
  }

  if (!taskDeadline) {
    return res.status(400).json({ message: 'Task deadline required!' });
  }
  
  const deadlineDate = new Date(taskDeadline);

  if (isNaN(deadlineDate)) {
    return res.status(400).json({ message: 'Invalid date format for deadline!' });
  }
  if (deadlineDate < Date.now()) {
    return res.status(400).json({ message: 'Task deadline cannot be in the past!' });
  }

  try {
    const newTask = await projectService.createTask(projectId, userId, taskName, taskDescription, deadlineDate);

    res.status(201).json({ 
      message: 'Task created successfully',
      task: newTask
    });
  } catch(err) {
    if (err.message === 'You are not a member of this project' || 
        err.message === 'Viewers are not authorized to create tasks') {
      return res.status(403).json({ message: err.message });
    }
    res.status(500).json({ message: err.message });
  }
}

/**
 * Deletes a task from a project
 * @async
 * @function deleteTask
 * @param {Object} req - Express request object
 * @param {Object} req.params - URL parameters
 * @param {string} req.params.projectId - ID of the project containing the task
 * @param {string} req.params.taskId - ID of the task to delete
 * @param {Object} req.user - User object from authentication middleware
 * @param {string} req.user.userId - ID of the authenticated user
 * @param {Object} res - Express response object
 * @returns {Promise<void>} JSON response with deletion confirmation
 * @throws {400} When project is not found
 * @throws {500} When internal server error occurs or user lacks permission
 * @description Removes a task from the specified project with appropriate authorization checks
 */
async function deleteTask(req, res) {
  const { projectId, taskId } = req.params;

  const userId = req.user.userId;

  const proj = await Project.findById(projectId);
  if (!proj) {
    return res.status(400).json({ message: 'Project not found'});
  }

  try {
    await projectService.deleteTask(projectId, taskId, userId);
    res.status(200).json({ message: 'Task deleted successfully'});
  } catch(err) {
    res.status(500).json({ message: err.message });
  }
}

/**
 * Updates an existing task in a project
 * @async
 * @function updateTask
 * @param {Object} req - Express request object
 * @param {Object} req.params - URL parameters
 * @param {string} req.params.projectId - ID of the project containing the task
 * @param {string} req.params.taskId - ID of the task to update
 * @param {Object} req.body - Request body with update fields
 * @param {string} [req.body.taskName] - Updated task name
 * @param {string} [req.body.taskDescription] - Updated task description
 * @param {string} [req.body.taskDeadline] - Updated task deadline (ISO date string)
 * @param {string} [req.body.taskProgress] - Updated task progress status
 * @param {Object} req.user - User object from authentication middleware
 * @param {string} req.user.userId - ID of the authenticated user
 * @param {Object} res - Express response object
 * @returns {Promise<void>} JSON response with updated task data
 * @throws {400} When no update fields are provided
 * @throws {500} When internal server error occurs or user lacks permission
 * @description Updates specified fields of a task with validation and authorization checks
 */
async function updateTask(req, res) {
  const { projectId, taskId } = req.params;
  const userId = req.user.userId;
  const { taskName, taskDescription, taskDeadline, taskProgress } = req.body;

  if (
    taskName === undefined &&
    taskDescription === undefined &&
    taskDeadline === undefined &&
    taskProgress === undefined
  ) {
    return res.status(400).json({ message: 'At least one field (name, description, deadline, or status) must be provided to update.' });
  }

  try {
    const updates = {};
    if (taskName !== undefined) updates.taskName = taskName;
    if (taskDescription !== undefined) updates.taskDescription = taskDescription;
    if (taskDeadline !== undefined) updates.taskDeadline = taskDeadline;
    if (taskProgress !== undefined) updates.taskProgress = taskProgress;

    const updatedTask = await projectService.updateTask(projectId, taskId, userId, updates);
    res.status(200).json({ message: 'Task updated successfully', task: updatedTask });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

/**
 * Assigns a task to a specific project member
 * @async
 * @function assignTask
 * @param {Object} req - Express request object
 * @param {Object} req.params - URL parameters
 * @param {string} req.params.projectId - ID of the project containing the task
 * @param {string} req.params.taskId - ID of the task to assign
 * @param {string} req.params.memberId - ID of the member to assign the task to
 * @param {Object} req.user - User object from authentication middleware
 * @param {string} req.user.userId - ID of the authenticated user
 * @param {Object} res - Express response object
 * @returns {Promise<void>} JSON response with assignment confirmation and updated task data
 * @throws {500} When internal server error occurs or assignment fails
 * @description Assigns a task to a project member with appropriate validation and authorization
 */
async function assignTask(req, res) {
  const { projectId, taskId, memberId } = req.params;

  const userId = req.user.userId;

  try {
    const assignedTask = await projectService.assignTask(projectId, taskId, memberId, userId);
    res.status(200).json({ message: 'Task assigned successfully', task: assignedTask });
  } catch (err) {
    res.status(500).json({ message: err.message});
  }
}

/**
 * Generates an invite link for a project
 * @async
 * @function generateInviteLink
 * @param {Object} req - Express request object
 * @param {Object} req.params - URL parameters
 * @param {string} req.params.projectId - ID of the project to generate invite link for
 * @param {Object} req.user - User object from authentication middleware
 * @param {string} req.user.userId - ID of the authenticated user
 * @param {Object} res - Express response object
 * @returns {Promise<void>} JSON response with generated invite link token
 * @throws {404} When project is not found or user is not a project member
 * @throws {403} When user is not authorized to generate invite links (admin required)
 * @throws {500} When internal server error occurs
 * @description Creates a unique invite token that can be used to join the project
 */
async function generateInviteLink(req, res) {
  const { projectId } = req.params;
  const userId = req.user.userId;

  try {
    const inviteLink = await projectService.generateInviteLink(projectId, userId);
    
    res.status(201).json({
      message: 'Invite link generated successfully',
      inviteLink: { token: inviteLink.token }
    });
  } catch (err) {
    if (err.message === 'Project not found' || err.message === 'You are not a member of this project') {
      return res.status(404).json({ message: err.message });
    }
    if (err.message === 'Only project administrators can generate invite links') {
      return res.status(403).json({ message: err.message });
    }
    res.status(500).json({ message: err.message });
  }
}

/**
 * Updates the progress status of a specific task
 * @async
 * @function editTaskProgress
 * @param {Object} req - Express request object
 * @param {Object} req.params - URL parameters
 * @param {string} req.params.projectId - ID of the project containing the task
 * @param {string} req.params.taskId - ID of the task to update progress for
 * @param {Object} req.body - Request body
 * @param {string} req.body.newProg - New progress value for the task
 * @param {Object} req.user - User object from authentication middleware
 * @param {string} req.user.userId - ID of the authenticated user
 * @param {Object} res - Express response object
 * @returns {Promise<void>} JSON response with updated task data
 * @throws {400} When new progress value is missing
 * @throws {500} When internal server error occurs or user lacks permission
 * @description Updates only the progress field of a task with validation and authorization
 */
async function editTaskProgress(req, res) {
  const { projectId, taskId } = req.params;
  const { newProg } = req.body;

  if (newProg === undefined) {
    return res.status(400).json({ message: 'New progress value is required.' });
  }

  try {
    const updatedTask = await projectService.editTaskProgress(
      projectId,
      taskId,
      req.user.userId,
      newProg
    );
    res.status(200).json({ message: 'Task progress updated successfully', task: updatedTask });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

/**
 * Allows a user to join a project using an invite link token
 * @async
 * @function joinProjectViaInvite
 * @param {Object} req - Express request object
 * @param {Object} req.body - Request body
 * @param {string} req.body.token - Invite token for the project
 * @param {Object} req.user - User object from authentication middleware
 * @param {string} req.user.userId - ID of the authenticated user
 * @param {Object} res - Express response object
 * @returns {Promise<void>} JSON response with project join confirmation
 * @throws {400} When invite token is missing
 * @throws {404} When invite link is invalid, expired, project not found, or role not found
 * @throws {409} When user is already a member of the project
 * @description Validates invite token and adds user to project with appropriate role
 */
async function joinProjectViaInvite(req, res) {
  const { token } = req.body;
  const userId = req.user.userId;

  if (!token) {
    return res.status(400).json({ message: 'Invite token is required' });
  }

  try {
    const result = await projectService.joinProjectViaInvite(token, userId);
    
    res.status(200).json({
      message: 'Successfully joined project',
      project: result
    });
  } catch (err) {
    if (err.message === 'Invalid or expired invite link' || 
        err.message === 'Project not found' ||
        err.message === 'Role not found') {
      return res.status(404).json({ message: err.message });
    }
    if (err.message === 'You are already a member of this project') {
      return res.status(409).json({ message: err.message });
    }
  }
}

/**
 * Retrieves project details from an invite link token without joining
 * @async
 * @function getProjectDetailsFromInvite
 * @param {Object} req - Express request object
 * @param {Object} req.query - Query parameters
 * @param {string} req.query.token - Invite token for the project
 * @param {Object} res - Express response object
 * @returns {Promise<void>} JSON response with project details for preview
 * @throws {400} When invite token is missing
 * @throws {404} When invite link is invalid, expired, or project not found
 * @throws {500} When internal server error occurs
 * @description Allows users to preview project information before deciding to join via invite link
 */
async function getProjectDetailsFromInvite(req, res) {
  const { token } = req.query;

  if (!token) {
    return res.status(400).json({ message: 'Invite token is required' });
  }

  try {
    const projectDetails = await projectService.getProjectDetailsFromInvite(token);
    
    res.status(200).json({
      message: 'Project details retrieved successfully',
      project: projectDetails
    });
  } catch (err) {
    if (err.message === 'Invalid or expired invite link' || 
        err.message === 'Project not found') {
      return res.status(404).json({ message: err.message });
    }
    res.status(500).json({ message: err.message });
  }
}

/**
 * Removes a member from a project
 * @async
 * @function removeMember
 * @param {Object} req - Express request object
 * @param {Object} req.body - Request body
 * @param {string} req.body.projectId - ID of the project to remove member from
 * @param {string} req.body.targetUserId - ID of the user to remove from project
 * @param {Object} req.user - User object from authentication middleware
 * @param {string} req.user.userId - ID of the authenticated user (must be admin)
 * @param {Object} res - Express response object
 * @returns {Promise<void>} JSON response with removal confirmation
 * @throws {400} When removal fails or user lacks permission
 * @description Removes a specified user from the project with appropriate authorization checks
 */
async function removeMember(req, res){
  const { projectId, targetUserId } = req.body;
  const userId = req.user.userId;
  try {
    await projectService.removeMemberFromProject(projectId, userId, targetUserId);
    res.status(200).json({ message: 'Member removed successfully' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

/**
 * Exports a PDF summary of the project including tasks and member information
 * @async
 * @function exportProjectSummary
 * @param {Object} req - Express request object
 * @param {Object} req.params - URL parameters
 * @param {string} req.params.projectId - ID of the project to export
 * @param {Object} req.user - User object from authentication middleware
 * @param {string} req.user.userId - ID of the authenticated user
 * @param {Object} res - Express response object
 * @returns {Promise<void>} PDF file download response
 * @throws {404} When project is not found
 * @throws {403} When user is not authorized to export project summary
 * @throws {500} When PDF generation fails or internal server error occurs
 * @description Generates and downloads a comprehensive PDF report of project details, tasks, and progress
 */
async function exportProjectSummary(req, res) {
  const { projectId } = req.params;
  const userId = req.user.userId;

  try {
    // First verify that the user has access to this project
    const project = await Project.findById(projectId);
    
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Check if user is a project member
    const isMember = project.projectMembers.some(
      (member) => member.user && member.user.toString() === userId
    );

    if (!isMember) {
      return res.status(403).json({ 
        message: 'Access denied: You are not authorized to export this project summary' 
      });
    }

    // Generate the PDF
    const pdfBuffer = await pdfService.generateProjectSummaryPDF(projectId);

    // Set response headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="project-summary-${project.projectName.replace(/[^a-zA-Z0-9]/g, '-')}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    // Send the PDF
    res.send(pdfBuffer);
  } catch (err) {
    if (err.message.includes('Project not found')) {
      return res.status(404).json({ message: 'Project not found' });
    }
    res.status(500).json({ 
      message: 'Failed to generate project summary PDF',
      error: err.message 
    });
  }
}

/**
 * Updates basic project information (name and description)
 * @async
 * @function updateProjectDetails
 * @param {Object} req - Express request object
 * @param {Object} req.params - URL parameters
 * @param {string} req.params.projectId - ID of the project to update
 * @param {Object} req.body - Request body
 * @param {string} [req.body.projectName] - Updated project name
 * @param {string} [req.body.projectDescription] - Updated project description
 * @param {Object} req.user - User object from authentication middleware
 * @param {string} req.user.userId - ID of the authenticated user
 * @param {Object} res - Express response object
 * @returns {Promise<void>} JSON response with updated project data
 * @throws {404} When project is not found
 * @throws {403} When user is not authorized to update project details (admin required)
 * @throws {500} When internal server error occurs
 * @description Updates the basic information of a project with admin authorization required
 */
async function updateProjectDetails(req, res) {
  const { projectId } = req.params;
  const { projectName, projectDescription } = req.body;
  const userId = req.user.userId;

  try {
    const updatedProject = await projectService.updateProjectDetails(projectId, userId, {
      projectName,
      projectDescription
    });
    res.status(200).json({ 
      message: 'Project details updated successfully',
      project: updatedProject 
    });
  } catch (err) {
    if (err.message === 'Project not found') {
      return res.status(404).json({ message: err.message });
    }
    if (err.message === 'Only project administrators can update project details') {
      return res.status(403).json({ message: err.message });
    }
    res.status(500).json({ message: err.message });
  }
}

/**
 * Updates project configuration settings
 * @async
 * @function updateProjectSettings
 * @param {Object} req - Express request object
 * @param {Object} req.params - URL parameters
 * @param {string} req.params.projectId - ID of the project to update settings for
 * @param {Object} req.body - Request body
 * @param {Object} req.body.settings - New settings object to apply to project
 * @param {Object} req.user - User object from authentication middleware
 * @param {string} req.user.userId - ID of the authenticated user
 * @param {Object} res - Express response object
 * @returns {Promise<void>} JSON response with updated project data
 * @throws {404} When project is not found
 * @throws {403} When user is not authorized to update project settings (admin required)
 * @throws {500} When internal server error occurs
 * @description Updates project configuration settings with admin authorization required
 */
async function updateProjectSettings(req, res) {
  const { projectId } = req.params;
  const { settings } = req.body;
  const userId = req.user.userId;

  try {
    const updatedProject = await projectService.updateProjectSettings(projectId, userId, settings);
    res.status(200).json({ 
      message: 'Project settings updated successfully',
      project: updatedProject 
    });
  } catch (err) {
    if (err.message === 'Project not found') {
      return res.status(404).json({ message: err.message });
    }
    if (err.message === 'Only project administrators can update project settings') {
      return res.status(403).json({ message: err.message });
    }
    res.status(500).json({ message: err.message });
  }
}

/**
 * Allows a user to leave a project with special handling for administrators
 * @async
 * @function leaveProject
 * @param {Object} req - Express request object
 * @param {Object} req.params - URL parameters
 * @param {string} req.params.projectId - ID of the project to leave
 * @param {Object} req.user - User object from authentication middleware
 * @param {string} req.user.userId - ID of the authenticated user
 * @param {Object} res - Express response object
 * @returns {Promise<void>} JSON response with leave confirmation or admin transition options
 * @throws {404} When project is not found
 * @throws {400} When user is not a project member or is project owner
 * @throws {500} When internal server error occurs
 * @description Handles user leaving project with special logic for last administrators requiring delegation
 */
async function leaveProject(req, res) {
  const { projectId } = req.params;
  const userId = req.user.userId;

  try {
    const result = await projectService.leaveProject(projectId, userId);
    
    if (result.isLastAdmin) {
      return res.status(200).json({
        message: 'You are the last administrator. Choose an action:',
        isLastAdmin: true,
        members: result.members,
        options: result.options
      });
    }
    
    res.status(200).json({ message: 'Successfully left the project' });
  } catch (err) {
    if (err.message === 'Project not found') {
      return res.status(404).json({ message: err.message });
    }
    if (err.message === 'You are not a member of this project') {
      return res.status(400).json({ message: err.message });
    }
    if (err.message === 'Project owner cannot leave the project. Transfer ownership or delete the project instead.') {
      return res.status(400).json({ message: err.message });
    }
    res.status(500).json({ message: err.message });
  }
}





/**
 * Permanently deletes a project and all associated data
 * @async
 * @function deleteProject
 * @param {Object} req - Express request object
 * @param {Object} req.params - URL parameters
 * @param {string} req.params.projectId - ID of the project to delete
 * @param {Object} req.user - User object from authentication middleware
 * @param {string} req.user.userId - ID of the authenticated user
 * @param {Object} res - Express response object
 * @returns {Promise<void>} JSON response with deletion confirmation
 * @throws {404} When project is not found
 * @throws {403} When user is not authorized to delete project (admin required)
 * @throws {500} When internal server error occurs
 * @description Permanently removes project and all associated tasks, members, and data with admin authorization
 */
async function deleteProject(req, res) {
  const { projectId } = req.params;
  const userId = req.user.userId;

  try {
    await projectService.deleteProject(projectId, userId);
    res.status(200).json({ message: 'Project deleted successfully' });
  } catch (err) {
    if (err.message === 'Project not found') {
      return res.status(404).json({ message: err.message });
    }
    if (err.message === 'Only project administrators can delete projects') {
      return res.status(403).json({ message: err.message });
    }
    res.status(500).json({ message: err.message });
  }
}

/**
 * Disables all active invite links for a project
 * @async
 * @function disableProjectInviteLinks
 * @param {Object} req - Express request object
 * @param {Object} req.params - URL parameters
 * @param {string} req.params.projectId - ID of the project to disable invite links for
 * @param {Object} req.user - User object from authentication middleware
 * @param {string} req.user.userId - ID of the authenticated user
 * @param {Object} res - Express response object
 * @returns {Promise<void>} JSON response with disable confirmation
 * @throws {404} When project is not found
 * @throws {403} When user is not authorized to manage invite links (admin required)
 * @throws {500} When internal server error occurs
 * @description Invalidates all existing invite links for the project to prevent new members from joining
 */
async function disableProjectInviteLinks(req, res) {
  const { projectId } = req.params;
  const userId = req.user.userId;

  try {
    await projectService.disableProjectInviteLinks(projectId, userId);
    res.status(200).json({ message: 'Project invite links disabled successfully' });
  } catch (err) {
    if (err.message === 'Project not found') {
      return res.status(404).json({ message: err.message });
    }
    if (err.message === 'Only project administrators can manage invite links') {
      return res.status(403).json({ message: err.message });
    }
    res.status(500).json({ message: err.message });
  }
}

module.exports = { 
  removeMember, 
  createProject, 
  getUserProjects, 
  getProjectById, 
  createTask, 
  deleteTask, 
  updateTask, 
  assignTask, 
  generateInviteLink, 
  joinProjectViaInvite, 
  editTaskProgress, 
  getProjectDetailsFromInvite, 
  exportProjectSummary,
  updateProjectDetails,
  updateProjectSettings,
  leaveProject,
  deleteProject,
  disableProjectInviteLinks
};
