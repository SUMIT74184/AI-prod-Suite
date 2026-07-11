import os
import re
from google import genai
from pydantic import BaseModel
from typing import List, Optional
from dotenv import load_dotenv
# pyrefly: ignore [missing-import]
from youtube_transcript_api import YouTubeTranscriptApi

load_dotenv(dotenv_path="../.env.local")

api_key = os.environ.get("GEMINI_API_KEY")
client = genai.Client(api_key=api_key) if api_key else None

class ChatMessage(BaseModel):
    role: str
    content: str

def extract_video_id(url: str) -> Optional[str]:
    """Extracts the YouTube video ID from a URL."""
    # Match standard youtube.com/watch?v= or youtu.be/
    pattern = r'(?:v=|\/)([0-9A-Za-z_-]{11}).*'
    match = re.search(pattern, url)
    if match:
        return match.group(1)
    return None

def get_youtube_transcript(video_id: str) -> str:
    try:
        transcript = YouTubeTranscriptApi.get_transcript(video_id)
        # Combine the text parts
        text = " ".join([t['text'] for t in transcript])
        return text
    except Exception as e:
        return f"[Failed to retrieve transcript: {str(e)}]"

def generate_assistant_response(messages: List[ChatMessage], youtube_url: str = "") -> str:
    if not client:
        return "Error: GEMINI_API_KEY is missing from .env.local file."

    # Build the conversation history
    context = ""
    
    # Process YouTube URL if provided
    if youtube_url.strip():
        video_id = extract_video_id(youtube_url)
        if video_id:
            transcript = get_youtube_transcript(video_id)
            context += f"\n--- YOUTUBE VIDEO TRANSCRIPT FOR CONTEXT ---\n{transcript}\n---------------------------------------------\n"
        else:
            context += f"\n[Could not extract valid YouTube Video ID from: {youtube_url}]\n"

    # Construct the prompt from messages
    prompt = "You are a highly capable AI Research Assistant. Your goal is to provide excellent summaries, notes, mind maps, deck reports, and answer questions based on the provided context or chat history.\n"
    
    if context:
        prompt += context + "\n"
        
    prompt += "\n--- CONVERSATION HISTORY ---\n"
    for msg in messages:
        role = "User" if msg.role == "user" else "Assistant"
        prompt += f"{role}: {msg.content}\n"
        
    prompt += "Assistant:"

    try:
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
        )
        return response.text
    except Exception as e:
        return f"Error communicating with AI: {str(e)}"
