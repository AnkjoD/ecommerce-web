import React, { createContext, useState, useEffect, useCallback, useRef } from 'react';
import { AuthUser } from '../types/auth';
import { getProfileFromLS, setProfileToLS, clearLS, LocalStorageEventTarget } from '../utils/auth';
import authApi from '../apis/auth.api';

type AuthStatus = 'initializing' | 'authenticated' | 'unauthenticated';

interface AuthContextType {
  user: AuthUser | null;
  status: AuthStatus;
  login: (user: AuthUser) => void;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(getProfileFromLS());
  const [status, setStatus] = useState<AuthStatus>('initializing');
  const isFirstCheckUsed = useRef(false);

  const refreshProfile = useCallback(async () => {
    console.log('[Auth] Refreshing profile...');
    try {
      const profile = await authApi.getMe();
      console.log('[Auth] Profile fetched successfully:', profile.email);
      setProfileToLS(profile);
      setUser(profile);
      setStatus('authenticated');
    } catch (error) {
      console.warn('[Auth] Session check failed or expired');
      clearLS();
      setUser(null);
      setStatus('unauthenticated');
    }
  }, []);

  useEffect(() => {
    const handleSync = () => {
      console.log('[Auth] Syncing state with LocalStorage...');
      const profile = getProfileFromLS();
      setUser(profile);
      setStatus(profile ? 'authenticated' : 'unauthenticated');
    };

    LocalStorageEventTarget.addEventListener('clearLS', handleSync);
    
    // Khởi tạo session check - Chỉ chạy 1 lần duy nhất khi Mount
    if (!isFirstCheckUsed.current) {
      isFirstCheckUsed.current = true;
      refreshProfile();
    }

    return () => {
      LocalStorageEventTarget.removeEventListener('clearLS', handleSync);
    };
  }, [refreshProfile]);

  const login = (userData: AuthUser) => {
    console.log('[Auth] Logging in user:', userData.email);
    setProfileToLS(userData);
    setUser(userData);
    setStatus('authenticated');
  };

  const logout = async () => {
    console.log('[Auth] Logging out...');
    try {
      await authApi.logout();
    } finally {
      clearLS();
      setUser(null);
      setStatus('unauthenticated');
    }
  };

  return (
    <AuthContext.Provider value={{ user, status, login, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};
