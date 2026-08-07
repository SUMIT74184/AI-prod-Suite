"""
Variable Parser & Renderer Utility
----------------------------------
Parses {{variable_name}} tokens and replaces them with user-provided values.
"""

import re
from typing import List, Dict, Tuple

VARIABLE_REGEX = re.compile(r"\{\{\s*([a-zA-Z0-9_]+)\s*\}\}")

def extract_variables(text: str) -> List[str]:
    """
    Extracts all unique variable names enclosed in double curly braces {{var}}.
    """
    if not text:
        return []
    matches = VARIABLE_REGEX.findall(text)
    # Return ordered unique list
    seen = set()
    result = []
    for var in matches:
        if var not in seen:
            seen.add(var)
            result.append(var)
    return result

def render_prompt(template_text: str, variables: Dict[str, str]) -> Tuple[str, List[str]]:
    """
    Replaces {{variable_name}} in template_text with provided variable values.
    Returns rendered string and list of missing variable keys.
    """
    if not template_text:
        return "", []
        
    extracted = extract_variables(template_text)
    missing = [var for var in extracted if var not in variables or variables[var] is None]
    
    def replacer(match):
        var_name = match.group(1).strip()
        return str(variables.get(var_name, match.group(0)))
        
    rendered_text = VARIABLE_REGEX.sub(replacer, template_text)
    return rendered_text, missing
