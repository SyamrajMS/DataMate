import os
import re
import uuid
import sqlite3
from typing import Literal, Optional
from contextlib import contextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from google import genai
from google.genai import types
from dotenv import load_dotenv

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
load_dotenv()

DB_PATH = os.path.join(os.path.dirname(__file__), "northwind.db")
HISTORY_DB_PATH = os.path.join(os.path.dirname(__file__), "history.db")
SKILLS_PATH = os.path.join(os.path.dirname(__file__), "skills.md")

FORBIDDEN_SQL = re.compile(
    r"\b(DROP|DELETE|UPDATE|INSERT|ALTER|CREATE|PRAGMA|GRANT|REVOKE|REPLACE|ATTACH|DETACH)\b",
    re.IGNORECASE,
)

# ---------------------------------------------------------------------------
# Gemini Client
# ---------------------------------------------------------------------------
client = genai.Client()

# ---------------------------------------------------------------------------
# Pydantic Models — structured output for Gemini
# ---------------------------------------------------------------------------

class VisualizationConfig(BaseModel):
    xAxis: Optional[str] = Field(None, description="Data key for the horizontal / category axis.")
    yAxis: Optional[str] = Field(None, description="Data key for the value / metric axis.")
    title: str = Field(description="Short, human-readable title for the visualization.")
    metricLabel: Optional[str] = Field(None, description="Human-readable label for METRIC_CARD KPIs.")


class AnalyticsDirective(BaseModel):
    sql_query: str = Field(description="A bare, executable SQLite SELECT statement. No markdown.")
    ui_directive: Literal[
        "TEMPORAL_SERIES",
        "CATEGORICAL_ASSERTION",
        "RELATIONAL_TABLE",
        "METRIC_CARD",
    ] = Field(description="The frontend visualization component to render.")
    config: VisualizationConfig = Field(description="Axis & display configuration for the chart.")
    message: str = Field(description="Conversational, plain-English summary of the result for non-technical users.")


# ---------------------------------------------------------------------------
# Request / Response schemas for the API
# ---------------------------------------------------------------------------

class QueryRequest(BaseModel):
    query: str
    conversation_id: Optional[str] = None


class QueryResponse(BaseModel):
    ui_directive: str
    data: list[dict]
    config: dict
    message: str
    sql: str
    request_id: str


class ErrorResponse(BaseModel):
    detail: str


# ---------------------------------------------------------------------------
# Database Helpers
# ---------------------------------------------------------------------------

@contextmanager
def readonly_connection():
    """Opens a read-only connection to the Northwind database."""
    conn = sqlite3.connect(f"file:{DB_PATH}?mode=ro", uri=True)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()


@contextmanager
def history_connection():
    """Opens a writable connection to the history database."""
    conn = sqlite3.connect(HISTORY_DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()


def init_history_db():
    """Creates the history table if it does not exist."""
    with history_connection() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS QueryHistory (
                id            INTEGER PRIMARY KEY AUTOINCREMENT,
                request_id    TEXT    NOT NULL,
                timestamp     DATETIME DEFAULT CURRENT_TIMESTAMP,
                user_query    TEXT,
                generated_sql TEXT,
                ui_directive  TEXT,
                message       TEXT,
                status        TEXT,
                error_message TEXT DEFAULT ''
            )
        """)
        conn.commit()


def log_history(
    request_id: str,
    user_query: str,
    generated_sql: str = "",
    ui_directive: str = "",
    message: str = "",
    status: str = "SUCCESS",
    error_message: str = "",
):
    try:
        with history_connection() as conn:
            conn.execute(
                """INSERT INTO QueryHistory
                   (request_id, user_query, generated_sql, ui_directive, message, status, error_message)
                   VALUES (?, ?, ?, ?, ?, ?, ?)""",
                (request_id, user_query, generated_sql, ui_directive, message, status, error_message),
            )
            conn.commit()
    except Exception as exc:
        print(f"[WARN] Failed to log history: {exc}")


def execute_readonly_query(sql: str) -> list[dict]:
    """Runs a read-only query and returns rows as a list of dicts."""
    with readonly_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(sql)
        rows = cursor.fetchall()
    return [dict(row) for row in rows]


# ---------------------------------------------------------------------------
# System Prompt Builder
# ---------------------------------------------------------------------------

def build_system_prompt() -> str:
    """Reads skills.md and wraps it with strict instructions."""
    try:
        with open(SKILLS_PATH, "r", encoding="utf-8") as f:
            schema_context = f.read()
    except FileNotFoundError:
        schema_context = "[ERROR] skills.md not found — schema context unavailable."

    return f"""You are a precise Natural Language to SQL analytics engine for a Northwind e-commerce database.

ABSOLUTE RULES — VIOLATION WILL CAUSE SYSTEM FAILURE:
1. ONLY use tables and columns defined in the schema below. NEVER invent or guess column names.
2. The table "Order Details" contains a space — ALWAYS wrap it in double quotes.
3. Your sql_query MUST be a pure, executable SQLite SELECT statement. No markdown fences, no comments.
4. NEVER generate queries that modify data (no INSERT, UPDATE, DELETE, DROP, ALTER, CREATE).
5. Use lowercase_snake_case for all column aliases so they exactly match the config.xAxis and config.yAxis values.
6. The config.xAxis and config.yAxis values MUST exactly match column alias names in your SELECT clause.
7. For TEMPORAL_SERIES and CATEGORICAL_ASSERTION, both config.xAxis and config.yAxis are MANDATORY.
8. For METRIC_CARD, use config.yAxis pointing to the value key and set config.metricLabel to a human-readable name.
9. The message field must be a friendly, conversational summary written for someone who does not know SQL.
10. LIMIT results to 50 rows max for RELATIONAL_TABLE queries to avoid overwhelming the UI.
11. Always ROUND numeric aggregations to 2 decimal places.

{schema_context}
"""


# ---------------------------------------------------------------------------
# SQL Security Guard
# ---------------------------------------------------------------------------

def validate_sql(sql: str) -> None:
    """Raises HTTPException if the SQL contains forbidden keywords."""
    if FORBIDDEN_SQL.search(sql):
        raise HTTPException(
            status_code=403,
            detail="Policy violation: the generated query contains forbidden modification keywords.",
        )
    # Extra guard: must start with SELECT (ignoring whitespace)
    stripped = sql.strip().upper()
    if not stripped.startswith("SELECT"):
        raise HTTPException(
            status_code=403,
            detail="Policy violation: only SELECT queries are permitted.",
        )


# ---------------------------------------------------------------------------
# FastAPI Application
# ---------------------------------------------------------------------------

app = FastAPI(
    title="DataMate Analytics API",
    version="1.0.0",
    description="Natural Language to SQL analytics engine for the Northwind database.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    init_history_db()


@app.post("/api/query", response_model=QueryResponse)
async def analytics_query(body: QueryRequest):
    request_id = str(uuid.uuid4())
    system_prompt = build_system_prompt()

    # ------------------------------------------------------------------
    # Step 1: Ask Gemini to produce a structured AnalyticsDirective
    # ------------------------------------------------------------------
    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=body.query,
            config=types.GenerateContentConfig(
                system_instruction=system_prompt,
                response_mime_type="application/json",
                response_schema=AnalyticsDirective,
                temperature=0.1,
            ),
        )
        directive = AnalyticsDirective.model_validate_json(response.text)
    except Exception as exc:
        log_history(request_id, body.query, status="ERROR", error_message=f"Gemini error: {exc}")
        raise HTTPException(status_code=502, detail=f"AI model error: {exc}")

    raw_sql = directive.sql_query

    # ------------------------------------------------------------------
    # Step 2: Security validation
    # ------------------------------------------------------------------
    try:
        validate_sql(raw_sql)
    except HTTPException as exc:
        log_history(request_id, body.query, raw_sql, directive.ui_directive, status="ERROR", error_message=exc.detail)
        raise

    # ------------------------------------------------------------------
    # Step 3: Execute the query against northwind.db (read-only)
    # ------------------------------------------------------------------
    try:
        data = execute_readonly_query(raw_sql)
    except sqlite3.Error as exc:
        log_history(request_id, body.query, raw_sql, directive.ui_directive, status="ERROR", error_message=str(exc))
        raise HTTPException(status_code=500, detail=f"Database error: {exc}")

    # ------------------------------------------------------------------
    # Step 4: Log & return the structured response
    # ------------------------------------------------------------------
    log_history(
        request_id=request_id,
        user_query=body.query,
        generated_sql=raw_sql,
        ui_directive=directive.ui_directive,
        message=directive.message,
        status="SUCCESS",
    )

    return QueryResponse(
        ui_directive=directive.ui_directive,
        data=data,
        config=directive.config.model_dump(),
        message=directive.message,
        sql=raw_sql,
        request_id=request_id,
    )


@app.get("/api/history")
async def get_history(limit: int = 50):
    """Returns the most recent query history entries (server-side audit log)."""
    try:
        with history_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM QueryHistory ORDER BY timestamp DESC LIMIT ?", (limit,))
            rows = cursor.fetchall()
        return {"history": [dict(row) for row in rows]}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"History fetch error: {exc}")


# ---------------------------------------------------------------------------
# Entrypoint
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
