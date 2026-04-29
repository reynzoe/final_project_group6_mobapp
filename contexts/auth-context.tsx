import {
  createContext,
  PropsWithChildren,
  useContext,
  useEffect,
  useState,
} from 'react';

import { apiRequest } from '@/lib/api';
import { LoginPayload, RegisterPayload, SessionResponse, SessionUser } from '@/types/library';

type AuthContextValue = {
  user: SessionUser | null;
  token: string | null;
  isSubmitting: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!token) {
      setUser(null);
    }
  }, [token]);

  async function login(payload: LoginPayload) {
    setIsSubmitting(true);

    try {
      const response = await apiRequest<SessionResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      setToken(response.token);
      setUser(response.user);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function register(payload: RegisterPayload) {
    setIsSubmitting(true);

    try {
      const response = await apiRequest<SessionResponse>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      setToken(response.token);
      setUser(response.user);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function refreshUser() {
    if (!token) {
      return;
    }

    const response = await apiRequest<{ user: SessionUser }>('/auth/me', {
      token,
    });
    setUser(response.user);
  }

  async function logout() {
    const currentToken = token;

    setToken(null);
    setUser(null);

    if (!currentToken) {
      return;
    }

    try {
      await apiRequest('/auth/logout', {
        method: 'POST',
        token: currentToken,
      });
    } catch {
      // Logging out locally is enough for this client.
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isSubmitting,
        login,
        register,
        logout,
        refreshUser,
      }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider.');
  }

  return context;
}
