export default function LoadingState() {
  return (
    <div className="loading-result" aria-live="polite">
      <div className="loading-orb"><span /><span /><span /></div>
      <div><strong>Compiling your question</strong><p>Translating intent into a secure SQL query…</p></div>
      <div className="skeleton-lines"><i /><i /><i /></div>
    </div>
  );
}
