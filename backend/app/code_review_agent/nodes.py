"""
code_review_agent/nodes.py
============================
The seven graph nodes of the Code Review Agent.

Each node is a pure function:
    Input:  ReviewState (the full current state)
    Output: dict with ONLY the fields this node changes

LangGraph merges the returned dict back into the state automatically.

Node execution order (defined in graph.py):
    parse_code → detect_bugs → check_security → analyze_complexity
        → synthesize_report → generate_tests → finalize_review

Nodes:
    parse_code_node       — Detect language, count lines, extract structure
    detect_bugs_node      — Find logical bugs with severity scoring
    check_security_node   — Find security vulnerabilities with severity
    analyze_complexity_node — Big-O, cyclomatic complexity, code smells
    synthesize_report_node  — Merge all findings into health score + explanation
    generate_tests_node   — Write unit test code
    finalize_review_node  — Assemble the final response
"""

import json
import logging
from typing import Any, List

from app.core.llm_client import generate_text
from app.code_review_agent.state import ReviewState

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _safe_parse_json(text: str, fallback: Any = None) -> Any:
    """Strip markdown fences and parse JSON, returning fallback on failure."""
    text = text.strip()
    if text.startswith("```json"):
        text = text[7:]
    if text.startswith("```"):
        text = text[3:]
    if text.endswith("```"):
        text = text[:-3]
    text = text.strip()
    try:
        return json.loads(text)
    except (json.JSONDecodeError, ValueError) as e:
        logger.warning("[nodes] JSON parse failed: %s — raw: %s", e, text[:200])
        return fallback


# ---------------------------------------------------------------------------
# Node 1: parse_code
# ---------------------------------------------------------------------------

def parse_code_node(state: ReviewState) -> dict:
    """
    Detect the programming language, count lines, and extract code structure
    (functions, classes, imports).

    This node runs first and provides context for all subsequent nodes.
    Language-specific prompts in downstream nodes use the detected language
    for targeted analysis.

    Input fields read:  code
    Output fields set:  language, structure, line_count, status
    """
    code = state["code"]
    line_count = len(code.strip().splitlines())

    logger.info("[parse_code] Analyzing code structure (%d lines)", line_count)

    prompt = f"""\
You are an expert code analyst. Analyze the following source code and return a JSON object with these fields:

1. "language" — the programming language (e.g. "python", "javascript", "typescript", "java", "c++", "rust", "go", etc.). Use lowercase.
2. "functions" — an array of function/method names found in the code.
3. "classes" — an array of class names found in the code.
4. "imports" — an array of imported modules/packages.
5. "summary" — a one-sentence description of what this code file appears to do.

Return ONLY valid JSON. No markdown fences, no extra text.

Code:
```
{code}
```"""

    try:
        raw = generate_text(prompt)
        parsed = _safe_parse_json(raw, {})

        language = parsed.get("language", "unknown").lower()
        structure = {
            "functions": parsed.get("functions", []),
            "classes": parsed.get("classes", []),
            "imports": parsed.get("imports", []),
            "summary": parsed.get("summary", ""),
        }

        logger.info("[parse_code] Detected language: %s, functions: %d, classes: %d",
                     language, len(structure["functions"]), len(structure["classes"]))

        return {
            "language": language,
            "structure": structure,
            "line_count": line_count,
            "status": "parse_code",
        }

    except Exception as exc:
        logger.error("[parse_code] Failed: %s", exc)
        return {
            "language": "unknown",
            "structure": {"functions": [], "classes": [], "imports": [], "summary": ""},
            "line_count": line_count,
            "status": "parse_code",
            "error": f"Parse node error: {exc}",
        }


# ---------------------------------------------------------------------------
# Node 2: detect_bugs
# ---------------------------------------------------------------------------

def detect_bugs_node(state: ReviewState) -> dict:
    """
    Find logical errors, edge cases, potential crashes, and bugs.
    Each finding includes a severity level and line reference.

    Input fields read:  code, language, structure
    Output fields set:  bugs, status
    """
    logger.info("[detect_bugs] Scanning for bugs in %s code", state["language"])

    language = state["language"]
    structure_info = json.dumps(state["structure"], indent=2) if state["structure"] else "N/A"

    prompt = f"""\
You are an expert {language} code reviewer specializing in bug detection.

Analyze the following {language} code for bugs, logical errors, edge cases, race conditions, 
type errors, off-by-one errors, null/undefined reference issues, and potential crashes.

Code structure context:
{structure_info}

For each bug found, provide:
- "description": Clear explanation of the bug and its impact
- "severity": One of "critical", "high", "medium", "low"
- "line_ref": The approximate line number or range (e.g. "L5", "L12-L15")
- "category": One of "logic_error", "edge_case", "type_error", "null_reference", "race_condition", "resource_leak", "off_by_one", "other"

Return a JSON object with a single key "bugs" containing an array of bug objects.
If no bugs are found, return {{"bugs": []}}.
Return ONLY valid JSON. No markdown fences.

Code to analyze:
```{language}
{state["code"]}
```"""

    try:
        raw = generate_text(prompt)
        parsed = _safe_parse_json(raw, {"bugs": []})
        bugs = parsed.get("bugs", [])

        # Validate and normalize each bug entry
        validated_bugs = []
        for bug in bugs:
            if isinstance(bug, dict) and "description" in bug:
                validated_bugs.append({
                    "description": bug.get("description", ""),
                    "severity": bug.get("severity", "medium").lower(),
                    "line_ref": str(bug.get("line_ref", "N/A")),
                    "category": bug.get("category", "other"),
                })

        logger.info("[detect_bugs] Found %d bugs", len(validated_bugs))
        return {"bugs": validated_bugs, "status": "detect_bugs"}

    except Exception as exc:
        logger.error("[detect_bugs] Failed: %s", exc)
        return {
            "bugs": [],
            "status": "detect_bugs",
            "error": f"Bug detection error: {exc}",
        }


# ---------------------------------------------------------------------------
# Node 3: check_security
# ---------------------------------------------------------------------------

def check_security_node(state: ReviewState) -> dict:
    """
    Find security vulnerabilities with severity scoring and categorization.

    Uses language-specific checks (e.g. SQL injection for Python/JS,
    XSS for web code, buffer overflows for C/C++).

    Input fields read:  code, language
    Output fields set:  security, status
    """
    logger.info("[check_security] Running security analysis for %s", state["language"])

    language = state["language"]

    # Language-specific security focus areas
    lang_focus = {
        "python": "SQL injection (raw string formatting in queries), command injection (os.system, subprocess with shell=True), pickle deserialization, eval/exec usage, hardcoded secrets, insecure file permissions, path traversal",
        "javascript": "XSS (innerHTML, document.write), SQL injection, prototype pollution, eval usage, insecure regex (ReDoS), hardcoded API keys, CSRF vulnerabilities, insecure deserialization",
        "typescript": "XSS (innerHTML, dangerouslySetInnerHTML), SQL injection, prototype pollution, type assertion abuse hiding runtime errors, hardcoded secrets, insecure API calls",
        "java": "SQL injection (string concatenation in queries), XML external entity (XXE), insecure deserialization, hardcoded credentials, path traversal, LDAP injection",
        "c": "Buffer overflow, use-after-free, format string vulnerabilities, integer overflow, null pointer dereference, race conditions, memory leaks",
        "c++": "Buffer overflow, use-after-free, format string vulnerabilities, dangling pointers, memory leaks, TOCTOU race conditions",
        "go": "SQL injection, command injection, path traversal, goroutine leaks, unchecked errors, hardcoded secrets",
        "rust": "Unsafe blocks misuse, SQL injection in raw queries, hardcoded secrets, TOCTOU in file operations",
    }
    focus = lang_focus.get(language, "injection attacks, hardcoded secrets, insecure data handling, authentication flaws, authorization bypasses")

    prompt = f"""\
You are an expert application security engineer specializing in {language}.

Analyze the following {language} code for security vulnerabilities. Focus specifically on:
{focus}

For each vulnerability found, provide:
- "description": Clear explanation of the vulnerability, how it could be exploited, and its impact
- "severity": One of "critical", "high", "medium", "low"
- "category": One of "injection", "xss", "auth", "crypto", "secrets", "deserialization", "path_traversal", "resource_leak", "other"
- "line_ref": The approximate line number or range (e.g. "L5", "L12-L15")

Return a JSON object with a single key "security" containing an array of vulnerability objects.
If no vulnerabilities are found, return {{"security": []}}.
Return ONLY valid JSON. No markdown fences.

Code to analyze:
```{language}
{state["code"]}
```"""

    try:
        raw = generate_text(prompt)
        parsed = _safe_parse_json(raw, {"security": []})
        findings = parsed.get("security", [])

        validated = []
        for f in findings:
            if isinstance(f, dict) and "description" in f:
                validated.append({
                    "description": f.get("description", ""),
                    "severity": f.get("severity", "medium").lower(),
                    "category": f.get("category", "other"),
                    "line_ref": str(f.get("line_ref", "N/A")),
                })

        logger.info("[check_security] Found %d security issues", len(validated))
        return {"security": validated, "status": "check_security"}

    except Exception as exc:
        logger.error("[check_security] Failed: %s", exc)
        return {
            "security": [],
            "status": "check_security",
            "error": f"Security check error: {exc}",
        }


# ---------------------------------------------------------------------------
# Node 4: analyze_complexity
# ---------------------------------------------------------------------------

def analyze_complexity_node(state: ReviewState) -> dict:
    """
    Analyze time and space complexity, cyclomatic complexity,
    and code smells.

    Input fields read:  code, language, structure
    Output fields set:  complexity, status
    """
    logger.info("[analyze_complexity] Analyzing complexity")

    language = state["language"]
    structure_info = json.dumps(state["structure"], indent=2) if state["structure"] else "N/A"

    prompt = f"""\
You are an expert software engineer specializing in performance analysis and code quality.

Analyze the following {language} code for:

1. **Time Complexity**: For each function, provide Big-O time complexity with explanation.
2. **Space Complexity**: For each function, provide Big-O space complexity.
3. **Cyclomatic Complexity**: Identify functions with high branching complexity.
4. **Code Smells**: Identify patterns like:
   - Long functions (>30 lines)
   - Deep nesting (>3 levels)
   - Magic numbers
   - God objects/functions
   - Code duplication
   - Poor naming conventions

Code structure:
{structure_info}

Write a clear, structured analysis. Use markdown formatting with headers and bullet points.
Be specific — reference actual function names and line ranges.

Code to analyze:
```{language}
{state["code"]}
```"""

    try:
        complexity = generate_text(prompt).strip()
        logger.info("[analyze_complexity] Analysis complete (%d chars)", len(complexity))
        return {"complexity": complexity, "status": "analyze_complexity"}

    except Exception as exc:
        logger.error("[analyze_complexity] Failed: %s", exc)
        return {
            "complexity": "Complexity analysis failed.",
            "status": "analyze_complexity",
            "error": f"Complexity analysis error: {exc}",
        }


# ---------------------------------------------------------------------------
# Node 5: synthesize_report
# ---------------------------------------------------------------------------

def synthesize_report_node(state: ReviewState) -> dict:
    """
    Merge all findings into a coherent health score, explanation,
    and refactoring suggestions.

    The health score is calculated based on the number and severity
    of bugs and security issues found.

    Input fields read:  code, language, structure, bugs, security, complexity
    Output fields set:  explanation, health_score, refactoring, status
    """
    logger.info("[synthesize_report] Synthesizing findings")

    # ---- Calculate health score from findings ----
    severity_weights = {"critical": 25, "high": 15, "medium": 8, "low": 3}
    total_penalty = 0

    for bug in state["bugs"]:
        sev = bug.get("severity", "medium")
        total_penalty += severity_weights.get(sev, 8)

    for sec in state["security"]:
        sev = sec.get("severity", "medium")
        # Security issues are weighted slightly higher
        total_penalty += int(severity_weights.get(sev, 8) * 1.2)

    health_score = max(0, min(100, 100 - total_penalty))

    # ---- Generate explanation + refactoring via LLM ----
    bugs_summary = json.dumps(state["bugs"], indent=2) if state["bugs"] else "No bugs found."
    security_summary = json.dumps(state["security"], indent=2) if state["security"] else "No security issues found."

    prompt = f"""\
You are a senior engineering lead writing a code review summary.

Code language: {state["language"]}
Code structure: {json.dumps(state["structure"], indent=2)}

Bug findings:
{bugs_summary}

Security findings:
{security_summary}

Complexity analysis:
{state["complexity"]}

Health score: {health_score}/100

Write a JSON object with:
1. "explanation" — A 3-5 sentence high-level summary explaining what the code does, 
   its overall quality, and the most important issues found. Write in a professional, 
   constructive tone. Mention the health score.
2. "refactoring" — An array of 3-7 actionable refactoring suggestions ranked by impact.
   Each suggestion should be a concise string describing what to change and why.
   Focus on architecture, patterns, and code organization — NOT bug fixes (those are separate).

Return ONLY valid JSON. No markdown fences.
"""

    try:
        raw = generate_text(prompt)
        parsed = _safe_parse_json(raw, {})

        explanation = parsed.get("explanation", "Code review synthesis complete.")
        refactoring = parsed.get("refactoring", [])

        if not isinstance(refactoring, list):
            refactoring = [str(refactoring)]

        logger.info("[synthesize_report] Health score: %d, refactoring suggestions: %d",
                     health_score, len(refactoring))

        return {
            "explanation": explanation,
            "health_score": health_score,
            "refactoring": refactoring,
            "status": "synthesize_report",
        }

    except Exception as exc:
        logger.error("[synthesize_report] Failed: %s", exc)
        return {
            "explanation": "Synthesis failed — individual findings are still available.",
            "health_score": health_score,
            "refactoring": [],
            "status": "synthesize_report",
            "error": f"Synthesis error: {exc}",
        }


# ---------------------------------------------------------------------------
# Node 6: generate_tests
# ---------------------------------------------------------------------------

def generate_tests_node(state: ReviewState) -> dict:
    """
    Generate unit test code targeting the most important functions,
    especially those with bugs or edge cases identified.

    Input fields read:  code, language, structure, bugs
    Output fields set:  unit_tests, status
    """
    logger.info("[generate_tests] Generating unit tests for %s", state["language"])

    language = state["language"]
    structure_info = json.dumps(state["structure"], indent=2) if state["structure"] else "N/A"

    # Highlight functions with known bugs
    buggy_functions = set()
    for bug in state["bugs"]:
        desc = bug.get("description", "").lower()
        for func in state["structure"].get("functions", []):
            if func.lower() in desc:
                buggy_functions.add(func)

    bug_context = ""
    if buggy_functions:
        bug_context = f"\nPay special attention to these functions which have known bugs: {', '.join(buggy_functions)}\n"

    # Language-specific test frameworks
    test_frameworks = {
        "python": "pytest",
        "javascript": "Jest",
        "typescript": "Jest with TypeScript",
        "java": "JUnit 5",
        "c": "Unity or CUnit",
        "c++": "Google Test (gtest)",
        "go": "testing package",
        "rust": "#[cfg(test)] mod tests",
        "ruby": "RSpec",
        "php": "PHPUnit",
    }
    framework = test_frameworks.get(language, "appropriate testing framework")

    prompt = f"""\
You are an expert {language} developer writing comprehensive unit tests.

Write unit tests for the following {language} code using {framework}.
{bug_context}
Code structure:
{structure_info}

Guidelines:
- Test each public function/method
- Include edge cases (empty inputs, null/None, boundary values)
- Test the bug scenarios identified in the review
- Use descriptive test names
- Add brief comments explaining what each test validates
- Include both positive (expected behavior) and negative (error handling) test cases

Write ONLY the test code. No explanations outside code comments.

Source code to test:
```{language}
{state["code"]}
```"""

    try:
        unit_tests = generate_text(prompt).strip()

        # Clean markdown fences if present
        if unit_tests.startswith("```"):
            lines = unit_tests.splitlines()
            # Remove first and last lines if they're fences
            if lines[0].startswith("```"):
                lines = lines[1:]
            if lines and lines[-1].strip() == "```":
                lines = lines[:-1]
            unit_tests = "\n".join(lines)

        logger.info("[generate_tests] Tests generated (%d chars)", len(unit_tests))
        return {"unit_tests": unit_tests, "status": "generate_tests"}

    except Exception as exc:
        logger.error("[generate_tests] Failed: %s", exc)
        return {
            "unit_tests": f"# Test generation failed: {exc}",
            "status": "generate_tests",
            "error": f"Test generation error: {exc}",
        }


# ---------------------------------------------------------------------------
# Node 7: finalize_review
# ---------------------------------------------------------------------------

def finalize_review_node(state: ReviewState) -> dict:
    """
    Final assembly node — no LLM call, just marks the review as complete.

    This is a lightweight terminal node that validates all fields
    are populated and sets the final status.

    Input fields read:  all fields
    Output fields set:  status
    """
    logger.info("[finalize_review] Assembling final review")

    # Log summary stats
    bug_count = len(state.get("bugs", []))
    sec_count = len(state.get("security", []))
    health = state.get("health_score", 0)

    logger.info(
        "[finalize_review] Complete — bugs: %d, security: %d, health: %d/100",
        bug_count, sec_count, health,
    )

    return {"status": "complete"}
