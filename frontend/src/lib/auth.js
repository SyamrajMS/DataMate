const SESSION_KEY = 'datamate-session-v1';

export function getSession() {
  try {
    const session = JSON.parse(localStorage.getItem(SESSION_KEY) ?? 'null');
    return session?.email ? {
      ...session,
      name: session.name ?? session.email.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase()),
    } : null;
  } catch {
    return null;
  }
}

/**
 * Local UI session for the frontend demo. Replace this with a FastAPI token
 * exchange when an authentication endpoint is available.
 */
export function createSession(email) {
  const session = {
    email,
    name: email.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase()),
    createdAt: new Date().toISOString(),
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}
