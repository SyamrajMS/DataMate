# DataMate frontend

## Connect FastAPI

1. Copy `.env.example` to `.env.local` and set the FastAPI origin and route if they differ from the defaults.
2. Start the frontend with `npm run dev` and FastAPI with CORS enabled for the Vite origin (usually `http://localhost:5173`).
3. Send `POST /api/query` from FastAPI-compatible clients with this request body:

```json
{ "query": "Show revenue trend for the last six months" }
```

Return one visualization result in this shape. The response can also be wrapped in `{ "payload": ... }`.

```json
{
  "ui_directive": "TEMPORAL_SERIES",
  "message": "Revenue grew 18% over six months.",
  "data": [
    { "month": "Jan", "revenue": 48200 },
    { "month": "Feb", "revenue": 51600 }
  ],
  "config": {
    "xAxis": "month",
    "yAxis": "revenue",
    "title": "Monthly revenue trend"
  }
}
```

Supported directives are `TEMPORAL_SERIES`, `CATEGORICAL_ASSERTION`, `RELATIONAL_TABLE`, and `METRIC_CARD`.

For a disconnected UI demo, set `VITE_USE_MOCK_API=true` in `.env.local`.

## Checks

```bash
npm run typecheck
npm run build
```
