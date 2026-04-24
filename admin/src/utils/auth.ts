import { AuthUser } from '../types/auth';

export const LocalStorageEventTarget = new EventTarget();

export const setProfileToLS = (profile: AuthUser) => {
  localStorage.setItem('homura_admin_profile', JSON.stringify(profile));
};

export const getProfileFromLS = (): AuthUser | null => {
  const result = localStorage.getItem('homura_admin_profile');
  if (result && result !== 'undefined') {
    try {
      return JSON.parse(result);
    } catch (error) {
      return null;
    }
  }
  return null;
};

export const removeProfileFromLS = () => {
  localStorage.removeItem('homura_admin_profile');
};

export const clearLS = () => {
  removeProfileFromLS();
  const clearLSEvent = new Event('clearLS');
  LocalStorageEventTarget.dispatchEvent(clearLSEvent);
};
