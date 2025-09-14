const roleService = require('../services/roleServices');

/**
 * Assign role to a project member
 * @param {Object} req - Express request object: projectId, memberId in params, role in body
 * @param {Object} res - response object: JSON
 * @returns {void}
 */
async function assignRole(req, res) {
  const { projectId, memberId } = req.params;
  const { role } = req.body;
  const userId = req.user.userId;

  if (!role || !['administrator', 'developer', 'viewer'].includes(role)) {
    return res.status(400).json({ message: 'Invalid role.' });
  }

  try {
    const result = await roleService.assignRole(projectId, memberId, userId, role);
    res.status(200).json({ message: 'Role assigned successfully', project: result });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
}

module.exports = { assignRole }; 