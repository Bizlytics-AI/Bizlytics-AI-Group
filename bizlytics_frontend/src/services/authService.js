import api from '../utils/api';

const authService = {
  // Company Registration
  registerCompany: async (companyData) => {
    const response = await api.post('/auth/company/register', companyData);
    return response.data;
  },

  // HR Registration
  registerHR: async (hrData) => {
    const response = await api.post('/auth/hr/register', hrData);
    return response.data;
  },

  // Login
  login: async (credentials) => {
    const response = await api.post('/auth/login', credentials);
    if (response.data.access_token) {
      localStorage.setItem('access_token', response.data.access_token);
      localStorage.setItem('refresh_token', response.data.refresh_token);
    }
    return response.data;
  },

  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
    }
  },

  getMe: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },

  // Admin: Company Management
  getPendingCompanies: async () => {
    const response = await api.get('/admin/companies/pending');
    return response.data;
  },

  approveCompany: async (companyId) => {
    const response = await api.post(`/admin/companies/${companyId}/approve`);
    return response.data;
  },

  rejectCompany: async (companyId) => {
    const response = await api.post(`/admin/companies/${companyId}/reject`);
    return response.data;
  },

  // Company: HR Management
  getPendingHRs: async () => {
    const response = await api.get('/auth/company/hr/pending');
    return response.data;
  },

  approveHR: async (hrId) => {
    const response = await api.post(`/auth/company/hr/${hrId}/approve`);
    return response.data;
  },

  rejectHR: async (hrId) => {
    const response = await api.post(`/auth/company/hr/${hrId}/reject`);
    return response.data;
  },

  // Forgot Password
  forgotPassword: async (email) => {
    const response = await api.post('/auth/forgot-password', { email });
    return response.data;
  },

  // Reset Password (with token from email link)
  resetPassword: async (token, new_password) => {
    const response = await api.post('/auth/reset-password', { token, new_password });
    return response.data;
  },

  // Change Password (requires auth)
  changePassword: async (current_password, new_password) => {
    const response = await api.post('/auth/change-password', { current_password, new_password });
    return response.data;
  },
};

export default authService;
