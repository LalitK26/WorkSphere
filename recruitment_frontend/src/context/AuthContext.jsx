import React, { createContext, useState, useContext, useEffect } from 'react';
import { recruitmentAuthService } from '../api/recruitmentAuthService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = recruitmentAuthService.getCurrentUser();
    const token = recruitmentAuthService.getToken();
    if (storedUser && token) {
      setUser(storedUser);
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    try {
      const response = await recruitmentAuthService.login(email, password);
      const userData = {
        userId: response.userId,
        email: response.email,
        role: response.role,
        fullName: response.fullName,
        phoneNumber: response.phoneNumber,
        isProfileComplete: response.isProfileComplete,
      };
      localStorage.setItem('recruitment_token', response.token);
      localStorage.setItem('recruitment_user', JSON.stringify(userData));
      setUser(userData);
      return response;
    } catch (error) {
      throw error;
    }
  };

  const refreshUser = () => {
    const storedUser = recruitmentAuthService.getCurrentUser();
    if (storedUser) {
      setUser(storedUser);
    }
  };

  const logout = () => {
    recruitmentAuthService.logout();
    setUser(null);
  };

  const isRecruitmentAdmin = () => {
    return user?.role === 'RECRUITMENT_ADMIN';
  };

  const isRecruiter = () => {
    return user?.role === 'RECRUITER';
  };

  const isAdminOrRecruiter = () => {
    return isRecruitmentAdmin() || isRecruiter();
  };

  const isCandidate = () => {
    return user?.role === 'CANDIDATE';
  };

  const isProfileComplete = () => {
    return user?.isProfileComplete === true;
  };

  const isTechnicalInterviewer = () => {
    return user?.role === 'TECHNICAL_INTERVIEWER';
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser, isRecruitmentAdmin, isRecruiter, isAdminOrRecruiter, isCandidate, isProfileComplete, isTechnicalInterviewer }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

