"""
Prompt Schemas
--------------
Data Transfer Objects (DTOs) for prompt creation, updates, and listings.
"""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime

class PromptBase(BaseModel):
    name: str = Field(..., description="Name of the prompt")
    description: Optional[str] = Field(default="", description="Prompt description")
    section: str = Field(default="My Prompts", description="Section or folder (e.g. My Prompts, Team Prompts, Templates, Favorites)")
    tags: List[str] = Field(default_factory=list, description="List of tags")
    is_favorite: bool = Field(default=False, description="Whether prompt is pinned/favorite")

class PromptCreate(PromptBase):
    system_prompt: str = Field(default="", description="System prompt content")
    user_prompt: str = Field(..., description="User prompt content containing {{variables}}")
    default_provider: Optional[str] = Field(default="OpenAI", description="Default provider")
    default_model: Optional[str] = Field(default="GPT-4o", description="Default model name")

class PromptUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    section: Optional[str] = None
    tags: Optional[List[str]] = None
    is_favorite: Optional[bool] = None
    system_prompt: Optional[str] = None
    user_prompt: Optional[str] = None

class PromptVersionResponse(BaseModel):
    id: str
    prompt_id: str
    version_number: int
    system_prompt: str
    user_prompt: str
    default_provider: str
    default_model: str
    settings_json: Dict[str, Any]
    variables_schema: List[str]
    created_at: str

class PromptResponse(PromptBase):
    id: str
    created_by: str
    status: str
    latest_version: int
    system_prompt: str
    user_prompt: str
    created_at: str
    updated_at: str
    versions: List[PromptVersionResponse] = Field(default_factory=list)
