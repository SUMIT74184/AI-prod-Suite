"""
code_review_agent/post_processor.py
===================================
Nodes for validating, deduplicating, and synthesizing findings from 
all specialist agents. Includes test and fix generation.
"""

import json
import logging
from app.core.llm_client import generate_text
from app.code_review_agent.state import ReviewState

logger = logging.getLogger(__name__)

def validate_findings_node(state: ReviewState) -> dict:
    """Filters out hallucinations or low confidence findings."""
    logger.info("[validate_findings] Validating %d raw findings...", len(state.get("raw_findings", [])))
    
    validated = []
    for f in state.get("raw_findings", []):
        if f.get("confidence", 0.0) >= 0.7:
            validated.append(f)
            
    return {"validated_findings": validated, "status": "validated"}


def deduplicate_findings_node(state: ReviewState) -> dict:
    """Merges similar findings from different agents."""
    logger.info("[deduplicate_findings] Deduplicating findings...")
    
    # In a full implementation, we'd use an LLM to group similar findings by semantic meaning.
    # For now, we will do a simple grouping by line_ref and category.
    seen = set()
    dedup = []
    for f in state.get("validated_findings", []):
        key = f"{f.get('line_ref')}_{f.get('category')}"
        if key not in seen:
            seen.add(key)
            dedup.append(f)
            
    return {"deduplicated_findings": dedup, "status": "deduplicated"}


def aggregate_report_node(state: ReviewState) -> dict:
    """Calculates health score and provides high-level explanation."""
    logger.info("[aggregate_report] Aggregating report...")
    
    findings = state.get("deduplicated_findings", [])
    
    # Calculate health
    score = 100
    for f in findings:
        sev = f.get("severity", "medium").lower()
        if sev == "critical": score -= 20
        elif sev == "high": score -= 10
        elif sev == "medium": score -= 5
        elif sev == "low": score -= 2
        
    health_score = max(0, score)
    
    prompt = f"""
You are the Lead Code Reviewer.
Summarize these findings into a short explanation and provide 3 refactoring tips.

Findings: {json.dumps(findings)}

Return JSON: {{"explanation": "...", "refactoring": ["tip1", "tip2"]}}
"""
    try:
        raw = generate_text(prompt)
        raw = raw.strip()
        if raw.startswith("```json"): raw = raw[7:]
        if raw.startswith("```"): raw = raw[3:]
        if raw.endswith("```"): raw = raw[:-3]
        
        parsed = json.loads(raw.strip())
        return {
            "health_score": health_score,
            "explanation": parsed.get("explanation", ""),
            "refactoring": parsed.get("refactoring", []),
            "status": "aggregated"
        }
    except Exception as e:
        logger.error("[aggregate_report] Failed to parse: %s", e)
        return {"health_score": health_score, "explanation": "Synthesis failed.", "refactoring": [], "status": "aggregated"}


def generate_fixes_node(state: ReviewState) -> dict:
    """Generates code patches to fix the high-priority findings."""
    logger.info("[generate_fixes] Generating code fixes...")
    
    findings = [f for f in state.get("deduplicated_findings", []) if f.get("severity") in ["critical", "high"]]
    if not findings:
        return {"generated_fixes": [], "status": "fixes_generated"}
        
    prompt = f"""
You are an expert developer. Provide inline diff fixes for the following severe issues found in the code.

Findings: {json.dumps(findings)}

Return a JSON array of fixes:
{{"fixes": [ {{"finding_id": "...", "file_path": "...", "original_code": "...", "suggested_code": "..."}} ]}}
"""
    try:
        raw = generate_text(prompt)
        raw = raw.strip()
        if raw.startswith("```json"): raw = raw[7:]
        if raw.startswith("```"): raw = raw[3:]
        if raw.endswith("```"): raw = raw[:-3]
        
        parsed = json.loads(raw.strip())
        return {"generated_fixes": parsed.get("fixes", []), "status": "fixes_generated"}
    except Exception as e:
        logger.error("[generate_fixes] Failed to parse: %s", e)
        return {"generated_fixes": [], "status": "fixes_generated"}


def generate_tests_node(state: ReviewState) -> dict:
    """Generates unit tests for the code based on the findings."""
    logger.info("[generate_tests] Generating tests...")
    
    # Simple placeholder logic for testing
    prompt = f"""
You are an expert developer. Write unit tests to cover the edge cases for the code provided.

Diff:
```
{state.get('git_diff', '')[:2000]}
```

Return JSON: {{"unit_tests": "def test_example(): pass"}}
"""
    try:
        raw = generate_text(prompt)
        raw = raw.strip()
        if raw.startswith("```json"): raw = raw[7:]
        if raw.startswith("```"): raw = raw[3:]
        if raw.endswith("```"): raw = raw[:-3]
        
        parsed = json.loads(raw.strip())
        return {"generated_tests": parsed.get("unit_tests", ""), "status": "tests_generated"}
    except Exception as e:
        logger.error("[generate_tests] Failed to parse: %s", e)
        return {"generated_tests": "", "status": "tests_generated"}


def finalize_review_node(state: ReviewState) -> dict:
    logger.info("[finalize_review] Review complete.")
    return {"status": "complete"}
