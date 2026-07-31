import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000/api',
  withCredentials: true // Important for sending/receiving httpOnly cookies
});

// Request interceptor to add the access token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('hris_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => Promise.reject(error));

// Response interceptor to catch 401 and refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // If error is 401 and we haven't retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const { data } = await axios.post('http://localhost:3000/api/auth/refresh', {}, { withCredentials: true });
        
        // Update new access token
        localStorage.setItem('hris_token', data.token);
        
        // Retry original request
        originalRequest.headers.Authorization = `Bearer ${data.token}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed, force logout
        localStorage.removeItem('hris_token');
        localStorage.removeItem('hris_user');
        window.location.href = '/'; // redirect to login
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

export default api;
