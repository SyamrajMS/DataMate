import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowUp, Check, ChevronDown, CirclePlus, Command, Copy, Database, Menu, MessageSquare,
  Moon, MoreHorizontal, PanelLeft, Plus, Search, Sparkles, Sun, ThumbsDown, ThumbsUp, Trash2, X,
} from 'lucide-react';
import UIDispatcher from './components/UIDispatcher';
import LoadingState from './components/LoadingState';
import { getMockResponse, suggestions } from './lib/mockResponses';
import { AnalyticsApiError, runAnalyticsQuery } from './lib/analyticsApi';
import { createConversation, loadConversations, relativeGroup, saveConversations, titleFromQuery } from './lib/chatHistory';
import { clearSession, createSession, getSession } from './lib/auth';
import LoginPage from './components/LoginPage';

function MessageActions({ text }) {
  const [copied, setCopied] = useState(false);
  async function copyResponse() {
    await navigator.clipboard?.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }
  return (
    <div className="message-actions">
      <button onClick={copyResponse} aria-label="Copy response">{copied ? <Check size={14} /> : <Copy size={14} />}</button>
      <button aria-label="Helpful response"><ThumbsUp size={14} /></button>
      <button aria-label="Unhelpful response"><ThumbsDown size={14} /></button>
    </div>
  );
}

function ChatWorkspace({ session, onSignOut }) {
  const initialConversationsRef = useRef(null);
  if (initialConversationsRef.current === null) initialConversationsRef.current = loadConversations();
  const [conversations, setConversations] = useState(initialConversationsRef.current);
  const [activeConversationId, setActiveConversationId] = useState(initialConversationsRef.current[0]?.id);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDark, setIsDark] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth > 760);
  const [historySearch, setHistorySearch] = useState('');
  const endRef = useRef(null);
  const textareaRef = useRef(null);
  const activeRequestRef = useRef(null);

  const activeConversation = conversations.find((conversation) => conversation.id === activeConversationId) ?? conversations[0];
  const activeMessages = activeConversation?.messages ?? [];
  const groupedConversations = useMemo(() => {
    const filtered = conversations
      .filter((conversation) => conversation.title.toLowerCase().includes(historySearch.toLowerCase()))
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    return filtered.reduce((groups, conversation) => {
      const group = relativeGroup(conversation.updatedAt);
      (groups[group] ??= []).push(conversation);
      return groups;
    }, {});
  }, [conversations, historySearch]);

  useEffect(() => { document.documentElement.dataset.theme = isDark ? 'dark' : 'light'; }, [isDark]);
  useEffect(() => { saveConversations(conversations); }, [conversations]);
  useEffect(() => {
    if (!conversations.some((conversation) => conversation.id === activeConversationId)) {
      setActiveConversationId(conversations[0]?.id);
    }
  }, [activeConversationId, conversations]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [activeMessages, isLoading]);
  useEffect(() => () => activeRequestRef.current?.abort(), []);

  function updateConversation(id, updater) {
    setConversations((current) => current.map((conversation) => conversation.id === id ? updater(conversation) : conversation));
  }

  function startNewChat() {
    activeRequestRef.current?.abort();
    setIsLoading(false);
    const conversation = createConversation();
    setConversations((current) => [conversation, ...current]);
    setActiveConversationId(conversation.id);
    setInput('');
    setSidebarOpen(false);
    textareaRef.current?.focus();
  }

  function deleteConversation(event, id) {
    event.stopPropagation();
    const remaining = conversations.filter((conversation) => conversation.id !== id);
    if (!remaining.length) {
      const freshConversation = createConversation();
      setConversations([freshConversation]);
      setActiveConversationId(freshConversation.id);
      return;
    }
    setConversations(remaining);
    if (activeConversationId === id) setActiveConversationId(remaining[0].id);
  }

  function resizeTextarea(event) {
    const field = event.currentTarget;
    field.style.height = 'auto';
    field.style.height = `${Math.min(field.scrollHeight, 160)}px`;
    setInput(field.value);
  }

  async function handleSubmit(event) {
    event?.preventDefault();
    const query = input.trim();
    const conversationId = activeConversation?.id;
    if (!query || isLoading || !conversationId) return;

    const timestamp = new Date().toISOString();
    updateConversation(conversationId, (conversation) => ({
      ...conversation,
      title: conversation.title === 'New chat' ? titleFromQuery(query) : conversation.title,
      updatedAt: timestamp,
      messages: [...conversation.messages, { id: crypto.randomUUID(), role: 'user', text: query }],
    }));
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    const controller = new AbortController();
    activeRequestRef.current?.abort();
    activeRequestRef.current = controller;
    setIsLoading(true);

    try {
      const useMockApi = import.meta.env.VITE_USE_MOCK_API === 'true';
      const payload = useMockApi
        ? await new Promise((resolve) => setTimeout(() => resolve(getMockResponse(query)), 650))
        : await runAnalyticsQuery({ query, conversation_id: conversationId }, { signal: controller.signal });
      if (controller.signal.aborted) return;
      updateConversation(conversationId, (conversation) => ({
        ...conversation,
        updatedAt: new Date().toISOString(),
        messages: [...conversation.messages, {
          id: crypto.randomUUID(),
          role: 'assistant',
          text: payload.message ?? payload.summary ?? 'Here is the result of your query.',
          payload,
        }],
      }));
    } catch (error) {
      if (controller.signal.aborted) return;
      const message = error instanceof AnalyticsApiError
        ? error.message
        : 'Your analysis could not be completed. Please try again.';
      updateConversation(conversationId, (conversation) => ({
        ...conversation,
        updatedAt: new Date().toISOString(),
        messages: [...conversation.messages, { id: crypto.randomUUID(), role: 'assistant', text: message, isError: true }],
      }));
    } finally {
      if (activeRequestRef.current === controller) activeRequestRef.current = null;
      if (!controller.signal.aborted) setIsLoading(false);
    }
  }

  const groupOrder = ['Today', 'Yesterday', 'Previous 7 days'];
  return (
    <div className="app-shell">
      <aside className={`sidebar ${sidebarOpen ? 'sidebar--open' : ''}`}>
        <div className="sidebar-top">
          <div className="brand"><span className="brand-mark"><Sparkles size={17} /></span><span>DataMate</span><button className="mobile-close icon-button" onClick={() => setSidebarOpen(false)} aria-label="Close sidebar"><X size={18} /></button></div>
          <button className="new-chat" onClick={startNewChat}><Plus size={17} /> New chat <kbd><Command size={11} /> K</kbd></button>
          <label className="history-search"><Search size={15} /><input value={historySearch} onChange={(event) => setHistorySearch(event.target.value)} placeholder="Search chats" /></label>
        </div>
        <nav className="history-nav" aria-label="Conversation history">
          {groupOrder.map((group) => groupedConversations[group]?.length ? (
            <div className="history-group" key={group}><p>{group}</p>{groupedConversations[group].map((conversation) => (
              <button key={conversation.id} className={`history-item ${conversation.id === activeConversation?.id ? 'history-item--active' : ''}`} onClick={() => { setActiveConversationId(conversation.id); setSidebarOpen(false); }}>
                <MessageSquare size={14} /><span>{conversation.title}</span><i className="history-more"><MoreHorizontal size={16} /></i><i className="history-delete" role="button" aria-label={`Delete ${conversation.title}`} onClick={(event) => deleteConversation(event, conversation.id)}><Trash2 size={14} /></i>
              </button>
            ))}</div>
          ) : null)}
          {!Object.keys(groupedConversations).length && <p className="history-empty">No chats found</p>}
        </nav>
        <div className="sidebar-footer"><button className="data-source"><span><Database size={15} /></span><div><strong>Production warehouse</strong><small>Connected · 2 min ago</small></div><ChevronDown size={15} /></button><button className="user" onClick={onSignOut} title="Sign out"><div className="avatar">{session.name.slice(0, 2).toUpperCase()}</div><div><strong>{session.name}</strong><small>Click to sign out</small></div><ChevronDown size={15} /></button></div>
      </aside>
      {sidebarOpen && <button className="scrim" aria-label="Close menu" onClick={() => setSidebarOpen(false)} />}

      <main className={`main-panel ${sidebarOpen ? '' : 'main-panel--expanded'}`}>
        <header className="topbar"><button className="icon-button menu-button" onClick={() => setSidebarOpen(current => !current)} aria-label="Toggle sidebar"><PanelLeft size={20} /></button><div className="topbar-title"><span>{activeConversation?.title ?? 'New chat'}</span><small>DataMate analytics</small></div><div className="topbar-actions"><button className="theme-toggle" onClick={() => setIsDark((current) => !current)} aria-label="Toggle color mode">{isDark ? <Sun size={17} /> : <Moon size={17} />}</button><button className="topbar-new" onClick={startNewChat}><CirclePlus size={17} /><span>New chat</span></button></div></header>
        <div className="chat-scroller"><div className="conversation">
          {activeMessages.map((message, index) => <article className={`message message--${message.role} ${message.isError ? 'message--error' : ''}`} key={message.id}>
            {message.role === 'assistant' && <div className="assistant-avatar"><Sparkles size={15} /></div>}
            <div className="message-content"><p>{message.text}</p>{message.payload && <UIDispatcher payload={message.payload} />}{message.role === 'assistant' && index > 0 && <MessageActions text={message.text} />}</div>
          </article>)}
          {isLoading && <article className="message message--assistant"><div className="assistant-avatar"><Sparkles size={15} /></div><LoadingState /></article>}
          <div ref={endRef} />
        </div></div>
        <div className="composer-wrap"><div className="composer-area">
          {activeMessages.length <= 1 && <div className="welcome-prompts"><p>Try asking about your data</p><div className="suggestions">{suggestions.map((suggestion) => <button key={suggestion} onClick={() => { setInput(suggestion); textareaRef.current?.focus(); }}><Sparkles size={13} />{suggestion}</button>)}</div></div>}
          <form className="composer" onSubmit={handleSubmit}>
            <textarea ref={textareaRef} value={input} onChange={resizeTextarea} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); handleSubmit(); } }} placeholder="Message DataMate…" rows="1" />
            <div className="composer-controls"><span>Shift + Enter for new line</span><button className="send-button" type="submit" disabled={!input.trim() || isLoading} aria-label="Send message"><ArrowUp size={19} /></button></div>
          </form><p className="composer-note">DataMate can make mistakes. Verify important business decisions.</p>
        </div></div>
      </main>
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState(getSession);

  if (!session) {
    return <LoginPage onSignIn={(email) => setSession(createSession(email))} />;
  }

  return <ChatWorkspace session={session} onSignOut={() => { clearSession(); setSession(null); }} />;
}
