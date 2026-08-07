"""
Pricing Calculator
------------------
Calculates estimated USD cost for LLM executions based on input/output token counts.
"""

from typing import Tuple

# Pricing matrix: (cost_per_1k_input_tokens, cost_per_1k_output_tokens)
PRICING_TABLE = {
    # OpenAI Models
    "gpt-4o": (0.0025, 0.0100),
    "gpt-4o-mini": (0.00015, 0.00060),
    "gpt-4-turbo": (0.0100, 0.0300),
    "gpt-3.5-turbo": (0.0005, 0.0015),
    "o1-preview": (0.0150, 0.0600),
    "o1-mini": (0.0030, 0.0120),

    # Anthropic Models
    "claude-3-5-sonnet": (0.0030, 0.0150),
    "claude-3-opus": (0.0150, 0.0750),
    "claude-3-haiku": (0.00025, 0.00125),

    # Google Gemini Models
    "gemini-1.5-pro": (0.00125, 0.0050),
    "gemini-1.5-flash": (0.000075, 0.00030),
    "gemini-2.0-flash": (0.00010, 0.00040),

    # Default fallback
    "default": (0.0010, 0.0030),
}

def calculate_cost(model_name: str, input_tokens: int, output_tokens: int) -> float:
    """
    Computes estimated cost in USD based on model pricing table.
    """
    key = model_name.lower().strip()
    
    # Matching logic
    matched_pricing = None
    for k, price in PRICING_TABLE.items():
        if k in key:
            matched_pricing = price
            break
            
    if not matched_pricing:
        matched_pricing = PRICING_TABLE["default"]
        
    input_cost = (input_tokens / 1000.0) * matched_pricing[0]
    output_cost = (output_tokens / 1000.0) * matched_pricing[1]
    
    return round(input_cost + output_cost, 6)
