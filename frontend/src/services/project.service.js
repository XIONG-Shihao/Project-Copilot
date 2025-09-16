import axios from 'axios';

const API_URL = 'http://localhost:3000/api/';

const createProject = (projectName, projectDescription) => {
  return axios.post(API_URL + 'projects/create', {
    projectName,
    projectDescription
  }, { withCredentials: true });
};

const getUserProjects = () => {
  return axios.get(API_URL + 'projects/user-projects', { withCredentials: true });
};

const getProjectById = (projectId) => {
  return axios.get(API_URL + `projects/${projectId}`, { withCredentials: true });
};

const createTask = (projectId, taskName, taskDescription, taskDeadline) => {
  return axios.post(
    API_URL + `projects/${projectId}/task`,
    { taskName, taskDescription, taskDeadline },
    { withCredentials: true }
  );
};

const updateTask = (projectId, taskId, updates) => {
  return axios.put(
    API_URL + `projects/${projectId}/task/${taskId}`,
    updates,
    { withCredentials: true }
  );
};

const deleteTask = (projectId, taskId) => {
  return axios.delete(
    API_URL + `projects/${projectId}/task/${taskId}`,
    { withCredentials: true }
  );
};

const assignRole = (projectId, memberId, role) => {
  return axios.put(
    API_URL + `projects/${projectId}/members/${memberId}/role`,
    { role },
    { withCredentials: true }
  );
};

const assignTask = (projectId, taskId, memberId) => {
  return axios.put(
    API_URL + `projects/${projectId}/task/${taskId}/assign/${memberId}`,
    {},
    { withCredentials: true }
  );
};

const generateInviteLink = (projectId) => {
  return axios.post(
    API_URL + `projects/${projectId}/invite`,
    {},
    { withCredentials: true }
  );
};

const getProjectDetailsFromInvite = (inviteToken) => {
  return axios.get(
    API_URL + `projects/invite/details?token=${inviteToken}`,
    { withCredentials: true }
  );
};

const joinProjectViaInvite = (inviteToken) => {
  return axios.post(
    API_URL + 'projects/join',
    { token: inviteToken },
    { withCredentials: true }
  );
};

const exportProjectSummary = (projectId) => {
  return axios.get(
    API_URL + `projects/${projectId}/export-summary`,
    { 
      withCredentials: true,
      responseType: 'blob' // Important for PDF downloads
    }
  );
};

const removeMember = (projectId, targetUserId) => {
  return axios.post(
    API_URL + 'projects/remove-member',
    { projectId, targetUserId },
    { withCredentials: true }
  );
};

// Project settings functions
const updateProjectDetails = (projectId, projectName, projectDescription) => {
  return axios.put(
    API_URL + `projects/${projectId}/details`,
    { projectName, projectDescription },
    { withCredentials: true }
  );
};

const updateProjectSettings = (projectId, settings) => {
  return axios.put(
    API_URL + `projects/${projectId}/settings`,
    { settings },
    { withCredentials: true }
  );
};

const leaveProject = (projectId) => {
  return axios.post(
    API_URL + `projects/${projectId}/leave`,
    {},
    { withCredentials: true }
  );
};





const deleteProject = (projectId) => {
  return axios.delete(
    API_URL + `projects/${projectId}`,
    { withCredentials: true }
  );
};

const disableProjectInviteLinks = (projectId) => {
  return axios.post(
    API_URL + `projects/${projectId}/disable-invite-links`,
    {},
    { withCredentials: true }
  );
};

// Post-related functions
const getProjectPosts = (projectId) => {
  return axios.get(
    API_URL + `posts/project/${projectId}/posts`,
    { withCredentials: true }
  );
};

const createPost = (projectId, postData) => {
  // Always send as JSON (including Base64 image data if present)
  const payload = {
    title: postData.title,
    content: postData.content,
    postType: postData.postType
  };
  
  // Add image data if present
  if (postData.imageData && postData.imageType) {
    payload.imageData = postData.imageData;
    payload.imageType = postData.imageType;
  }
  
  return axios.post(
    API_URL + `posts/project/${projectId}/posts`,
    payload,
    { withCredentials: true }
  );
};

const getPost = (postId) => {
  return axios.get(
    API_URL + `posts/posts/${postId}`,
    { withCredentials: true }
  );
};

const togglePostLike = (postId) => {
  return axios.post(
    API_URL + `posts/posts/${postId}/like`,
    {},
    { withCredentials: true }
  );
};

const createComment = (postId, content, parentCommentId = null) => {
  return axios.post(
    API_URL + `posts/posts/${postId}/comments`,
    { content, parentCommentId },
    { withCredentials: true }
  );
};

const updatePost = (postId, postData) => {
  return axios.put(
    API_URL + `posts/posts/${postId}`,
    postData,
    { withCredentials: true }
  );
};

const deletePost = (postId) => {
  return axios.delete(
    API_URL + `posts/posts/${postId}`,
    { withCredentials: true }
  );
};

const deleteComment = (commentId) => {
  return axios.delete(
    API_URL + `posts/comments/${commentId}`,
    { withCredentials: true }
  );
};

const ProjectService = {
  createProject,
  getUserProjects,
  getProjectById,
  createTask,
  updateTask,
  deleteTask,
  assignRole,
  assignTask,
  generateInviteLink,
  getProjectDetailsFromInvite,
  joinProjectViaInvite,
  exportProjectSummary,
  removeMember,
  updateProjectDetails,
  updateProjectSettings,
  leaveProject,
  deleteProject,
  disableProjectInviteLinks,
  // Post functions
  getProjectPosts,
  createPost,
  getPost,
  updatePost,
  deletePost,
  togglePostLike,
  createComment,
  deleteComment
};

export default ProjectService;
