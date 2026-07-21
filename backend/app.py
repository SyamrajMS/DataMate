import os
import re
import uuid
import sqlite3
import secrets
from datetime import datetime, timedelta, timezone
from typing import Literal, Optional
from contextlib import contextmanager

from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field, EmailStr
from google import genai
from google.genai import types
from openai import OpenAI
from dotenv import load_dotenv
from passlib.context import CryptContext
from jose import jwt, JWTError

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
load_dotenv()

DB_PATH = os.path.join(os.path.dirname(__file__), "northwind.db")
HISTORY_DB_PATH = os.path.join(os.path.dirname(__file__), "history.db")
SKILLS_PATH = os.path.join(os.path.dirname(__file__), "skills.md")

JWT_SECRET = os.getenv("JWT_SECRET", secrets.token_urlsafe(32))
JWT_ALGORITHM = "HS256"
JWT_EXPIRY_DAYS = 7

FORBIDDEN_SQL = re.compile(
    r"\b(DROP|DELETE|UPDATE|INSERT|ALTER|CREATE|PRAGMA|GRANT|REVOKE|REPLACE|ATTACH|DETACH)\b",
    re.IGNORECASE,
)

# ---------------------------------------------------------------------------
# Security Utilities
# ---------------------------------------------------------------------------
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
bearer_scheme = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_access_token(user_id: int, email: str) -> str:
    payload = {
        "sub": str(user_id),
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(days=JWT_EXPIRY_DAYS),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
) -> dict:
    """FastAPI dependency — extracts and validates the JWT from the Authorization header."""
    if credentials is None:
        raise HTTPException(status_code=401, detail="Authentication required.")
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = int(payload["sub"])
        email = payload["email"]
    except (JWTError, KeyError, ValueError):
        raise HTTPException(status_code=401, detail="Invalid or expired token.")

    # Verify user still exists in the database
    with history_connection() as conn:
        row = conn.execute("SELECT id, email, name FROM Users WHERE id = ?", (user_id,)).fetchone()
    if row is None:
        raise HTTPException(status_code=401, detail="User account not found.")

    return {"id": row["id"], "email": row["email"], "name": row["name"]}


# ---------------------------------------------------------------------------
# Pydantic Models — structured output for LLM
# ---------------------------------------------------------------------------

class VisualizationConfig(BaseModel):
    xAxis: Optional[str] = Field(None, description="Data key for the horizontal / category axis.")
    yAxis: Optional[str] = Field(None, description="Data key for the value / metric axis.")
    title: str = Field(description="Short, human-readable title for the visualization.")
    metricLabel: Optional[str] = Field(None, description="Human-readable label for METRIC_CARD KPIs.")


class AnalyticsDirective(BaseModel):
    sql_query: str = Field(default="", description="A bare, executable SQLite SELECT statement. Leave empty for TEXT_REPLY.")
    ui_directive: Literal[
        "TEMPORAL_SERIES",
        "CATEGORICAL_ASSERTION",
        "RELATIONAL_TABLE",
        "METRIC_CARD",
        "TEXT_REPLY",
    ] = Field(description="The frontend visualization component to render.")
    config: VisualizationConfig = Field(description="Axis & display configuration for the chart.")
    message: str = Field(description="Conversational, plain-English summary of the result for non-technical users.")


# ---------------------------------------------------------------------------
# Request / Response schemas for the API
# ---------------------------------------------------------------------------

class QueryRequest(BaseModel):
    query: str
    conversation_id: Optional[str] = None
    model: str = "gemini-2.5-flash"
    api_key: Optional[str] = None


class QueryResponse(BaseModel):
    ui_directive: str
    data: list[dict]
    config: dict
    message: str
    sql: str
    request_id: str


class ErrorResponse(BaseModel):
    detail: str


# --- Auth schemas ---

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    name: str = Field(min_length=1)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class AuthResponse(BaseModel):
    token: str
    user: dict


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
    """Creates the users and history tables if they do not exist."""
    with history_connection() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS Users (
                id         INTEGER PRIMARY KEY AUTOINCREMENT,
                email      TEXT    UNIQUE NOT NULL,
                name       TEXT    NOT NULL,
                password   TEXT    NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS QueryHistory (
                id            INTEGER PRIMARY KEY AUTOINCREMENT,
                request_id    TEXT    NOT NULL,
                user_id       INTEGER,
                timestamp     DATETIME DEFAULT CURRENT_TIMESTAMP,
                conversation_id TEXT,
                user_query    TEXT,
                generated_sql TEXT,
                ui_directive  TEXT,
                message       TEXT,
                status        TEXT,
                error_message TEXT DEFAULT '',
                FOREIGN KEY (user_id) REFERENCES Users(id)
            )
        """)
        # Migrations
        try:
            conn.execute("ALTER TABLE QueryHistory ADD COLUMN user_id INTEGER")
        except sqlite3.OperationalError:
            pass  # Column already exists
        try:
            conn.execute("ALTER TABLE QueryHistory ADD COLUMN conversation_id TEXT")
        except sqlite3.OperationalError:
            pass  # Column already exists
        conn.commit()


def log_history(
    request_id: str,
    user_query: str,
    user_id: Optional[int] = None,
    conversation_id: Optional[str] = None,
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
                   (request_id, user_id, conversation_id, user_query, generated_sql, ui_directive, message, status, error_message)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (request_id, user_id, conversation_id, user_query, generated_sql, ui_directive, message, status, error_message),
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
9. For conversational replies, refusals to modify data, or when data is unavailable, use the "TEXT_REPLY" directive and leave sql_query empty.
10. The message field must be a friendly, conversational summary written for someone who does not know SQL.
11. LIMIT results to 50 rows max for RELATIONAL_TABLE queries to avoid overwhelming the UI.
12. Always ROUND numeric aggregations to 2 decimal places.

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


# ---------------------------------------------------------------------------
# Auth Endpoints
# ---------------------------------------------------------------------------

@app.post("/api/auth/register", response_model=AuthResponse)
async def register(body: RegisterRequest):
    """Create a new user account and return a JWT token."""
    with history_connection() as conn:
        existing = conn.execute("SELECT id FROM Users WHERE email = ?", (body.email.lower(),)).fetchone()
        if existing:
            raise HTTPException(status_code=409, detail="An account with this email already exists.")

        hashed = hash_password(body.password)
        cursor = conn.execute(
            "INSERT INTO Users (email, name, password) VALUES (?, ?, ?)",
            (body.email.lower(), body.name.strip(), hashed),
        )
        conn.commit()
        user_id = cursor.lastrowid

    token = create_access_token(user_id, body.email.lower())
    return AuthResponse(
        token=token,
        user={"id": user_id, "email": body.email.lower(), "name": body.name.strip()},
    )


@app.post("/api/auth/login", response_model=AuthResponse)
async def login(body: LoginRequest):
    """Authenticate with email + password and return a JWT token."""
    with history_connection() as conn:
        row = conn.execute(
            "SELECT id, email, name, password FROM Users WHERE email = ?",
            (body.email.lower(),),
        ).fetchone()

    if row is None or not verify_password(body.password, row["password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    token = create_access_token(row["id"], row["email"])
    return AuthResponse(
        token=token,
        user={"id": row["id"], "email": row["email"], "name": row["name"]},
    )


@app.get("/api/auth/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    """Validate the JWT and return the current user's info."""
    return {"user": current_user}


# ---------------------------------------------------------------------------
# Analytics Endpoint (protected)
# ---------------------------------------------------------------------------

@app.post("/api/query", response_model=QueryResponse)
async def analytics_query(body: QueryRequest, current_user: dict = Depends(get_current_user)):
    request_id = str(uuid.uuid4())
    user_id = current_user["id"]
    system_prompt = build_system_prompt()

    if not body.api_key:
        raise HTTPException(status_code=401, detail="API key is required.")

    # ------------------------------------------------------------------
    # Step 1: Ask the selected LLM to produce a structured AnalyticsDirective
    # ------------------------------------------------------------------
    try:
        if body.model.startswith("gpt"):
            # Use OpenAI Structured Outputs
            client = OpenAI(api_key=body.api_key)
            response = client.beta.chat.completions.parse(
                model=body.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": body.query}
                ],
                response_format=AnalyticsDirective,
                temperature=0.1,
            )
            directive = response.choices[0].message.parsed
        else:
            # Use Gemini Structured Outputs
            client = genai.Client(api_key=body.api_key)
            response = client.models.generate_content(
                model=body.model,
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
        log_history(request_id, body.query, user_id=user_id, conversation_id=body.conversation_id, status="ERROR", error_message=f"LLM error: {exc}")
        raise HTTPException(status_code=502, detail=f"AI model error: {exc}")

    raw_sql = directive.sql_query

    data = []
    # ------------------------------------------------------------------
    # Step 2 & 3: Validate and Execute SQL (skip if TEXT_REPLY)
    # ------------------------------------------------------------------
    if directive.ui_directive != "TEXT_REPLY" and raw_sql:
        try:
            validate_sql(raw_sql)
        except HTTPException as exc:
            log_history(request_id, body.query, user_id=user_id, conversation_id=body.conversation_id, generated_sql=raw_sql, ui_directive=directive.ui_directive, status="ERROR", error_message=exc.detail)
            raise

        try:
            data = execute_readonly_query(raw_sql)
        except sqlite3.Error as exc:
            log_history(request_id, body.query, user_id=user_id, conversation_id=body.conversation_id, generated_sql=raw_sql, ui_directive=directive.ui_directive, status="ERROR", error_message=str(exc))
            raise HTTPException(status_code=500, detail=f"Database error: {exc}")

    # ------------------------------------------------------------------
    # Step 4: Log & return the structured response
    # ------------------------------------------------------------------
    log_history(
        request_id=request_id,
        user_query=body.query,
        user_id=user_id,
        conversation_id=body.conversation_id,
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


# ---------------------------------------------------------------------------
# History Endpoint (protected, scoped to current user)
# ---------------------------------------------------------------------------

@app.get("/api/history")
async def get_history(limit: int = 50, current_user: dict = Depends(get_current_user)):
    """Returns the most recent query history entries for the authenticated user."""
    try:
        with history_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT * FROM QueryHistory WHERE user_id = ? ORDER BY timestamp DESC LIMIT ?",
                (current_user["id"], limit),
            )
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
