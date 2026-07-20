import VisualizationDispatcher from './visualizations/VisualizationDispatcher';

/**
 * Backwards-compatible bridge for the existing chat. The API contract keeps
 * visualization titles inside `config`; this also accepts the original demo's
 * top-level `title` while the backend integration is being wired up.
 */
export default function UIDispatcher({ payload }) {
  if (!payload) return null;

  return (
    <VisualizationDispatcher
      payload={{
        ...payload,
        config: {
          ...payload.config,
          title: payload.config?.title ?? payload.title,
        },
      }}
    />
  );
}
