import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, BASE_URL } from './api';


const ACCESS_TOKEN_KEY = '@access_token';
const REFRESH_TOKEN_KEY = '@refresh_token';

async function storeTokens({ access, refresh }) {
  try {
    await AsyncStorage.multiSet([
      [ACCESS_TOKEN_KEY, access],
      [REFRESH_TOKEN_KEY, refresh],
    ]);
  } catch (error) {
    console.error('Erro ao armazenar tokens:', error);
    throw error;
  }
}

export async function getStoredTokens() {
  try {
    const [[, access], [, refresh]] = await AsyncStorage.multiGet([
      ACCESS_TOKEN_KEY,
      REFRESH_TOKEN_KEY,
    ]);
    return { access, refresh };
  } catch (error) {
    console.error('Erro ao recuperar tokens:', error);
    return { access: null, refresh: null };
  }
}

export const setStoredTokens = async (token) => {
  try {
    await AsyncStorage.setItem('@auth_token', token);
  } catch (error) {
    console.error('Erro ao salvar token:', error);
  }
};

async function clearTokens() {
  try {
    await AsyncStorage.multiRemove([ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY]);
  } catch (error) {
    console.error('Erro ao limpar tokens:', error);
    throw error;
  }
}

export async function login(username, password) {
  try {
    const response = await axios.post(
      `${BASE_URL}api/token/`,
      { username, password },
      { headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' } }
    );

    console.log('Tentando login com:', { username, password });

    const { access, refresh } = response.data;
    if (!access || !refresh) {
      throw new Error('Tokens não retornados pela API');
    }

    await storeTokens({ access, refresh });
    console.log('Login bem-sucedido:', response.data);
    return { success: true };
  } catch (error) {
    console.error('Erro ao fazer login:', {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
    });
    return {
      success: false,
      error: error.response?.data?.detail || 'Usuário ou senha inválidos',
    };
  }
}

async function refreshAccessToken() {
  const { refresh } = await getStoredTokens();
  if (!refresh) throw new Error('Refresh token não encontrado');

  try {
    const response = await axios.post(
      `${BASE_URL}api/token/refresh/`,
      { refresh },
      { headers: { 'Content-Type': 'application/json' } }
    );

    const { access } = response.data;
    await AsyncStorage.setItem(ACCESS_TOKEN_KEY, access);
    return access;
  } catch (error) {
    console.error('Erro ao renovar token:', error.response?.data || error.message);
    throw error;
  }
}

export function setupAxiosInterceptors(onUnauthorized) {
  axios.interceptors.request.use(
    async (config) => {
      const { access } = await getStoredTokens();
      if (access) {
        config.headers.Authorization = `Bearer ${access}`;
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  axios.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalReq = error.config;
      if (error.response?.status === 401 && !originalReq._retry && !originalReq.url.includes('api/token/')) {
        originalReq._retry = true;
        try {
          const newAccess = await refreshAccessToken();
          originalReq.headers.Authorization = `Bearer ${newAccess}`;
          return axios(originalReq);
        } catch (refreshError) {
          await clearTokens();
          onUnauthorized?.();
          return Promise.reject(refreshError);
        }
      }
      return Promise.reject(error);
    }
  );
}

export async function logout() {
  try {
    await clearTokens();
    console.log('Logout bem-sucedido');
  } catch (error) {
    console.error('Erro ao fazer logout:', error);
    throw error;
  }
}