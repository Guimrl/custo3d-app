/**
 * Cliente HTTP da custo3d-api. Envia o token da sessão em toda requisição e,
 * se a API responder 401, apaga a sessão e avisa o AuthProvider.
 * Em desenvolvimento usa "/api" (proxy do Vite); em produção, VITE_API_URL.
 */
const BASE_URL = import.meta.env.VITE_API_URL || "/api";
const SESSION_KEY = "sessao";

export const AUTH_LOGOUT_EVENT = "auth:logout";

export interface User {
  id: string;
  username: string;
  name: string;
}

export interface Session {
  token: string;
  user: User;
}

export const readSession = (): Session | null => {
  try {
    const saved = localStorage.getItem(SESSION_KEY);

    return saved ? (JSON.parse(saved) as Session) : null;
  } catch {
    return null;
  }
};

export const writeSession = (session: Session | null) => {
  try {
    if (session) {
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    } else {
      localStorage.removeItem(SESSION_KEY);
    }
  } catch {
    // Sem localStorage: o login dura só até fechar a aba.
  }
};

const request = async <T>(
  method: string,
  url: string,
  body?: unknown,
): Promise<T> => {
  const headers: Record<string, string> = {};
  const token = readSession()?.token;

  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE_URL}${url}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (response.status === 401 && !url.startsWith("/auth/login")) {
    writeSession(null);
    window.dispatchEvent(new Event(AUTH_LOGOUT_EVENT));
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || `Erro ${response.status}`);
  }

  return data as T;
};

export const api = {
  get: <T>(url: string) => request<T>("GET", url),
  post: <T>(url: string, body: unknown = {}) => request<T>("POST", url, body),
  put: <T>(url: string, body: unknown) => request<T>("PUT", url, body),
  delete: (url: string) => request<{ message: string }>("DELETE", url),
};

/** Mensagem de um erro capturado num catch. */
export const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error);
