// src/services/fastApiService.ts
// API service for FastAPI backend integration
import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';

const FASTAPI_URL = process.env.REACT_APP_FASTAPI_URL || 'https://lostandfound-634i.onrender.com/api';

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
  getUserComplaints: async (): Promise<ComplaintItem[]> => {
    const response = await fastApi.get<{ complaints: ComplaintItem[] }>('/user/complaints');
    return response.data.complaints;
  },

  // Get a specific complaint by job_id
  getComplaintById: async (jobId: string): Promise<ComplaintItem> => {
    const response = await fastApi.get<ComplaintItem>(`/user/complaints/${jobId}`);
    return response.data;
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
  processed_at?: number;
}

export default fastApiService;

