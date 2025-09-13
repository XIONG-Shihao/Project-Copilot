/**
 * @fileoverview Role management service module for handling user roles and permissions
 * @module services/roleServices
 */

const Role = require('../models/roles');
const Project = require('../models/project');

/**
 * Seeds the database with default system roles
 * @async
 * @function seedDefaultRoles
 * @returns {Promise<void>}
 * @description Creates default roles (administrator, developer, viewer) if they don't exist
 */
async function seedDefaultRoles() {
  const defaultRoles = ['administrator', 'developer', 'viewer'];

  for (const roleName of defaultRoles) {
    const exists = await Role.findOne({ roleName });
    if (!exists) {
      await Role.create({ roleName });
    }
  }
}

/**
 * Assigns a role to a project member with admin authorization and validation
 * @async
 * @function assignRole
 * @param {string} projectId - ID of the project containing the member
 * @param {string} memberId - ID of the member to assign role to
 * @param {string} userId - ID of the user making the assignment (must be admin)
 * @param {string} roleName - Name of the role to assign
 * @returns {Promise<Object>} Updated project document with populated members and roles
 * @throws {Error} When project is not found
 * @throws {Error} When requesting user is not a project member
 * @throws {Error} When requesting user is not an administrator
 * @throws {Error} When target member is not found
 * @throws {Error} When trying to demote the last administrator
 * @throws {Error} When specified role is not found
 * @description Manages role assignments with validation to maintain at least one administrator
 */
async function assignRole(projectId, memberId, userId, roleName) {
  const project = await Project.findById(projectId).populate('projectMembers.role');
  if (!project) throw new Error('Project not found');

  // Find the requesting user's role in the project
  const requestingMember = project.projectMembers.find(m => m.user.toString() === userId);
  if (!requestingMember) throw new Error('You are not a member of this project');
  const requestingRole = await Role.findById(requestingMember.role);
  if (!requestingRole || requestingRole.roleName !== 'administrator') {
    throw new Error('Only administrators can assign roles');
  }

  // Find the member to update
  const member = project.projectMembers.find(m => m.user.toString() === memberId);
  if (!member) throw new Error('Member not found');

  // If demoting an administrator, ensure at least one remains
  if (member.role) {
    const currentRole = await Role.findById(member.role);
    if (currentRole && currentRole.roleName === 'administrator' && roleName !== 'administrator') {
      // Count administrators
      const adminRole = await Role.findOne({ roleName: 'administrator' });
      const adminCount = project.projectMembers.filter(m => m.role && m.role.equals(adminRole._id)).length;
      if (adminCount <= 1) {
        throw new Error('There must be at least one administrator');
      }
    }
  }

  // Assign the new role
  const newRole = await Role.findOne({ roleName });
  if (!newRole) throw new Error('Role not found');
  member.role = newRole._id;
  await project.save();

  // Return updated project with populated members and roles
  const updatedProject = await Project.findById(projectId)
    .populate({ path: 'projectMembers.user', select: 'name email' })
    .populate({ path: 'projectMembers.role', select: 'roleName' });
  return updatedProject;
}

module.exports = {
  seedDefaultRoles,
  assignRole,
  
};