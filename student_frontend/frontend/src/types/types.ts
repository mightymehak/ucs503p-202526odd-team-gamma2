// src/types/types.ts

export type Role = 'student' | 'admin';

export interface User {
  name: string;
  email: string;
  password: string;
}

export interface ComplaintItem {
  id: number;
  title: string;
  status: string;
}

export interface SummaryData {
  lost: number;
  matched: number;
  resolved: number;
}

export interface Complaint {
  id: number;
  category: string;
  itemName: string;
  location: string;
  dateFound: string;
  photo: string | null;
}