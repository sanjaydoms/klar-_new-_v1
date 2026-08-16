import {
  setItemWithTTL,
  getItemWithTTL,
  removeItem as removeTTLItem,
} from '@/utils/localStorageWithTTL';
import { createContext, useContext, useEffect, ReactNode, useCallback, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { RootState } from '../../../app/store';
import { persistor } from '../../../app/store';
import { logout as reduxLogout } from '../../../features/authentication/authSlice';
import API from '../../../api/api';
import { tokenStore } from '../../../utils/tokenStore';

export interface User {
  id: string;
  email: string;
  roles: string[];
  clientType: string;
  status: string;
  verificationStatus?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  logout: () => Promise<void>;
  checkSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const hasCheckedSession = useRef(false);

  const { user, token, isLoading } = useSelector((state: RootState) => state.auth);

  const clearAllAuthState = () => {
    dispatch(reduxLogout());
    persistor.purge();
    removeTTLItem('token');
    localStorage.removeItem('authToken');
    localStorage.removeItem('userId');
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('authToken');
    sessionStorage.removeItem('redirectPath');
    tokenStore.setToken(null);
  };

  const logout = async () => {
    try {
      await API.post('/user/auth/logout');
    } catch (error) {
      console.error('Logout API call failed (continuing anyway):', error);
    } finally {
      clearAllAuthState();
      window.location.href = '/b2b';
    }
  };

  const checkSession = useCallback(async () => {
    if (hasCheckedSession.current) return;

    if (!token) {
      hasCheckedSession.current = true;
      return;
    }

    try {
      const res = await API.get('/user/auth/validate', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.data?.success && res.data?.data?.user) {
        console.log('Session is valid');
      }
    } catch (error: any) {
      if (error.response?.status === 401) {
        dispatch(reduxLogout());
        navigate('/b2b');
      } else if (error.response?.status !== 401) {
        console.error('Session check failed:', error);
      }
    } finally {
      hasCheckedSession.current = true;
    }
  }, [dispatch, token, navigate]);

  useEffect(() => {
    if (token) {
      setItemWithTTL('token', token, 24 * 60 * 60 * 1000);
      tokenStore.setToken(token);
    } else {
      removeTTLItem('token');
      tokenStore.setToken(null);
    }
  }, [token]);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!token && !!user,
        isLoading,
        logout,
        checkSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
};
