"""
Prompt Repository
-----------------
Data Access Object (DAO) executing SQLite queries for Prompts, Versions, and Runs.
"""

import json
import uuid
import datetime
from typing import List, Dict, Any, Optional
from app.core.database import get_db

class PromptRepository:

    @staticmethod
    def get_all_prompts() -> List[Dict[str, Any]]:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM prompts ORDER BY updated_at DESC")
        rows = cursor.fetchall()
        conn.close()
        
        prompts = []
        for r in rows:
            p = dict(r)
            p["tags"] = json.loads(p.get("tags") or "[]")
            p["is_favorite"] = bool(p.get("is_favorite", 0))
            
            # Fetch latest version
            conn2 = get_db()
            c2 = conn2.cursor()
            c2.execute("SELECT * FROM prompt_versions WHERE prompt_id = ? ORDER BY version_number DESC LIMIT 1", (p["id"],))
            latest_v = c2.fetchone()
            conn2.close()

            if latest_v:
                v = dict(latest_v)
                p["system_prompt"] = v.get("system_prompt", "")
                p["user_prompt"] = v.get("user_prompt", "")
            else:
                p["system_prompt"] = ""
                p["user_prompt"] = ""
                
            prompts.append(p)
        return prompts

    @staticmethod
    def get_prompt_by_id(prompt_id: str) -> Optional[Dict[str, Any]]:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM prompts WHERE id = ?", (prompt_id,))
        row = cursor.fetchone()
        
        if not row:
            conn.close()
            return None
            
        p = dict(row)
        p["tags"] = json.loads(p.get("tags") or "[]")
        p["is_favorite"] = bool(p.get("is_favorite", 0))
        
        cursor.execute("SELECT * FROM prompt_versions WHERE prompt_id = ? ORDER BY version_number ASC", (prompt_id,))
        v_rows = cursor.fetchall()
        conn.close()
        
        versions = []
        for v in v_rows:
            v_dict = dict(v)
            v_dict["settings_json"] = json.loads(v_dict.get("settings_json") or "{}")
            v_dict["variables_schema"] = json.loads(v_dict.get("variables_schema") or "[]")
            versions.append(v_dict)
            
        p["versions"] = versions
        if versions:
            latest = versions[-1]
            p["system_prompt"] = latest["system_prompt"]
            p["user_prompt"] = latest["user_prompt"]
            
        return p

    @staticmethod
    def create_prompt(
        name: str, 
        description: str, 
        section: str, 
        tags: List[str],
        system_prompt: str,
        user_prompt: str,
        provider: str = "OpenAI",
        model: str = "GPT-4o",
        created_by: str = "user_1"
    ) -> Dict[str, Any]:
        prompt_id = str(uuid.uuid4())
        version_id = str(uuid.uuid4())
        now = datetime.datetime.utcnow().isoformat()

        conn = get_db()
        cursor = conn.cursor()
        
        cursor.execute(
            """
            INSERT INTO prompts (id, name, description, section, tags, created_by, status, latest_version, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, 'Published', 1, ?, ?)
            """,
            (prompt_id, name, description, section, json.dumps(tags), created_by, now, now)
        )
        
        cursor.execute(
            """
            INSERT INTO prompt_versions (id, prompt_id, version_number, system_prompt, user_prompt, default_provider, default_model, created_at)
            VALUES (?, ?, 1, ?, ?, ?, ?, ?)
            """,
            (version_id, prompt_id, system_prompt, user_prompt, provider, model, now)
        )
        
        conn.commit()
        conn.close()
        
        return PromptRepository.get_prompt_by_id(prompt_id)

    @staticmethod
    def add_version(
        prompt_id: str,
        system_prompt: str,
        user_prompt: str,
        provider: str = "OpenAI",
        model: str = "GPT-4o"
    ) -> Optional[Dict[str, Any]]:
        p = PromptRepository.get_prompt_by_id(prompt_id)
        if not p:
            raise ValueError("Prompt not found")
            
        new_version_num = p["latest_version"] + 1
        version_id = str(uuid.uuid4())
        now = datetime.datetime.utcnow().isoformat()
        
        conn = get_db()
        cursor = conn.cursor()
        
        cursor.execute(
            """
            INSERT INTO prompt_versions (id, prompt_id, version_number, system_prompt, user_prompt, default_provider, default_model, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (version_id, prompt_id, new_version_num, system_prompt, user_prompt, provider, model, now)
        )
        
        cursor.execute(
            "UPDATE prompts SET latest_version = ?, updated_at = ? WHERE id = ?",
            (new_version_num, now, prompt_id)
        )
        
        conn.commit()
        conn.close()
        
        return PromptRepository.get_prompt_by_id(prompt_id)

    @staticmethod
    def delete_prompt(prompt_id: str) -> bool:
        """Delete a prompt and all its versions and run history (cascade)."""
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM prompts WHERE id = ?", (prompt_id,))
        if not cursor.fetchone():
            conn.close()
            return False

        cursor.execute("DELETE FROM prompt_runs WHERE prompt_id = ?", (prompt_id,))
        cursor.execute("DELETE FROM prompt_versions WHERE prompt_id = ?", (prompt_id,))
        cursor.execute("DELETE FROM prompts WHERE id = ?", (prompt_id,))
        conn.commit()
        conn.close()
        return True

    @staticmethod
    def update_prompt(
        prompt_id: str,
        name: Optional[str] = None,
        description: Optional[str] = None,
        section: Optional[str] = None,
        tags: Optional[List[str]] = None,
        is_favorite: Optional[bool] = None,
    ) -> Optional[Dict[str, Any]]:
        """Partially update prompt metadata fields."""
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM prompts WHERE id = ?", (prompt_id,))
        if not cursor.fetchone():
            conn.close()
            return None

        now = datetime.datetime.utcnow().isoformat()
        updates = []
        params = []

        if name is not None:
            updates.append("name = ?")
            params.append(name)
        if description is not None:
            updates.append("description = ?")
            params.append(description)
        if section is not None:
            updates.append("section = ?")
            params.append(section)
        if tags is not None:
            updates.append("tags = ?")
            params.append(json.dumps(tags))
        if is_favorite is not None:
            updates.append("is_favorite = ?")
            params.append(1 if is_favorite else 0)

        if not updates:
            conn.close()
            return PromptRepository.get_prompt_by_id(prompt_id)

        updates.append("updated_at = ?")
        params.append(now)
        params.append(prompt_id)

        sql = f"UPDATE prompts SET {', '.join(updates)} WHERE id = ?"
        cursor.execute(sql, params)
        conn.commit()
        conn.close()

        return PromptRepository.get_prompt_by_id(prompt_id)

    @staticmethod
    def record_run(
        prompt_id: Optional[str],
        version_id: Optional[str],
        provider: str,
        model: str,
        latency_ms: float,
        input_tokens: int,
        output_tokens: int,
        total_tokens: int,
        estimated_cost_usd: float,
        status: str,
        output_text: str
    ) -> Dict[str, Any]:
        run_id = str(uuid.uuid4())
        now = datetime.datetime.utcnow().isoformat()
        
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO prompt_runs (id, prompt_id, version_id, provider, model, latency_ms, input_tokens, output_tokens, total_tokens, estimated_cost_usd, status, output_text, timestamp)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (run_id, prompt_id, version_id, provider, model, latency_ms, input_tokens, output_tokens, total_tokens, estimated_cost_usd, status, output_text, now)
        )
        conn.commit()
        conn.close()
        
        return {
            "id": run_id,
            "prompt_id": prompt_id,
            "version_id": version_id,
            "provider": provider,
            "model": model,
            "latency_ms": latency_ms,
            "input_tokens": input_tokens,
            "output_tokens": output_tokens,
            "total_tokens": total_tokens,
            "estimated_cost_usd": estimated_cost_usd,
            "status": status,
            "output_text": output_text,
            "timestamp": now
        }

    @staticmethod
    def get_runs(prompt_id: Optional[str] = None, limit: int = 20) -> List[Dict[str, Any]]:
        conn = get_db()
        cursor = conn.cursor()
        if prompt_id:
            cursor.execute("SELECT * FROM prompt_runs WHERE prompt_id = ? ORDER BY timestamp DESC LIMIT ?", (prompt_id, limit))
        else:
            cursor.execute("SELECT * FROM prompt_runs ORDER BY timestamp DESC LIMIT ?", (limit,))
        rows = cursor.fetchall()
        conn.close()
        return [dict(r) for r in rows]
