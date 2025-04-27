// src/context/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

interface User {
  id: string;
  name: string;
  email: string;
  picture: string;
  age?: string;
  isGoogleUser: boolean;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, age: string) => Promise<void>;
  googleSignIn: (googleData: any) => Promise<void>;
  logout: () => void;
  updateUserAge: (age: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Create a hook to use the auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// API base URL
const API_URL = 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const navigate = useNavigate();

  // Initialize auth state
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('token');
      
      if (storedToken) {
        setToken(storedToken);
        api.defaults.headers.common['x-auth-token'] = storedToken;
        
        try {
          const res = await api.get('/users/me');
          setUser(res.data);
          setIsAuthenticated(true);
        } catch (err) {
          // Token invalid or expired
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setToken(null);
          setUser(null);
        }
      }
      
      setLoading(false);
    };

    initAuth();
  }, []);

  // Set auth token for axios requests
  useEffect(() => {
    if (token) {
      api.defaults.headers.common['x-auth-token'] = token;
    } else {
      delete api.defaults.headers.common['x-auth-token'];
    }
  }, [token]);

  // Register new user
  const register = async (name: string, email: string, password: string, age: string) => {
    setLoading(true);
    try {
      const res = await api.post('/users/register', {
        name,
        email,
        password,
        age
      });

      const { token: newToken, user: userData } = res.data;
      
      localStorage.setItem('token', newToken);
      localStorage.setItem('user', JSON.stringify(userData));
      
      setToken(newToken);
      setUser(userData);
      setIsAuthenticated(true);
      
      navigate('/chat');
    } catch (err: any) {
      throw new Error(err.response?.data?.msg || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  // Login user
  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const res = await api.post('/users/login', {
        email,
        password
      });

      const { token: newToken, user: userData } = res.data;
      
      localStorage.setItem('token', newToken);
      localStorage.setItem('user', JSON.stringify(userData));
      
      setToken(newToken);
      setUser(userData);
      setIsAuthenticated(true);
      
      navigate('/chat');
    } catch (err: any) {
      throw new Error(err.response?.data?.msg || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  // Google Sign In
  const googleSignIn = async (googleData: any) => {
    setLoading(true);
    try {
      const res = await api.post('/users/google', googleData);

      const { token: newToken, user: userData } = res.data;
      
      localStorage.setItem('token', newToken);
      localStorage.setItem('user', JSON.stringify(userData));
      
      setToken(newToken);
      setUser(userData);
      setIsAuthenticated(true);
      
      navigate('/chat');
    } catch (err: any) {
      throw new Error(err.response?.data?.msg || 'Google sign-in failed');
    } finally {
      setLoading(false);
    }
  };

  // Logout
  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
    navigate('/');
  };

  // Update user age
  const updateUserAge = async (age: string) => {
    try {
      const res = await api.put('/users/update-age', { age });
      setUser(res.data);
      localStorage.setItem('user', JSON.stringify(res.data));
      return res.data;
    } catch (err: any) {
      throw new Error(err.response?.data?.msg || 'Failed to update age');
    }
  };

  const value = {
    user,
    token,
    isAuthenticated,
    loading,
    login,
    register,
    googleSignIn,
    logout,
    updateUserAge
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};