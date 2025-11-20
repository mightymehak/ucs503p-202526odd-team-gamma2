// src/services/fastApiService.ts
// API service for FastAPI backend integration
import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';

const resolveBaseUrl = () => {
  const envUrl = process.env.REACT_APP_FASTAPI_URL;
  if (envUrl) return envUrl;
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') {
      return 'http://localhost:8000/api';
    }
  }
  return 'https://lostandfound-634i.onrender.com/api';
};
const FASTAPI_URL = resolveBaseUrl();

// Create axios instance for FastAPI
const fastApi: AxiosInstance = axios.create({
  baseURL: FASTAPI_URL,
});

// Add token to requests if available
fastApi.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Types for FastAPI responses
export interface ComplaintSubmissionResponse {
  status: string;
  message: string;
  job_id: string;
}

export interface StatusResponse {
  status: 'pending' | 'matched' | 'no_match' | 'high_confidence' | 'medium_confidence' | 'error' | 'complete';
  message?: string;
  matches?: MatchResult[];
  [key: string]: any; // Allow additional fields from backend
}

export interface MatchResult {
  meta: {
    location?: string;
    date?: string;
    type?: string;
    [key: string]: any;
  };
  score: number;
}

// FastAPI API service
export const fastApiService = {
  // Submit user complaint
  submitComplaint: async (
    file: File,
    location: string,
    itemName: string,
    date?: string,
    userId?: string,
    userName?: string
  ): Promise<ComplaintSubmissionResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('location', location);
    formData.append('itemName', itemName);
    if (date) {
      formData.append('date', date);
    }
    if (userId) {
      formData.append('userId', userId);
    }
    if (userName) {
      formData.append('userName', userName);
    }

    const response = await fastApi.post<ComplaintSubmissionResponse>(
      '/user/complaint',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  },

  // Submit admin found item
  submitFoundItem: async (
    file: File,
    location: string,
    itemName: string,
    date?: string
  ): Promise<ComplaintSubmissionResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('location', location);
    formData.append('itemName', itemName);
    if (date) {
      formData.append('date', date);
    }

    const response = await fastApi.post<ComplaintSubmissionResponse>(
      '/admin/found',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  },

  // Check status of a job
  checkStatus: async (jobId: string): Promise<StatusResponse> => {
    const response = await fastApi.get<StatusResponse>(`/results/${jobId}`);
    return response.data;
  },

  // Get all complaints for the current user
  getUserComplaints: async (userId?: string): Promise<ComplaintItem[]> => {
    const response = await fastApi.get<{ complaints: ComplaintItem[] }>(
      '/user/complaints',
      { params: userId ? { userId } : undefined }
    );
    return response.data.complaints;
  },

  // Get a specific complaint by job_id
  getComplaintById: async (jobId: string): Promise<ComplaintItem | null> => {
    try {
      const response = await fastApi.get<ComplaintItem>(`/user/complaints/${jobId}`);
      return response.data;
    } catch (err: any) {
      if (err?.response?.status === 404) {
        return null;
      }
      throw err;
    }
  },
  
  deleteComplaint: async (jobId: string): Promise<{ status: string; job_id: string }> => {
    try {
      const response = await fastApi.delete<{ status: string; job_id: string }>(`/user/complaints/${jobId}`);
      return response.data;
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 405) {
        const response = await fastApi.post<{ status: string; job_id: string }>(`/user/complaints/${jobId}/delete`);
        return response.data;
      }
      throw err;
    }
  },
  
  getAdminLostItems: async (): Promise<ComplaintItem[]> => {
    const response = await fastApi.get<{ lost_items: ComplaintItem[] }>(`/admin/lost-items`);
    return response.data.lost_items;
  },
  getAdminLostItemsFaiss: async (): Promise<ComplaintItem[]> => {
    const response = await fastApi.get<{ lost_items: ComplaintItem[] }>(`/admin/lost-items-faiss`);
    return response.data.lost_items;
  },
  getAdminFoundItems: async (): Promise<ComplaintItem[]> => {
    const response = await fastApi.get<{ found_items: ComplaintItem[] }>(`/admin/found-items`);
    return response.data.found_items;
  },
  deleteFoundItem: async (jobId: string): Promise<{ status: string; job_id: string }> => {
    try {
      const response = await fastApi.delete<{ status: string; job_id: string }>(`/admin/found/${jobId}`);
      return response.data;
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 405) {
        const response = await fastApi.post<{ status: string; job_id: string }>(`/admin/found/${jobId}/delete`);
        return response.data;
      }
      throw err;
    }
  },
  getImageUrl: (jobId: string): string => {
    return `${FASTAPI_URL}/image/${jobId}`;
  },
};

// Complaint item interface matching FastAPI response
export interface ComplaintItem {
  job_id: string;
  type: string;
  location: string;
  date?: string;
  itemName: string;
  timestamp: number;
  status: 'pending' | 'matched' | 'no_match' | 'high_confidence' | 'medium_confidence';
  matches?: MatchResult[];
  message?: string;
  user_id?: string;
  user_name?: string;
  image_url?: string;
  processed_at?: number;
}

export default fastApiService;

