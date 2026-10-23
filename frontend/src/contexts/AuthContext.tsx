import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import axios from 'axios';
import { api } from '../services/api';
import { authStorage, TokenPair } from '../services/authStorage';

interface AuthContextValue {
  isAuthenticated: boolean;
  signIn: (username: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [isAuthenticated, setIsAuthenticated] = useState(
    () => Boolean(authStorage.getAccess() && authStorage.getRefresh()),
  );

  const clearAuth = useCallback(() => {
    authStorage.clear();
    setIsAuthenticated(false);
  }, []);

  useEffect(() => {
    window.addEventListener('sales:auth-expired', clearAuth);
    return () => window.removeEventListener('sales:auth-expired', clearAuth);
  }, [clearAuth]);

  const signIn = useCallback(async (username: string, password: string) => {
    const { data } = await api.post<TokenPair>('/auth/token/', { username, password });
    authStorage.save(data);
    setIsAuthenticated(true);
  }, []);

  const signOut = useCallback(async () => {
    const refresh = authStorage.getRefresh();
    try {
      if (refresh) await api.post('/auth/token/blacklist/', { refresh });
    } catch (error) {
      if (!axios.isAxiosError(error) || error.response?.status !== 401) throw error;
    } finally {
      clearAuth();
    }
  }, [clearAuth]);

  const value = useMemo(
    () => ({ isAuthenticated, signIn, signOut }),
    [isAuthenticated, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
