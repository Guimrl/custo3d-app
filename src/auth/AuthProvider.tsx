import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  api,
  AUTH_LOGOUT_EVENT,
  readSession,
  writeSession,
  type Session,
  type User,
} from "../api";

interface AuthContextValue {
  user: User | null;
  /** true enquanto confere, ao abrir o app, se o token guardado ainda vale. */
  checking: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(readSession);
  const [checking, setChecking] = useState(() => readSession() !== null);

  const logout = useCallback(() => {
    writeSession(null);
    setSession(null);
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const newSession = await api.post<Session>("/auth/login", {
      username,
      password,
    });
    writeSession(newSession);
    setSession(newSession);
  }, []);

  // Só na abertura do app: confirma com a API que o token guardado ainda vale.
  useEffect(() => {
    if (!readSession()) {
      return;
    }

    let active = true;
    api
      .get<User>("/auth/me")
      .then((user) => {
        if (active) {
          setSession((current) => current && { ...current, user });
        }
      })
      .catch(() => {
        if (active) {
          logout();
        }
      })
      .finally(() => {
        if (active) {
          setChecking(false);
        }
      });

    return () => {
      active = false;
    };
  }, [logout]);

  useEffect(() => {
    window.addEventListener(AUTH_LOGOUT_EVENT, logout);

    return () => window.removeEventListener(AUTH_LOGOUT_EVENT, logout);
  }, [logout]);

  const value = useMemo(
    () => ({
      user: session?.user ?? null,
      checking: checking && session !== null,
      login,
      logout,
    }),
    [session, checking, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth precisa estar dentro do AuthProvider.");
  }

  return context;
};
