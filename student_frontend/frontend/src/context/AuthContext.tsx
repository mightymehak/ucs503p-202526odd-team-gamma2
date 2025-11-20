// src/context/AuthContext.tsx
import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { authAPI } from '../services/api';

interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
}

interface AuthResult {
  success: boolean;
  user?: User;
  message?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, passwordOrUniqueId: string, role: string, uniqueId?: string) => Promise<AuthResult>;
  register: (name: string, email: string, password: string) => Promise<AuthResult>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));

  useEffect(() => {
    const initAuth = async () => {
      if (token) {
        try {
          const storedRole = localStorage.getItem('role');
          if (storedRole === 'admin') {
            const adminData = await authAPI.getCurrentAdmin();
            setUser(adminData as User);
          } else if (storedRole === 'student') {
            const userData = await authAPI.getCurrentUser();
            setUser(userData as User);
          } else {
            const parts = token.split('.');
            const payload = parts[1] ? JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'))) : {};
            const t = payload?.type;
            if (t === 'admin') {
              const adminData = await authAPI.getCurrentAdmin();
              setUser(adminData as User);
            } else {
              const userData = await authAPI.getCurrentUser();
              setUser(userData as User);
            }
          }
        } catch (error: any) {
          if (error.response?.status === 401 || error.response?.status === 403) {
            localStorage.removeItem('token');
            localStorage.removeItem('role');
            setToken(null);
          } else if (error.code === 'ERR_NETWORK' || error.message?.includes('ERR_CONNECTION_REFUSED')) {
            console.warn('Backend server is not running. Please start the Node.js backend server.');
          }
        }
      }
      setLoading(false);
    };

    initAuth();
  }, [token]);

  const login = async (email: string, passwordOrUniqueId: string, role: string, uniqueId?: string): Promise<AuthResult> => {
    try {
      let data;
      if (role === 'admin') {
        if (!uniqueId) {
          throw new Error('Unique ID is required for admin login');
        }
        data = await authAPI.loginAdmin({ email, password: passwordOrUniqueId, uniqueId });
      } else {
        data = await authAPI.login({ email, password: passwordOrUniqueId, role });
      }
      localStorage.setItem('token', data.token);
      localStorage.setItem('role', data.role);
      setToken(data.token);
      const userData: User = {
        _id: data._id,
        name: data.name,
        email: data.email,
        role: data.role,
      };
      setUser(userData);
      return { success: true, user: userData };
    } catch (error: any) {
      return { 
        success: false, 
        message: error.response?.data?.message || 'Login failed' 
      };
    }
  };

  const register = async (name: string, email: string, password: string): Promise<AuthResult> => {
    try {
      const data = await authAPI.register({ name, email, password });
      localStorage.setItem('token', data.token);
      setToken(data.token);
      const userData: User = {
        _id: data._id,
        name: data.name,
        email: data.email,
        role: data.role,
      };
      setUser(userData);
      return { success: true, user: userData };
    } catch (error: any) {
      return { 
        success: false, 
        message: error.response?.data?.message || 'Registration failed' 
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    setToken(null);
    setUser(null);
  };

  const value: AuthContextType = {
    user,
    loading,
    login,
    register,
    logout,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};