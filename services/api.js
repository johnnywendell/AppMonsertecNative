import axios from 'axios';
import { getStoredTokens, refreshAccessToken, clearTokens } from './authService';

export const BASE_URL = 'http://192.168.0.5:8000/';

export const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
});

// Interceptor de requisição
api.interceptors.request.use(
  async (config) => {
    const { access } = await getStoredTokens();
    if (access) {
      config.headers.Authorization = `Bearer ${access}`;
    }
    console.log('Requisição enviada:', config.url, config.headers);
    return config;
  },
  (err) => {
    console.error('Erro no interceptor de requisição:', err);
    return Promise.reject(err);
  }
);

// Interceptor de resposta para renovação de token
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalReq = error.config;
    if (error.response?.status === 401 && !originalReq._retry) {
      originalReq._retry = true;
      try {
        const newAccess = await refreshAccessToken();
        originalReq.headers.Authorization = `Bearer ${newAccess}`;
        return api(originalReq); // Reenvia a requisição com o novo token
      } catch (refreshError) {
        await clearTokens();
        // Aqui você deve redirecionar o usuário para o login
        console.log('Token inválido, redirecionando para login...');
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);