import axios from 'axios';

// Usar VITE_API_URL do .env, ou default para localhost:3001
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para tratamento de erros
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.error('Não autorizado');
    }
    return Promise.reject(error);
  }
);

export default apiClient;
