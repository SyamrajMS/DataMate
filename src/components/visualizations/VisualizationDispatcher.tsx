import CategoricalChart from './CategoricalChart';
import MetricCard from './MetricCard';
import RelationalTable from './RelationalTable';
import TemporalChart from './TemporalChart';
import { EmptyState, VisualizationCard } from './shared';
import type { DirectivePayload } from './types';

/** Mounts the correct data component for an LLM-returned UI directive. */
export default function VisualizationDispatcher({ payload }: { payload: DirectivePayload }) {
  switch (payload.ui_directive) {
    case 'TEMPORAL_SERIES': return <TemporalChart payload={payload} />;
    case 'CATEGORICAL_ASSERTION': return <CategoricalChart payload={payload} />;
    case 'RELATIONAL_TABLE': return <RelationalTable payload={payload} />;
    case 'METRIC_CARD': return <MetricCard payload={payload} />;
    default: return <VisualizationCard><EmptyState message="The API returned an unsupported UI directive." /></VisualizationCard>;
  }
}
