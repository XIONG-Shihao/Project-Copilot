import axios from 'axios';

const API_URL = 'http://localhost:3000/api/';

const register = (name, email, password) => {
  return axios.post(API_URL + 'register', {
    name,
    email,
    password
  }, { withCredentials: true });
};

const login = (email, password, rememberMe = false) => {
  return axios.post(API_URL + 'login', {
    email,
    password,
    rememberMe
  }, { withCredentials: true });
};

const logout = () => {
  return axios.post(API_URL + 'logout', {}, { withCredentials: true });
};

const getUserProfile = () => {
  return axios.get(API_URL + 'profile', { withCredentials: true });
};

const updateProfile = (name, email) => {
  return axios.put(API_URL + 'profile', {
    name,
    email
  }, { withCredentials: true });
};

const changePassword = (currentPassword, newPassword) => {
  return axios.post(API_URL + 'changePassword', {
    currentPassword,
    newPassword
  }, { withCredentials: true });
};

const AuthService = {
  register,
  login,
  logout,
  getUserProfile,
  updateProfile,
  changePassword
};

export default AuthService;
