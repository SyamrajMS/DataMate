const SESSION_KEY = 'datamate-session-v2';
const TOKEN_KEY = 'datamate-token-v2';

const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:50000').replace(/\/$/, '');

// ---------------------------------------------------------------------------
// Token helpers
// ---------------------------------------------------------------------------

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function storeAuth(token, user) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(SESSION_KEY, JSON.stringify(user));
}

// ---------------------------------------------------------------------------
// Session helpers
// ---------------------------------------------------------------------------

export function getSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const user = JSON.parse(raw);
    return user?.email ? user : null;
  } catch {
    return null;
  }
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(TOKEN_KEY);
}

// ---------------------------------------------------------------------------
// Auth API calls
// ---------------------------------------------------------------------------

async function authFetch(path, body) {
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const message = data?.detail ?? `Authentication failed (HTTP ${response.status}).`;
    throw new Error(message);
  }
  storeAuth(data.token, data.user);
  return data.user;
}

export async function login(email, password) {
  return authFetch('/api/auth/login', { email, password });
}

export async function register(email, password, name) {
  return authFetch('/api/auth/register', { email, password, name });
}

/**
 * Verifies the stored token against the backend.
 * Returns the user object if valid, or null if expired/invalid.
 */
export async function verifySession() {
  const token = getToken();
  if (!token) return null;
  try {
    const response = await fetch(`${API_BASE}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
      clearSession();
      return null;
    }
    const data = await response.json();
    localStorage.setItem(SESSION_KEY, JSON.stringify(data.user));
    return data.user;
  } catch {
    return null;
  }
}
