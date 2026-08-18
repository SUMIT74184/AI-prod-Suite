import os
import json
from google import genai
from dotenv import load_dotenv

load_dotenv(dotenv_path="../.env.local")

api_key = os.environ.get("GEMINI_API_KEY")
client = genai.Client(api_key=api_key) if api_key else None


def review_code(code: str) -> dict:
    """
    Sends code to Gemini and returns a structured review result
    matching the frontend's ReviewResult interface.
    """
    if not client:
        return {
            "bugs": ["GEMINI_API_KEY is not set in .env.local"],
            "security": [],
            "improvements": [],
            "explanation": "Cannot perform review without API key.",
            "complexity": "N/A",
            "refactoring": [],
            "unitTests": "",
        }

    prompt = f"""You are an expert senior code reviewer. Analyze the following code carefully and return a JSON object with EXACTLY these keys:

1. "bugs" — an array of strings, each describing a bug or potential bug found.
2. "security" — an array of strings, each describing a security vulnerability.
3. "improvements" — an array of strings, each describing a code quality improvement suggestion.
4. "explanation" — a string providing a high-level explanation of what the code does.
5. "complexity" — a string describing time and space complexity analysis.
6. "refactoring" — an array of strings, each describing a refactoring suggestion.
7. "unitTests" — a string containing suggested unit test code for the most important functions.

If a category has no findings, return an empty array [] or empty string "".
Return ONLY valid JSON. No markdown fences, no extra text.

Code to review:
```
{code}
```"""

    try:
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
        )

        # Clean the response — strip markdown fences if Gemini wraps them
        text = response.text.strip()
        if text.startswith("```json"):
            text = text[7:]
        if text.startswith("```"):
            text = text[3:]
        if text.endswith("```"):
            text = text[:-3]
        text = text.strip()

        result = json.loads(text)

        # Ensure all expected keys exist
        default = {
            "bugs": [],
            "security": [],
            "improvements": [],
            "explanation": "",
            "complexity": "",
            "refactoring": [],
            "unitTests": "",
        }
        for key in default:
            if key not in result:
                result[key] = default[key]

        return result

    except json.JSONDecodeError:
        return {
            "bugs": [],
            "security": [],
            "improvements": [],
            "explanation": response.text if response else "Failed to parse AI response.",
            "complexity": "",
            "refactoring": [],
            "unitTests": "",
        }
    except Exception as e:
        return {
            "bugs": [f"Error during review: {str(e)}"],
            "security": [],
            "improvements": [],
            "explanation": "",
            "complexity": "",
            "refactoring": [],
            "unitTests": "",
        }
