/**
 * @fileoverview Project service module containing core business logic for project management
 * @module services/projectService
 */

const Project = require('../models/project');
const User = require('../models/user');
const Role = require('../models/roles');
const Task = require('../models/tasks');
const InviteLink = require('../models/inviteLink');
const mongoose = require('mongoose');
const crypto = require('crypto');

/**
 * Creates a new project with the specified user as owner and administrator
 * @async
 * @function createProject
 * @param {string} userId - ID of the user creating the project
 * @param {string} projectName - Name of the new project
 * @param {string} projectDescription - Description of the new project
 * @returns {Promise<Object>} The created project document
 * @throws {Error} When administrator role is not found in database
 * @description Creates project, assigns creator as owner with admin role, and adds project to user's project list
 */
async function createProject(userId, projectName, projectDescription) {
  const adminRole = await Role.findOne({ roleName: 'administrator' });
  if (!adminRole) {
    throw new Error('Administrator role not found');
  }

  const newProject = new Project({
    projectName,
    projectDescription: projectDescription, // Note: keeping the typo to match the model
    projectOwner: userId,
    projectMembers: [
      {
        user: userId,
        role: adminRole._id
      }
    ]
  });

  const savedProject = await newProject.save();

  // Add project to user's userProjects
  await User.findByIdAndUpdate(
    userId, 
    { $push: { userProjects: savedProject._id } } 
  );

  return savedProject;
}

/**
 * Creates a new task within a project with role-based authorization
 * @async
 * @function createTask
 * @param {string} projectId - ID of the project to create task in
 * @param {string} userId - ID of the user creating the task
 * @param {string} taskName - Name of the new task
 * @param {string} taskDescription - Description of the new task
 * @param {Date} taskDeadline - Deadline for the task completion
 * @returns {Promise<Object>} The created task document
 * @throws {Error} When project is not found
 * @throws {Error} When user is not a project member
 * @throws {Error} When user has viewer role (insufficient permissions)
 * @description Creates task with creator assignment and adds it to project's task list
 */
async function createTask(projectId, userId, taskName, taskDescription, taskDeadline) {
  const project = await Project.findById(projectId).populate('projectMembers.role');
  if (!project) {
    throw new Error('Project not found');
  }

  // Check if user is a project member and get their role
  const userMember = project.projectMembers.find(
    member => member.user.toString() === userId
  );
  if (!userMember) {
    throw new Error('You are not a member of this project');
  }

  // Viewers cannot create tasks
  if (userMember.role.roleName === 'viewer') {
    throw new Error('Viewers are not authorized to create tasks');
  }

  const newTask = new Task({
    taskName,
    taskDescription,
    taskDeadline,
    taskCreator: userId
  });

  const savedTask = await newTask.save();

  await Project.findByIdAndUpdate(
    projectId, 
    { $push: { projectTasks: savedTask._id } }
  );

  return savedTask;
}

/**
 * Deletes a task from a project with authorization checks
 * @async
 * @function deleteTask
 * @param {string} projectId - ID of the project containing the task
 * @param {string} taskId - ID of the task to delete
 * @param {string} userId - ID of the user requesting deletion
 * @returns {Promise<Object>} Success confirmation object
 * @throws {Error} When project or task is not found
 * @throws {Error} When task is not in the specified project
 * @throws {Error} When user is not authorized (not project owner or task creator)
 * @description Removes task from project and deletes task document with proper authorization
 */
async function deleteTask(projectId, taskId, userId) {
  const taskObjectId = new mongoose.Types.ObjectId(taskId);

  const project = await Project.findById(projectId);
  if (!project) {
    throw new Error('Project not found');
  }


  const taskIsInProject = project.projectTasks.some(
    id => id.equals(taskObjectId)
  );
  if (!taskIsInProject) {
    throw new Error('Task not found in this project');
  }

  const task = await Task.findById(taskObjectId);
  if (!task) {
    throw new Error('Task not found');
  }

  // Only the project owner or the task creator can delete a task. Will be helpful for when multiple people are invited to project.
  const isProjectOwner = project.projectOwner.equals(userId);
  const isTaskCreator = task.taskCreator.equals(userId);

  if (!isProjectOwner && !isTaskCreator) {
    throw new Error('You are not authorized to delete this task');
  }

  // Remove task from project
  const updateResult = await Project.updateOne(
    { _id: projectId },
    { $pull: { projectTasks: taskObjectId } }
  );
  if (updateResult.modifiedCount === 0) {
    throw new Error('Task was not removed from project');
  }

  // Delete task from collection
  const deleteResult = await Task.deleteOne({ _id: taskObjectId });
  if (deleteResult.deletedCount === 0) {
    throw new Error('Task document not found');
  }

  return { success: true };
}

/**
 * Updates an existing task with new information
 * @async
 * @function updateTask
 * @param {string} projectId - ID of the project containing the task
 * @param {string} taskId - ID of the task to update
 * @param {string} userId - ID of the user requesting the update
 * @param {Object} updates - Object containing fields to update
 * @param {string} [updates.taskName] - New task name
 * @param {string} [updates.taskDescription] - New task description
 * @param {Date} [updates.taskDeadline] - New task deadline
 * @param {string} [updates.taskProgress] - New task progress status
 * @returns {Promise<Object>} The updated task document
 * @throws {Error} When project or task is not found
 * @throws {Error} When user is not authorized (not project owner or task creator)
 * @description Updates specified task fields with authorization validation
 */
async function updateTask(projectId, taskId, userId, updates) {
  const project = await Project.findById(projectId);
  if (!project) {
    throw new Error('Project not found');
  }

  const task = await Task.findById(taskId);
  if (!task) {
    throw new Error('Task not found');
  }

  // Only the project owner or the task creator can update a task
  const isProjectOwner = project.projectOwner.equals(userId);
  const isTaskCreator = task.taskCreator.equals(userId);
  if (!isProjectOwner && !isTaskCreator) {
    throw new Error('You are not authorized to update this task');
  }

  // Only update provided fields
  if (updates.taskName !== undefined) task.taskName = updates.taskName;
  if (updates.taskDescription !== undefined) task.taskDescription = updates.taskDescription;
  if (updates.taskDeadline !== undefined) task.taskDeadline = updates.taskDeadline;
  if (updates.taskProgress !== undefined) task.taskProgress = updates.taskProgress;

  const updatedTask = await task.save();
  return updatedTask;
}

/**
 * Assigns a task to a specific project member
 * @async
 * @function assignTask
 * @param {string} projectId - ID of the project containing the task
 * @param {string} taskId - ID of the task to assign
 * @param {string} memberId - ID of the member to assign the task to
 * @param {string} userId - ID of the user making the assignment (must be project owner)
 * @returns {Promise<Object>} The updated task document with populated assignee
 * @throws {Error} When project or task is not found
 * @throws {Error} When specified member is not part of the project
 * @throws {Error} When user is not authorized (not project owner)
 * @description Assigns task to project member with owner authorization requirement
 */
async function assignTask(projectId, taskId, memberId, userId) {
  const project = await Project.findById(projectId).populate('projectMembers.user');
  if (!project) {
    throw new Error('Project not found');
  }

  const task = await Task.findById(taskId);
  if (!task) {
    throw new Error('Task not found');
  }

  // Check if memberId is in projectMembers array (by user._id)
  const isMember = project.projectMembers.some(member =>
    member.user && member.user._id.equals(memberId)
  );
  if (!isMember) {
    throw new Error('Member is not part of this project');
  }

  // Only project owner can assign task
  if (!project.projectOwner.equals(userId)) {
    throw new Error('You are not authorized to update this task');
  }

  task.taskAssignee = memberId;
  await task.save();

  const assignedTask = await Task.findById(task._id).populate('taskAssignee', 'name email');

  return assignedTask;
}

/**
 * Updates the progress status of a task with history tracking
 * @async
 * @function editTaskProgress
 * @param {string} projectId - ID of the project containing the task
 * @param {string} taskId - ID of the task to update progress for
 * @param {string} userId - ID of the user updating progress
 * @param {string} newProgress - New progress status for the task
 * @returns {Promise<Object>} The updated task document
 * @throws {Error} When project or task is not found
 * @throws {Error} When user is not authorized (not project owner or task assignee)
 * @description Updates task progress and maintains history with timestamp and user tracking
 */
async function editTaskProgress(projectId, taskId, userId, newProgress) {
  const project = await Project.findById(projectId).populate('projectMembers.user');
  if (!project) throw new Error('Project not found');

  const task = await Task.findById(taskId);
  if (!task) throw new Error('Task not found');

  const isProjectOwner = project.projectOwner.equals(userId);
  const isTaskAssignee = task.taskAssignee && task.taskAssignee.equals(userId);

  if (!isProjectOwner && !isTaskAssignee) {
    throw new Error('Only the project owner or assigned member can update task progress');
  }

  task.taskProgress = newProgress;

  task.progressHistory.push({
    progress: newProgress,
    updatedBy: userId,
    timestamp: new Date()
  });

  const savedTask = await task.save();
  return savedTask;
}

/**
 * Generates a secure invite link for project membership
 * @async
 * @function generateInviteLink
 * @param {string} projectId - ID of the project to generate invite for
 * @param {string} userId - ID of the user generating the invite (must be admin)
 * @returns {Promise<Object>} Object containing the invite token
 * @throws {Error} When project is not found
 * @throws {Error} When user is not a project member
 * @throws {Error} When user is not an administrator
 * @description Creates or returns existing invite link with secure token generation
 */
async function generateInviteLink(projectId, userId) {
  const project = await Project.findById(projectId).populate('projectMembers.role');
  if (!project) {
    throw new Error('Project not found');
  }

  // Check if user is a project member
  const userMember = project.projectMembers.find(
    member => member.user.toString() === userId
  );
  if (!userMember) {
    throw new Error('You are not a member of this project');
  }

  // Check if user has administrator role (project manager)
  const userRole = await Role.findById(userMember.role);
  if (!userRole || userRole.roleName !== 'administrator') {
    throw new Error('Only project administrators can generate invite links');
  }

  // Check if there's already an existing invite link for this project
  const existingInviteLink = await InviteLink.findOne({ projectId });
  if (existingInviteLink) {
    return { token: existingInviteLink.token };
  }

  // Generate a secure random token
  const token = crypto.randomBytes(32).toString('hex');

  // Create the invite link
  const inviteLink = new InviteLink({
    projectId,
    token,
    createdBy: userId
  });

  const savedInviteLink = await inviteLink.save();

  return { token: savedInviteLink.token };
}

/**
 * Adds a user to a project using an invite link token
 * @async
 * @function joinProjectViaInvite
 * @param {string} token - Invite token for the project
 * @param {string} userId - ID of the user joining the project
 * @returns {Promise<Object>} Object containing the project ID
 * @throws {Error} When invite link is invalid or expired
 * @throws {Error} When project is not found
 * @throws {Error} When user is already a project member
 * @throws {Error} When viewer role is not found
 * @description Validates invite token and adds user as viewer to project and user's project list
 */
async function joinProjectViaInvite(token, userId) {
  // Find the invite link by token
  const inviteLink = await InviteLink.findOne({ token });
  if (!inviteLink) {
    throw new Error('Invalid or expired invite link');
  }

  // Get the project
  const project = await Project.findById(inviteLink.projectId);
  if (!project) {
    throw new Error('Project not found');
  }

  // Check if user is already a member of the project
  const isAlreadyMember = project.projectMembers.some(
    member => member.user.toString() === userId
  );
  if (isAlreadyMember) {
    throw new Error('You are already a member of this project');
  }

  const viewerRole = await Role.findOne({ roleName: 'viewer' });
  if (!viewerRole) {
    throw new Error('Role not found');
  }

  // Add user to project members
  project.projectMembers.push({
    user: userId,
    role: viewerRole._id
  });
  await project.save();

  // Add project to user's userProjects
  await User.findByIdAndUpdate(
    userId,
    { $push: { userProjects: project._id } }
  );

  return { projectId: project._id };
}

/**
 * Retrieves project information from an invite token for preview
 * @async
 * @function getProjectDetailsFromInvite
 * @param {string} token - Invite token for the project
 * @returns {Promise<Object>} Object containing project name, description, and inviter info
 * @throws {Error} When invite link is invalid or expired
 * @throws {Error} When project is not found
 * @description Allows users to preview project details before joining via invite link
 */
async function getProjectDetailsFromInvite(token) {
  // Find the invite link by token
  const inviteLink = await InviteLink.findOne({ token })
    .populate('createdBy', 'name email')
    .populate('projectId', 'projectName projectDescription');
  
  if (!inviteLink) {
    throw new Error('Invalid or expired invite link');
  }

  // Get the project details
  const project = inviteLink.projectId;
  if (!project) {
    throw new Error('Project not found');
  }

  return {
    projectName: project.projectName,
    projectDescription: project.projectDescription,
    invitedBy: inviteLink.createdBy.name
  };
}

/**
 * Removes a member from a project with admin authorization
 * @async
 * @function removeMemberFromProject
 * @param {string} projectId - ID of the project to remove member from
 * @param {string} userId - ID of the admin user requesting removal
 * @param {string} targetUserId - ID of the user to be removed
 * @returns {Promise<Object>} Success confirmation object
 * @throws {Error} When project is not found
 * @throws {Error} When requesting user is not an administrator
 * @throws {Error} When target user is not a project member
 * @throws {Error} When trying to remove project owner
 * @throws {Error} When trying to remove the last administrator
 * @description Removes member with validation to maintain project integrity and admin coverage
 */
async function removeMemberFromProject(projectId, userId, targetUserId) {
  const project = await Project.findById(projectId).populate('projectMembers.user').populate('projectMembers.role');
  if (!project) throw new Error('Project not found');

  // Check if requester is an admin
  const requester = project.projectMembers.find(
    (member) => member.user._id.toString() === userId && member.role.roleName === 'administrator'
  );
  if (!requester) throw new Error('Only project administrators can remove members');

  // Check if target is in project
  const targetIndex = project.projectMembers.findIndex(
    (member) => member.user._id.toString() === targetUserId
  );
  if (targetIndex === -1) throw new Error('User is not part of this project');

  // Don't allow removing the project owner
  if (project.projectOwner.toString() === targetUserId) {
    throw new Error('Cannot remove the project owner');
  }

  // Check if this would leave the project without any administrators
  const adminCount = project.projectMembers.filter(
    member => member.role.roleName === 'administrator'
  ).length;
  
  const targetMember = project.projectMembers[targetIndex];
  if (targetMember.role.roleName === 'administrator' && adminCount <= 1) {
    throw new Error('Cannot remove the last administrator from the project');
  }

  // Remove from project
  project.projectMembers.splice(targetIndex, 1);
  await project.save();

  // Remove project from user's userProjects
  await User.findByIdAndUpdate(
    targetUserId,
    { $pull: { userProjects: projectId } }
  );
  
  return { success: true };
}

/**
 * Updates basic project information (name and description)
 * @async
 * @function updateProjectDetails
 * @param {string} projectId - ID of the project to update
 * @param {string} userId - ID of the user requesting update (must be admin)
 * @param {Object} updateData - Object containing update fields
 * @param {string} [updateData.projectName] - New project name
 * @param {string} [updateData.projectDescription] - New project description
 * @returns {Promise<Object>} The updated project document
 * @throws {Error} When project is not found
 * @throws {Error} When user is not an administrator
 * @description Updates project metadata with admin authorization requirement
 */
async function updateProjectDetails(projectId, userId, updateData) {
  const project = await Project.findById(projectId).populate('projectMembers.role');
  if (!project) throw new Error('Project not found');

  // Check if user is an admin
  const userMember = project.projectMembers.find(
    member => member.user.toString() === userId && member.role.roleName === 'administrator'
  );
  if (!userMember) throw new Error('Only project administrators can update project details');

  // Update allowed fields
  if (updateData.projectName !== undefined) project.projectName = updateData.projectName;
  if (updateData.projectDescription !== undefined) project.projectDescription = updateData.projectDescription;
  
  await project.save();
  return project;
}

/**
 * Updates project configuration settings with invite link management
 * @async
 * @function updateProjectSettings
 * @param {string} projectId - ID of the project to update settings for
 * @param {string} userId - ID of the user requesting update (must be admin)
 * @param {Object} settings - Settings object to update
 * @param {boolean} [settings.joinByLinkEnabled] - Whether invite links are enabled
 * @param {boolean} [settings.pdfGenerationEnabled] - Whether PDF generation is enabled
 * @returns {Promise<Object>} The updated project document
 * @throws {Error} When project is not found
 * @throws {Error} When user is not an administrator
 * @description Updates project settings and automatically manages invite links based on configuration
 */
async function updateProjectSettings(projectId, userId, settings) {
  const project = await Project.findById(projectId).populate('projectMembers.role');
  if (!project) throw new Error('Project not found');

  // Check if user is an admin
  const userMember = project.projectMembers.find(
    member => member.user.toString() === userId && member.role.roleName === 'administrator'
  );
  if (!userMember) throw new Error('Only project administrators can update project settings');

  // Ensure settings object exists (for existing projects that don't have it)
  if (!project.settings) {
    project.settings = {
      joinByLinkEnabled: true,
      pdfGenerationEnabled: true
    };
  }

  // Update settings
  if (settings.joinByLinkEnabled !== undefined) {
    project.settings.joinByLinkEnabled = settings.joinByLinkEnabled;
    
    // If disabling join by link, remove existing invite links
    if (!settings.joinByLinkEnabled) {
      await InviteLink.deleteMany({ projectId });
    }
  }
  
  if (settings.pdfGenerationEnabled !== undefined) {
    project.settings.pdfGenerationEnabled = settings.pdfGenerationEnabled;
  }

  await project.save();
  return project;
}

/**
 * Allows a user to leave a project with admin delegation checks
 * @async
 * @function leaveProject
 * @param {string} projectId - ID of the project to leave
 * @param {string} userId - ID of the user leaving the project
 * @returns {Promise<Object>} Success confirmation object
 * @throws {Error} When project is not found
 * @throws {Error} When user is the project owner (cannot leave)
 * @throws {Error} When user is not a project member
 * @throws {Error} When user is the last administrator
 * @description Handles project departure with validation to ensure administrative coverage
 */
async function leaveProject(projectId, userId) {
  const project = await Project.findById(projectId).populate('projectMembers.role');
  if (!project) throw new Error('Project not found');

  // Check if user is the project owner
  if (project.projectOwner.toString() === userId) {
    throw new Error('Project owner cannot leave the project. Transfer ownership or delete the project instead.');
  }

  // Find user in project members
  const memberIndex = project.projectMembers.findIndex(
    member => member.user.toString() === userId
  );
  if (memberIndex === -1) throw new Error('You are not a member of this project');

  const userMember = project.projectMembers[memberIndex];
  const userRole = await Role.findById(userMember.role);

  // If user is an admin, check if they are the last admin
  if (userRole && userRole.roleName === 'administrator') {
    const adminCount = project.projectMembers.filter(member => 
      member.role.toString() === userRole._id.toString()
    ).length;
    
    if (adminCount <= 1) {
      throw new Error('You are the last administrator and cannot leave the project. Please delete the project or assign another member as administrator first.');
    }
  }

  // Remove user from project
  project.projectMembers.splice(memberIndex, 1);
  await project.save();

  // Remove project from user's userProjects
  await User.findByIdAndUpdate(userId, { $pull: { userProjects: projectId } });

  return { success: true };
}





/**
 * Permanently deletes a project and all associated data
 * @async
 * @function deleteProject
 * @param {string} projectId - ID of the project to delete
 * @param {string} userId - ID of the user requesting deletion (must be admin)
 * @returns {Promise<Object>} Success confirmation object
 * @throws {Error} When project is not found
 * @throws {Error} When user is not an administrator
 * @description Cascades deletion to tasks, invite links, and user associations
 */
async function deleteProject(projectId, userId) {
  const project = await Project.findById(projectId).populate('projectMembers.role');
  if (!project) throw new Error('Project not found');

  // Check if user is an admin
  const userMember = project.projectMembers.find(
    member => member.user.toString() === userId && member.role.roleName === 'administrator'
  );
  if (!userMember) throw new Error('Only project administrators can delete projects');

  // Delete all associated tasks
  await Task.deleteMany({ _id: { $in: project.projectTasks } });

  // Delete invite links
  await InviteLink.deleteMany({ projectId });

  // Remove project from all users' userProjects
  const memberIds = project.projectMembers.map(member => member.user);
  await User.updateMany(
    { _id: { $in: memberIds } },
    { $pull: { userProjects: projectId } }
  );

  // Delete the project
  await Project.findByIdAndDelete(projectId);

  return { success: true };
}

/**
 * Disables all invite links for a project
 * @async
 * @function disableProjectInviteLinks
 * @param {string} projectId - ID of the project to disable invites for
 * @param {string} userId - ID of the user requesting action (must be admin)
 * @returns {Promise<Object>} Success confirmation object
 * @throws {Error} When project is not found
 * @throws {Error} When user is not an administrator
 * @description Removes all invite links and updates project settings to disable future invites
 */
async function disableProjectInviteLinks(projectId, userId) {
  const project = await Project.findById(projectId).populate('projectMembers.role');
  if (!project) throw new Error('Project not found');

  // Check if user is an admin
  const userMember = project.projectMembers.find(
    member => member.user.toString() === userId && member.role.roleName === 'administrator'
  );
  if (!userMember) throw new Error('Only project administrators can manage invite links');

  // Delete all invite links and update settings
  await InviteLink.deleteMany({ projectId });
  project.settings.joinByLinkEnabled = false;
  await project.save();

  return { success: true };
}


module.exports = {
  createProject,
  createTask,
  deleteTask,
  updateTask,
  assignTask,
  generateInviteLink,
  editTaskProgress,
  joinProjectViaInvite,
  getProjectDetailsFromInvite,
  removeMemberFromProject,
  updateProjectDetails,
  updateProjectSettings,
  leaveProject,
  deleteProject,
  disableProjectInviteLinks
};