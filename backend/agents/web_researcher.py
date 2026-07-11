import os
# pyrefly: ignore [missing-import]
from duckduckgo_search import DDGS
from google import genai
from pydantic import BaseModel
from dotenv import load_dotenv

# Try to load env variables from Next.js .env.local
load_dotenv(dotenv_path="../.env.local")

api_key = os.environ.get("GEMINI_API_KEY")
client = genai.Client(api_key=api_key) if api_key else None

def search_web(query: str, max_results: int = 7) -> str:
    """Uses DuckDuckGo to search the web and returns a formatted string of results."""
    try:
        with DDGS() as ddgs:
            results = list(ddgs.text(query, max_results=max_results))
            
        if not results:
            return "No results found."
            
        formatted_results = ""
        for i, res in enumerate(results):
            formatted_results += f"Source {i+1}: {res.get('title', 'No Title')}\n"
            formatted_results += f"URL: {res.get('href', 'No URL')}\n"
            formatted_results += f"Summary: {res.get('body', 'No Summary')}\n\n"
            
        return formatted_results
    except Exception as e:
        return f"Error performing search: {str(e)}"

def generate_report(query: str, search_data: str) -> str:
    """Uses Gemini to generate a comprehensive markdown report based on search data."""
    if not client:
        return "# Error\nGEMINI_API_KEY is missing. Cannot generate report. Please add it to your .env.local file."
        
    prompt = f"""
You are an expert Web Research Agent. Your task is to write a comprehensive, well-structured research report on the following topic:

Topic: {query}

Use the following search results to inform your report. Cite your sources where appropriate by referencing the URLs.
Make the report professional, detailed, and beautifully formatted in Markdown. 
Avoid saying "based on the provided results", just write it as an authoritative report.

Search Results:
{search_data}

Format the report with:
# Title
## Executive Summary
## Detailed Findings (use subsections if necessary)
## Conclusion
## Sources (list the URLs used as bullet points)
"""
    
    try:
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
        )
        return response.text
    except Exception as e:
        return f"# Error\nFailed to generate report with Gemini: {str(e)}"

def run_research(query: str) -> str:
    """Orchestrates the research process: Search -> Generate Report."""
    search_data = search_web(query)
    report = generate_report(query, search_data)
    return report
