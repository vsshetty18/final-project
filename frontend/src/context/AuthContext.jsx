/**
 * frontend/src/context/AuthContext.jsx
 *
 * Authentication context: holds the current user + JWT, persists
 * them to localStorage, and exposes login/logout/register actions
 * used across the app (login page, protected routes, sidebar).
 */

import React, { createContext, useContext, useState, useCallback } from 'react';
import axiosClient from '../api/axiosClient';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('authUser');
    return stored ? JSON.parse(stored) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('authToken'));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const login = useCallback(async (email, password) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axiosClient.post('/auth/login', { email, password });
      const { user: loggedInUser, token: authToken } = response.data.data;

      localStorage.setItem('authToken', authToken);
      localStorage.setItem('authUser', JSON.stringify(loggedInUser));

      setUser(loggedInUser);
      setToken(authToken);
      return { success: true };
    } catch (err) {
      const message = err.response?.data?.message || 'Login failed. Please try again.';
      setError(message);
      return { success: false, message };
    } finally {
      setLoading(false);
    }
  }, []);

  const register = useCallback(async (name, email, password) => {
    setLoading(true);
    setError(null);
    try {
      await axiosClient.post('/auth/register', { name, email, password });
      return { success: true };
    } catch (err) {
      const message = err.response?.data?.message || 'Registration failed. Please try again.';
      setError(message);
      return { success: false, message };
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('authUser');
    setUser(null);
    setToken(null);
  }, []);

  const value = {
    user,
    token,
    isAuthenticated: Boolean(token),
    loading,
    error,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
