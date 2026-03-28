import { createContext, useContext, useState, useCallback } from 'react';
import apiClient from '../lib/axios';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('auth_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState(() => localStorage.getItem('auth_token') || null);

  const isAuthenticated = Boolean(token && user);

  const login = useCallback(async (email, password) => {
    const response = await apiClient.post('/auth/login', { email, password });
    const { token: newToken, user: newUser } = response.data;

    localStorage.setItem('auth_token', newToken);
    localStorage.setItem('auth_user', JSON.stringify(newUser));

    setToken(newToken);
    setUser(newUser);

    return newUser;
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch {
      // Ignore network errors on logout — clear state regardless
    } finally {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
      setToken(null);
      setUser(null);
    }
  }, []);

  const updateUser = useCallback((nextUser) => {
    localStorage.setItem('auth_user', JSON.stringify(nextUser));
    setUser(nextUser);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}

export default AuthContext;
