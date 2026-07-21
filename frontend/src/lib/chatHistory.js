import { API } from './api';

const STORAGE_KEY = 'datamate-conversations-v1';

export const welcomeMessage = {
  id: 'welcome',
  role: 'assistant',
  text: 'I\u2019m DataMate, your analytics copilot. Ask a question in plain language and I\u2019ll turn the answer into a useful analysis.',
};

export function createConversation() {
  const timestamp = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    title: 'New chat',
    createdAt: timestamp,
    updatedAt: timestamp,
    messages: [{ ...welcomeMessage, id: crypto.randomUUID() }],
  };
}

export function loadConversations() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
    if (!Array.isArray(stored) || !stored.length) return [createConversation()];
    const valid = stored.filter((conversation) => conversation?.id && Array.isArray(conversation.messages));
    return valid.length ? valid : [createConversation()];
  } catch {
    return [createConversation()];
  }
}

export function saveConversations(conversations) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
}

export function titleFromQuery(query) {
  const compact = query.replace(/\s+/g, ' ').trim();
  return compact.length > 38 ? `${compact.slice(0, 38)}\u2026` : compact;
}

export function relativeGroup(dateString) {
  const date = new Date(dateString);
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const yesterday = new Date(startOfToday);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date >= startOfToday) return 'Today';
  if (date >= yesterday) return 'Yesterday';
  return 'Previous 7 days';
}

/**
 * Fetches the user's query history from the backend and merges it into the
 * local conversation list. Each server-side history entry becomes a single
 * conversation with two messages: the user query and the assistant response.
 *
 * Returns the merged list (server history + any local-only conversations).
 */
export async function loadHistoryFromServer() {
  try {
    const result = await API.getHistory(100);
    const history = result?.history ?? [];
    if (!history.length) return loadConversations();

    // Build a Set of existing request_ids already in local storage to avoid duplicates
    const local = loadConversations();
    const localRequestIds = new Set();
    for (const conversation of local) {
      for (const message of conversation.messages) {
        if (message.payload?.request_id) localRequestIds.add(message.payload.request_id);
      }
    }

    const serverConversations = [];
    for (const entry of history) {
      if (localRequestIds.has(entry.request_id)) continue;

      const timestamp = entry.timestamp ?? new Date().toISOString();
      const title = titleFromQuery(entry.user_query ?? 'Query');
      const conversation = {
        id: entry.request_id ?? crypto.randomUUID(),
        title,
        createdAt: timestamp,
        updatedAt: timestamp,
        messages: [
          { ...welcomeMessage, id: crypto.randomUUID() },
          { id: crypto.randomUUID(), role: 'user', text: entry.user_query ?? '' },
        ],
      };

      // If there's a successful response, add it as an assistant message
      if (entry.status === 'SUCCESS' && entry.message) {
        conversation.messages.push({
          id: crypto.randomUUID(),
          role: 'assistant',
          text: entry.message,
          payload: entry.ui_directive ? {
            ui_directive: entry.ui_directive,
            message: entry.message,
            sql: entry.generated_sql,
            request_id: entry.request_id,
          } : undefined,
        });
      }

      serverConversations.push(conversation);
    }

    // Merge: local conversations first (they have full payloads), then server-only
    const merged = [...local, ...serverConversations];
    // Sort by most recently updated
    merged.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

    // Ensure at least one conversation exists
    if (!merged.length) merged.push(createConversation());

    saveConversations(merged);
    return merged;
  } catch (error) {
    console.warn('[DataMate] Failed to load history from server:', error);
    return loadConversations();
  }
}
