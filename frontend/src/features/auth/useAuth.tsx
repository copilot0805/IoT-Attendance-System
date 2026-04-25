import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { http } from '../../api/http';
import {
  clearAuth,
  getAuthToken,
  getAuthUser,
  setAuthToken,
  setAuthUser,
  type AuthUser,
} from './authStorage';

type LoginPayload = {
  email: string;
  password: string;
};

type LoginResponse = {
  EC: number;
  EM?: string;
  access_token?: string;
  user?: {
    email: string;
    name?: string;
    role: 'ADMIN' | 'EMPLOYEE' | string;
  };
};

type AuthContextValue = {
  isAuthenticated: boolean;
  user: AuthUser | null;
  login: (payload: LoginPayload) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

type AuthProviderProps = {
  children: ReactNode;
};

export function AuthProvider({ children }: AuthProviderProps) {
  const [token, setToken] = useState<string | null>(getAuthToken());
  const [user, setUser] = useState<AuthUser | null>(getAuthUser());

  const login = async (payload: LoginPayload) => {
    const { data } = await http.post<LoginResponse>('/login', payload);

    if (data.EC !== 0 || !data.access_token || !data.user) {
      throw new Error(data.EM || 'Dang nhap that bai');
    }

    const normalizedUser: AuthUser = {
      email: data.user.email,
      name: data.user.name || payload.email,
      role: data.user.role,
    };

    setAuthToken(data.access_token);
    setAuthUser(normalizedUser);
    setToken(data.access_token);
    setUser(normalizedUser);
  };

  const logout = () => {
    clearAuth();
    setToken(null);
    setUser(null);
  };

  const value = useMemo(
    () => ({
      isAuthenticated: Boolean(token),
      user,
      login,
      logout,
    }),
    [token, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
