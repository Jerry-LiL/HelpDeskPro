import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { client, readToken, writeToken } from './api';
import type { User } from './types';

interface AuthValue {
  user: User | null;
  ready: boolean;
  login: (email: string, password: string) => Promise<User>;
  logout: () => void;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = readToken();
    if (!token) {
      setReady(true);
      return;
    }
    client
      .me()
      .then(setUser)
      .catch(() => writeToken(null))
      .finally(() => setReady(true));
  }, []);

  const value = useMemo<AuthValue>(
    () => ({
      user,
      ready,
      login: async (email, password) => {
        const result = await client.login(email, password);
        writeToken(result.accessToken);
        setUser(result.user);
        return result.user;
      },
      logout: () => {
        writeToken(null);
        setUser(null);
      },
    }),
    [user, ready],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return value;
}

export function RequireStaff() {
  const { user, ready, logout } = useAuth();
  if (!ready) {
    return <p className="muted page-loading">Loading…</p>;
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (user.role === 'customer') {
    return (
      <main className="narrow">
        <h1>Agent console</h1>
        <p>
          This console is for agents and admins. Your account is a customer, so you can open and follow tickets through
          the API, but there is nothing to assign here.
        </p>
        <button type="button" onClick={logout}>
          Use a different account
        </button>
      </main>
    );
  }
  return <Outlet />;
}
