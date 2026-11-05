import { api, getAuthToken, setAuthToken } from "./api";
import type { AuthResponse, User } from "./types";

export function getStoredUser(): User | null {
  try {
    const raw = localStorage.getItem("scholar_user");
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

export function setStoredUser(user: User | null): void {
  try {
    if (user) {
      localStorage.setItem("scholar_user", JSON.stringify(user));
    } else {
      localStorage.removeItem("scholar_user");
    }
  } catch {
    // Ignore localStorage exceptions
  }
}

export async function loginWithEmail(
  email: string,
  password: string,
): Promise<User> {
  const data = await api<AuthResponse>("/auth/login", { email, password });
  setAuthToken(data.token);
  setStoredUser(data.user);
  return data.user;
}

export async function registerWithEmail(
  name: string,
  email: string,
  password: string,
): Promise<User> {
  const data = await api<AuthResponse>("/auth/register", {
    name,
    email,
    password,
  });
  setAuthToken(data.token);
  setStoredUser(data.user);
  return data.user;
}

export async function loginWithGoogle(payload: {
  credential?: string;
  access_token?: string;
  email?: string;
  name?: string;
  avatar?: string;
}): Promise<User> {
  const data = await api<AuthResponse>("/auth/google", payload);
  setAuthToken(data.token);
  setStoredUser(data.user);
  return data.user;
}

export async function fetchCurrentUser(): Promise<User | null> {
  const token = getAuthToken();
  if (!token) return null;
  try {
    const data = await api<{ authenticated: boolean; user: User | null }>(
      "/auth/me",
    );
    if (data.authenticated && data.user) {
      setStoredUser(data.user);
      return data.user;
    }
    logout();
    return null;
  } catch {
    return getStoredUser();
  }
}

export function logout(): void {
  setAuthToken(null);
  setStoredUser(null);
}
