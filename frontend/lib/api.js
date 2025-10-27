import axios from 'axios';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE,
});

// Request interceptor to add auth token
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Unauthorized - redirect to login
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Auth endpoints
export const authAPI = {
  login: (email, password) => api.post('/api/auth/login', { email, password }),
  register: (email, password, name, role) => 
    api.post('/api/auth/register', { email, password, name, role }),
};

// Alert endpoints
export const alertsAPI = {
  getAll: (params = {}) => api.get('/api/alerts', { params }),
  createFromAlert: (alertId, ticketData) => api.post(`/api/alerts/${alertId}/ticket`, ticketData),
};

// Ticket endpoints
export const ticketsAPI = {
  getAll: (params = {}) => api.get('/api/tickets', { params }),
  getById: (id) => api.get(`/api/tickets/${id}`),
  create: (data) => api.post('/api/tickets', data),
  update: (id, data) => api.patch(`/api/tickets/${id}`, data),
};

// Agent endpoints
export const agentsAPI = {
  submitAction: (type, payload) => api.post('/api/agents/act', { type, payload }),
  getActions: (params = {}) => api.get('/api/actions', { params }),
};

// Patch jobs endpoints
export const patchJobsAPI = {
  getAll: (params = {}) => api.get('/api/patch_jobs', { params }),
  create: (data) => api.post('/api/patch_jobs', data),
};

// Analytics endpoints
export const analyticsAPI = {
  getTickets: (from, to) => api.get('/api/analytics/tickets', { params: { from, to } }),
  getAlerts: (from, to) => api.get('/api/analytics/alerts', { params: { from, to } }),
};

export default api;

