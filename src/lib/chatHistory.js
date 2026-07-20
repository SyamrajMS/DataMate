const STORAGE_KEY = 'queryflow-conversations-v1';

export const welcomeMessage = {
  id: 'welcome',
  role: 'assistant',
  text: 'I’m Queryflow, your analytics copilot. Ask a question in plain language and I’ll turn the answer into a useful analysis.',
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
  return compact.length > 38 ? `${compact.slice(0, 38)}…` : compact;
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
