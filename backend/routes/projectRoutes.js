const express = require('express');
const { createProject, getUserProjects, getProjectById, createTask, deleteTask, updateTask, assignTask, generateInviteLink, joinProjectViaInvite, editTaskProgress, getProjectDetailsFromInvite, removeMember, exportProjectSummary, updateProjectDetails, updateProjectSettings, leaveProject, deleteProject, disableProjectInviteLinks } = require('../controllers/projectController');
const { verifyToken } = require('../middleware/auth');
const roleController = require('../controllers/roleController');

const router = express.Router();

// All project routes require authentication
router.use(verifyToken);

router.post('/create', createProject);
router.get('/user-projects', getUserProjects);
router.get('/:projectId', verifyToken, getProjectById);
router.post('/:projectId/task', createTask);
router.delete('/:projectId/task/:taskId', deleteTask);
router.put('/:projectId/task/:taskId', updateTask);
router.put('/:projectId/members/:memberId/role', roleController.assignRole);
router.put('/:projectId/task/:taskId/assign/:memberId', assignTask);
router.post('/:projectId/invite', generateInviteLink);
router.put('/:projectId/task/:taskId/progress', editTaskProgress);
router.post('/join', joinProjectViaInvite);
router.get('/invite/details', getProjectDetailsFromInvite);
router.post('/remove-member', removeMember);
router.get('/:projectId/export-summary', exportProjectSummary);

// Project settings routes
router.put('/:projectId/details', updateProjectDetails);
router.put('/:projectId/settings', updateProjectSettings);
router.post('/:projectId/leave', leaveProject);
router.delete('/:projectId', deleteProject);
router.post('/:projectId/disable-invite-links', disableProjectInviteLinks);

module.exports = router; 