const BASE = import.meta.env.VITE_API_BASE || "";

export function getAuthToken(): string | null {
  try {
    return localStorage.getItem("scholar_auth_token");
  } catch {
    return null;
  }
}

export function setAuthToken(token: string | null): void {
  try {
    if (token) {
      localStorage.setItem("scholar_auth_token", token);
    } else {
      localStorage.removeItem("scholar_auth_token");
    }
  } catch {
    // Ignore localStorage errors
  }
}

export async function api<T>(
  path: string,
  body?: unknown,
  token?: string,
  method?: "DELETE",
): Promise<T> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 240000);
  const authToken = getAuthToken();
  try {
    const response = await fetch(BASE + "/api" + path, {
      method: method || (body === undefined ? "GET" : "POST"),
      headers: {
        "Content-Type": "application/json",
        ...(token ? { "X-Session-Token": token } : {}),
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
    if (response.status === 204) return undefined as T;
    const data = await response.json();
    if (!response.ok) {
      throw new Error(
        data.error?.message || "The request could not be completed.",
      );
    }
    return data as T;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("The request timed out. Please try again.");
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}
