# 📊 DataMate

DataMate is an intelligent, natural-language-to-SQL analytics platform that empowers users to query their relational databases using plain English. It converts your questions into executable SQL, runs them securely, and dynamically visualizes the results as beautiful charts, tables, and metric cards.

> **Built for the OpenAI Open Build Week** 🚀
> This entire application was developed collaboratively using **Codex** (AI Agent). 

---

## ✨ Features

- **Natural Language Querying**: Talk to your data in plain English. The AI automatically understands your intent and generates the exact SQL required.
- **Dynamic Visualizations**: The system intelligently decides the best way to display your data. It dynamically renders:
  - 📈 Temporal Series (Line Charts)
  - 📊 Categorical Assertions (Bar Charts)
  - 🔢 Relational Tables
  - 🏆 Metric Cards
- **Custom Database Connections**: Bring your own data! Connect securely to any PostgreSQL or MySQL database.
- **AI Schema Introspection**: When you connect a new database, the backend automatically extracts the schema and uses the LLM to generate an optimized context file (`skills.md`) so it knows exactly how to query your specific data.
- **Secure Authentication & Storage**: Server-authoritative JWT authentication. All remote database credentials are encrypted at rest using AES (Fernet) encryption.
- **Seamless Chat Interface**: A modern, responsive chat workspace with conversation history, dark/light modes, and a beautiful UI.

## 🤖 How Codex Built DataMate

DataMate was architected and built from the ground up using **Codex** during the OpenAI Open Build Week. Here is how Codex accelerated every aspect of the development:

1. **Full-Stack Architecture**: Codex designed the modern architecture, splitting the stack into a fast, async Python FastAPI backend and a responsive React (Vite) frontend.
2. **AI-Driven Data Pipeline**: Codex implemented the core LLM pipeline. It defined strict Pydantic schemas to ensure the AI always responds with perfectly structured JSON, allowing the frontend to know exactly what UI components to render.
3. **Advanced Schema Introspection**: Codex built the `db_introspection.py` engine that connects to custom MySQL and PostgreSQL databases, extracts raw tables and foreign keys from the `information_schema`, and asks the LLM to write its own documentation.
4. **Beautiful Aesthetics**: The sleek, modern, glassmorphic UI and the dynamic React dispatcher for data visualizations were entirely styled and implemented by Codex.
5. **Security & Cryptography**: Codex implemented the complete JWT authentication flow and ensured that custom database passwords provided by users are never stored in plain text, utilizing the `cryptography` library for AES encryption.
6. **Debugging & Refactoring**: From resolving complex Git rebase merge conflicts to tracking down elusive CORS and port-mismatch network errors, Codex debugged the application in real-time.

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: React (via Vite)
- **Styling**: Vanilla CSS with modern aesthetics (Dark Mode, responsive layouts)
- **Icons**: Lucide React
- **Routing**: React Router

### Backend
- **Framework**: FastAPI (Python)
- **AI Integration**: OpenAI SDK / Google GenAI SDK
- **Database**: SQLite (for chat history & user management), PostgreSQL & MySQL (for external data)
- **Security**: Passlib (bcrypt), python-jose (JWT), Cryptography (Fernet)

---

## 🚀 Getting Started

### 1. Start the Backend
```bash
cd backend
python -m venv venv
.\venv\Scripts\activate  # On Windows
pip install -r requirements.txt
python -m uvicorn app:app --host 0.0.0.0 --port 8000 --reload
```

### 2. Start the Frontend
```bash
cd frontend
npm install
npm run dev
```

### 3. Usage
1. Create an account and log in.
2. Choose the built-in **Northwind Demo** database, or click **Connect New Database** to link your own PostgreSQL/MySQL instance.
3. Enter your OpenAI or Gemini API Key.
4. Start chatting with your data!
