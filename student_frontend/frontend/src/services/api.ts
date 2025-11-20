// src/services/api.ts
import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosError } from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Types for API responses
interface AuthResponse {
  _id: string;
  name: string;
  email: string;
  role: string;
  token: string;
}

interface LoginData {
  email: string;
  password: string;
  role: string;
}

interface AdminLoginData {
  email: string;
  password: string;
  uniqueId: string;
}

interface RegisterData {
  name: string;
  email: string;
  password: string;
}

interface ComplaintResponse {
  _id: string;
  userId: string;
  category: string;
  itemName: string;
  location: string;
  dateFound: string;
  photo: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface StatsResponse {
  lost: number;
  matched: number;
  resolved: number;
}

// Auth API
export const authAPI = {
  register: async (data: RegisterData): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/register', data);
    return response.data;
  },
  
  login: async (data: LoginData): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/login', data);
    return response.data;
  },
  
  loginAdmin: async (data: AdminLoginData): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/admin-login', data);
    return response.data;
  },
  
  getCurrentUser: async (): Promise<Omit<AuthResponse, 'token'>> => {
    const response = await api.get<Omit<AuthResponse, 'token'>>('/auth/me');
    return response.data;
  },
  
  getCurrentAdmin: async (): Promise<Omit<AuthResponse, 'token'>> => {
    const response = await api.get<Omit<AuthResponse, 'token'>>('/auth/admin-me');
    return response.data;
  },
};

// Complaints API
export const complaintsAPI = {
  create: async (formData: FormData): Promise<ComplaintResponse> => {
    const response = await api.post<ComplaintResponse>('/complaints', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
  
  getAll: async (): Promise<ComplaintResponse[]> => {
    const response = await api.get<ComplaintResponse[]>('/complaints');
    return response.data;
  },
  
  getStats: async (): Promise<StatsResponse> => {
    const response = await api.get<StatsResponse>('/complaints/stats');
    return response.data;
  },
  
  getOne: async (id: string): Promise<ComplaintResponse> => {
    const response = await api.get<ComplaintResponse>(`/complaints/${id}`);
    return response.data;
  },
  
  delete: async (id: string): Promise<{ message: string }> => {
    const response = await api.delete<{ message: string }>(`/complaints/${id}`);
    return response.data;
  },
};

export default api;