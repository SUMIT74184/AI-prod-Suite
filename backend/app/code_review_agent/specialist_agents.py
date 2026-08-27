"""
code_review_agent/specialist_agents.py
======================================
Dedicated LLM agents for specific code review domains.
They read the git_diff and context_files, and append Findings.
Currently designed to run sequentially to respect rate limits.
"""

import json
import uuid
import logging
from app.core.llm_client import generate_text
from app.code_review_agent.state import ReviewState, Finding

logger = logging.getLogger(__name__)

def _parse_agent_response(agent_name: str, raw_response: str) -> list:
    """Parses LLM JSON into a list of Finding objects."""
    raw = raw_response.strip()
    if raw.startswith("```json"): raw = raw[7:]
    if raw.startswith("```"): raw = raw[3:]
    if raw.endswith("```"): raw = raw[:-3]
    
    findings = []
    try:
        parsed = json.loads(raw.strip())
        items = parsed.get("findings", [])
        for item in items:
            findings.append(
                Finding(
                    id=str(uuid.uuid4()),
                    agent=agent_name,
                    description=item.get("description", ""),
                    severity=item.get("severity", "medium"),
                    line_ref=item.get("line_ref", "unknown"),
                    category=item.get("category", "other"),
                    confidence=float(item.get("confidence", 0.8))
                )
            )
    except Exception as e:
        logger.error("[%s] Failed to parse findings: %s", agent_name, e)
    return findings


def agent_bug_node(state: ReviewState) -> dict:
    logger.info("[agent_bug] Scanning for logic errors...")
    
    prompt = f"""
You are the Bug Specialist Code Reviewer.
Analyze this git diff for logical errors, edge cases, and race conditions.
Only report actual bugs, not style issues.

Diff:
```
{state['git_diff']}
```

Return a JSON object: {{"findings": [ {{"description": "...", "severity": "high", "line_ref": "file.py:L10", "category": "logic_error", "confidence": 0.9}} ]}}
"""
    raw = generate_text(prompt)
    findings = _parse_agent_response("bug", raw)
    # Convert Finding objects to dicts so they can be serialized easily in state
    findings_dicts = [vars(f) for f in findings]
    
    return {
        "raw_findings": state.get("raw_findings", []) + findings_dicts,
        "status": "agent_bug_complete"
    }


def agent_security_node(state: ReviewState) -> dict:
    logger.info("[agent_security] Scanning for security vulnerabilities...")
    
    prompt = f"""
You are the Security Specialist Code Reviewer.
Analyze this git diff for vulnerabilities (OWASP top 10, secrets leaks, XSS, SQLi).

Diff:
```
{state['git_diff']}
```

Return a JSON object: {{"findings": [ {{"description": "...", "severity": "critical", "line_ref": "file.py:L10", "category": "security", "confidence": 0.9}} ]}}
"""
    raw = generate_text(prompt)
    findings = _parse_agent_response("security", raw)
    findings_dicts = [vars(f) for f in findings]
    
    return {
        "raw_findings": state.get("raw_findings", []) + findings_dicts,
        "status": "agent_security_complete"
    }


def agent_performance_node(state: ReviewState) -> dict:
    logger.info("[agent_performance] Scanning for performance issues...")
    
    prompt = f"""
You are the Performance Specialist Code Reviewer.
Analyze this git diff for inefficient loops, N+1 queries, memory leaks, and high Big-O complexity.

Diff:
```
{state['git_diff']}
```

Return a JSON object: {{"findings": [ {{"description": "...", "severity": "medium", "line_ref": "file.py:L10", "category": "performance", "confidence": 0.9}} ]}}
"""
    raw = generate_text(prompt)
    findings = _parse_agent_response("performance", raw)
    findings_dicts = [vars(f) for f in findings]
    
    return {
        "raw_findings": state.get("raw_findings", []) + findings_dicts,
        "status": "agent_performance_complete"
    }


def agent_architecture_node(state: ReviewState) -> dict:
    logger.info("[agent_architecture] Scanning for architectural issues...")
    
    prompt = f"""
You are the Architecture Specialist Code Reviewer.
Analyze this git diff for violations of SOLID principles, tight coupling, and bad design patterns.

Diff:
```
{state['git_diff']}
```

Return a JSON object: {{"findings": [ {{"description": "...", "severity": "low", "line_ref": "file.py:L10", "category": "architecture", "confidence": 0.8}} ]}}
"""
    raw = generate_text(prompt)
    findings = _parse_agent_response("architecture", raw)
    findings_dicts = [vars(f) for f in findings]
    
    return {
        "raw_findings": state.get("raw_findings", []) + findings_dicts,
        "status": "agent_architecture_complete"
    }


def agent_quality_node(state: ReviewState) -> dict:
    logger.info("[agent_quality] Scanning for code quality issues...")
    
    prompt = f"""
You are the Quality Specialist Code Reviewer.
Analyze this git diff for bad naming conventions, code duplication, and poor maintainability (code smells).

Diff:
```
{state['git_diff']}
```

Return a JSON object: {{"findings": [ {{"description": "...", "severity": "low", "line_ref": "file.py:L10", "category": "quality", "confidence": 0.9}} ]}}
"""
    raw = generate_text(prompt)
    findings = _parse_agent_response("quality", raw)
    findings_dicts = [vars(f) for f in findings]
    
    return {
        "raw_findings": state.get("raw_findings", []) + findings_dicts,
        "status": "agent_quality_complete"
    }
