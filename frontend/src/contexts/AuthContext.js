import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getApiUrl } from '../utils/apiConfig';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchUser = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setUser(null);
      return false;
    }

    try {
      
      const response = await fetch(getApiUrl('/team-roster/me'), {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('token');
          setUser(null);
          return false;
        }
        throw new Error(`Failed to fetch user data: ${response.status} ${response.statusText}`);
      }

      const userData = await response.json();
      
      setUser(userData);
      return true;
    } catch (error) {
      console.error('Error fetching user:', error);
      setUser(null);
      return false;
    }
  };

  useEffect(() => {
    const checkAuth = async () => {
      setLoading(true);
      const isAuthenticated = await fetchUser();
      if (!isAuthenticated && !window.location.pathname.startsWith('/login')) {
        navigate('/login', { replace: true });
      }
      setLoading(false);
    };
    checkAuth();
  }, [navigate]);

  const login = async (username, password) => {
    try {
      const response = await fetch(getApiUrl('/team-roster/login'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          username,
          password,
        }),
      });

      if (!response.ok) {
        throw new Error('Login failed');
      }

      const data = await response.json();
      localStorage.setItem('token', data.access_token);
      await fetchUser();
      return true;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    navigate('/login');
  };

  const updateUser = (newUserData) => {
    setUser(newUserData);
  };

  const value = {
    user,
    loading,
    login,
    logout,
    updateUser,
    fetchUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext; 