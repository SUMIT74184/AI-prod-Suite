import sqlite3
import os
import uuid
import datetime

from app.config import DATABASE_PATH

DB_FILE = DATABASE_PATH

def get_db():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS sessions (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            title TEXT NOT NULL,
            module TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS messages (
            id TEXT PRIMARY KEY,
            session_id TEXT NOT NULL,
            role TEXT NOT NULL,
            content TEXT NOT NULL,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (session_id) REFERENCES sessions (id) ON DELETE CASCADE
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS prompts (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            section TEXT DEFAULT 'My Prompts',
            tags TEXT DEFAULT '[]',
            is_favorite INTEGER DEFAULT 0,
            created_by TEXT DEFAULT 'user_1',
            status TEXT DEFAULT 'Draft',
            latest_version INTEGER DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS prompt_versions (
            id TEXT PRIMARY KEY,
            prompt_id TEXT NOT NULL,
            version_number INTEGER NOT NULL,
            system_prompt TEXT,
            user_prompt TEXT NOT NULL,
            default_provider TEXT DEFAULT 'OpenAI',
            default_model TEXT DEFAULT 'GPT-4o',
            settings_json TEXT DEFAULT '{}',
            variables_schema TEXT DEFAULT '[]',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (prompt_id) REFERENCES prompts (id) ON DELETE CASCADE
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS prompt_runs (
            id TEXT PRIMARY KEY,
            prompt_id TEXT,
            version_id TEXT,
            provider TEXT NOT NULL,
            model TEXT NOT NULL,
            latency_ms REAL NOT NULL,
            input_tokens INTEGER NOT NULL,
            output_tokens INTEGER NOT NULL,
            total_tokens INTEGER NOT NULL,
            estimated_cost_usd REAL NOT NULL,
            status TEXT DEFAULT 'Success',
            output_text TEXT,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    conn.commit()
    conn.close()

def get_user_sessions(user_id: str, module: str | None = None):
    conn = get_db()
    cursor = conn.cursor()
    if module:
        cursor.execute(
            "SELECT * FROM sessions WHERE user_id = ? AND module = ? ORDER BY created_at DESC", 
            (user_id, module)
        )
    else:
        cursor.execute(
            "SELECT * FROM sessions WHERE user_id = ? ORDER BY created_at DESC", 
            (user_id,)
        )
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

def get_session(session_id: str):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM sessions WHERE id = ?", (session_id,))
    session = cursor.fetchone()
    
    if not session:
        conn.close()
        return None
        
    cursor.execute("SELECT * FROM messages WHERE session_id = ? ORDER BY timestamp ASC", (session_id,))
    messages = cursor.fetchall()
    
    conn.close()
    
    return {
        "session": dict(session),
        "messages": [dict(m) for m in messages]
    }

def create_session(session_id: str, user_id: str, title: str, module: str):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO sessions (id, user_id, title, module) VALUES (?, ?, ?, ?)",
        (session_id, user_id, title, module)
    )
    conn.commit()
    conn.close()

def update_session_title(session_id: str, title: str):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        "UPDATE sessions SET title = ? WHERE id = ?",
        (title, session_id)
    )
    conn.commit()
    conn.close()
    return True

def add_message(session_id: str, role: str, content: str, msg_id: str | None = None):
    if not msg_id:
        msg_id = str(uuid.uuid4())
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO messages (id, session_id, role, content) VALUES (?, ?, ?, ?)",
        (msg_id, session_id, role, content)
    )
    conn.commit()
    conn.close()

def delete_db_session(session_id: str):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM messages WHERE session_id = ?", (session_id,))
    cursor.execute("DELETE FROM sessions WHERE id = ?", (session_id,))
    conn.commit()
    conn.close()
    return True
