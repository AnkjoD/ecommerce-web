import { useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return {
    user: context.user,
    status: context.status,
    loading: context.status === 'initializing',
    signOut: context.logout,
    login: context.login,
    refreshProfile: context.refreshProfile
  };
}
