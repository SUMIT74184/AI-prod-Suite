# Code Reviewer Agent — Architecture

This file shows how a review moves through the system and **where each LLM call happens**. The diagrams match the current code in `backend/app/code_review_agent/`.

---

## 1. System overview

How a review request goes from the browser to the LLM and back.

```mermaid
flowchart LR
    subgraph FE["Frontend (Next.js)"]
        UI["code-reviewer/page.tsx<br/>EventSource"]
        CLI["bin/reviewer.mjs<br/>(calls Gemini directly)"]
    end

    subgraph BE["Backend (FastAPI)"]
        R1["GET /api/py/code-review/stream<br/>(snippet)"]
        R2["GET /api/py/code-review/stream/repo<br/>(GitHub / GitLab)"]
        R3["POST /api/v1/review/cli<br/>POST /api/v1/review/tool_result"]
        GF["GitFetcher<br/>git clone + read up to 20 files"]
        W["Worker thread<br/>stream_review()"]
        G["LangGraph<br/>compiled_graph"]
        LLM["llm_client.generate_text()"]
    end

    OR[("OpenRouter<br/>nemotron-3-ultra-550b:free<br/>~8–40 s per call")]
    GEM[("Google Gemini")]

    UI -- "code in URL query" --> R1
    UI -- "repo url" --> R2
    R2 --> GF --> W
    R1 --> W
    R3 --> G
    W --> G
    G -- "8–9 calls, one after another" --> LLM
    LLM --> OR
    CLI -. "does not use backend" .-> GEM

    W -- "SSE event after each node<br/>+ ping every 15 s" --> UI
```

---

## 2. The LangGraph pipeline — where the 9 LLM calls happen

🔴 = makes an LLM call  ⚪ = plain Python, no LLM call

```mermaid
flowchart TD
    START(["START"]) --> CB

    CB["🔴 1. context_builder<br/>Asks the LLM: do you need full files?<br/>context_builder.py:56"]

    CB -->|"needs_files is not empty"| HALT(["END early ⚠️<br/>Web UI: 0 findings, score 100 (Bug B)<br/>CLI: wait for tool results"])
    CB -->|"needs_files is empty"| A1

    subgraph SEQ["5 specialist agents, run one after another (graph.py:87-91)<br/>each one receives the FULL diff / repo text"]
        direction TB
        A1["🔴 2. agent_bug<br/>logic errors, edge cases"]
        A2["🔴 3. agent_security<br/>OWASP, secrets, injection"]
        A3["🔴 4. agent_performance<br/>loops, N+1, Big-O"]
        A4["🔴 5. agent_architecture<br/>SOLID, coupling"]
        A5["🔴 6. agent_quality<br/>naming, duplication"]
        A1 --> A2 --> A3 --> A4 --> A5
    end

    A5 --> V["⚪ validate_findings<br/>keep confidence ≥ 0.7"]
    V --> D["⚪ deduplicate_findings<br/>key = line_ref + category"]
    D --> AG["🔴 7. aggregate_report<br/>health score + explanation + tips"]
    AG --> FX{"any high / critical<br/>findings?"}
    FX -->|"yes"| GFX["🔴 8. generate_fixes<br/>(sees findings only, not code)"]
    FX -->|"no: skips LLM"| GT
    GFX --> GT["🔴 9. generate_tests<br/>first 2000 chars of diff only"]
    GT --> FIN["⚪ finalize_review"]
    FIN --> END(["END → 'complete' SSE event"])

    classDef llm fill:#fde2e2,stroke:#d33,color:#000
    classDef nollm fill:#eef,stroke:#88a,color:#000
    classDef warn fill:#fff3cd,stroke:#c90,color:#000
    class CB,A1,A2,A3,A4,A5,AG,GFX,GT llm
    class V,D,FIN nollm
    class HALT warn
```

### Counting the calls

| # | Node | File | When it runs |
|---|---|---|---|
| 1 | `context_builder` | `context_builder.py:56` | Always |
| 2 | `agent_bug` | `specialist_agents.py:60` | Always |
| 3 | `agent_security` | `specialist_agents.py:85` | Always |
| 4 | `agent_performance` | `specialist_agents.py:109` | Always |
| 5 | `agent_architecture` | `specialist_agents.py:133` | Always |
| 6 | `agent_quality` | `specialist_agents.py:158` | Always |
| 7 | `aggregate_report` | `post_processor.py:70` | Always |
| 8 | `generate_fixes` | `post_processor.py:105` | Only when there are high or critical findings |
| 9 | `generate_tests` | `post_processor.py:134` | Always |

**8 calls every time, 9 when there are high or critical findings.** None of them run in parallel.

---

## 3. Why there are 9 calls: the design decisions behind each one

```mermaid
flowchart LR
    Q1{"Does the LLM need<br/>more file context?"} -->|"one call to ask"| C1["+1 call<br/>(context_builder)"]
    Q2{"One reviewer or<br/>5 specialists?"} -->|"5 specialists"| C2["+5 calls"]
    Q3{"Parallel or<br/>one after another?"} -->|"one after another<br/>'to avoid 20 RPM limit'"| C3["5 × the wait time"]
    Q4{"Write a summary?"} -->|"yes, separate call"| C4["+1 call<br/>(aggregate_report)"]
    Q5{"Write fixes?"} -->|"if high/critical"| C5["+0 or 1 call<br/>(generate_fixes)"]
    Q6{"Write tests?"} -->|"always"| C6["+1 call<br/>(generate_tests)"]

    C1 & C2 & C4 & C5 & C6 --> T["8–9 calls"]
    C3 --> TT["total time = sum of all calls"]
```

1. **context_builder (+1):** added so the agent could ask the CLI for full files. On the web UI nothing ever sends those files, and the agents don't use them anyway (Bug C). The call does nothing useful on the web path.
2. **5 specialists (+5):** each review area is a separate prompt carrying the **same full input**. One prompt asking for all 5 categories would give similar findings in 1 call.
3. **Run one after another:** `graph.py:87` says `# Sequential Agents to avoid 20 RPM limit`. 9 calls is well under 20 per minute, but running in order means each wait adds to the total.
4. **aggregate_report, generate_fixes, generate_tests (+2 or 3):** each is a separate call, and fixes and tests run even when the user may not need them.

---

## 4. Timeline of one review (sequence diagram)

With the current model, each call takes about 8–40 s (see `backend/hang_output.log`).

```mermaid
sequenceDiagram
    autonumber
    participant B as Browser (page.tsx)
    participant API as FastAPI /stream
    participant W as Worker thread
    participant G as LangGraph
    participant L as OpenRouter (nemotron free)

    B->>API: GET /stream?code=... (code in URL)
    API->>W: start daemon thread
    W->>G: compiled_graph.stream(state)

    G->>L: 1. context_builder
    L-->>G: {"needs_files": []}  (~10 s)
    G-->>B: SSE context_builder

    G->>L: 2. agent_bug (full input)
    L-->>G: findings (~10–40 s)
    G-->>B: SSE agent_bug
    G->>L: 3. agent_security (full input)
    L-->>G: findings
    G->>L: 4. agent_performance (full input)
    L-->>G: findings
    G->>L: 5. agent_architecture (full input)
    L-->>G: findings
    G->>L: 6. agent_quality (full input)
    L-->>G: findings
    Note over B,API: if nothing happens for 15 s, ping event<br/>(throws TypeError in page.tsx, Bug G)

    G->>G: validate + deduplicate (no LLM)
    G->>L: 7. aggregate_report
    L-->>G: explanation, tips
    opt high / critical findings exist
        G->>L: 8. generate_fixes (findings only, no code)
        L-->>G: fixes
    end
    G->>L: 9. generate_tests (first 2000 chars)
    L-->>G: tests
    G-->>B: SSE complete
    Note over B,L: Total ≈ 9 × (8–40 s) ≈ 1.5–5 min<br/>Worst case with 90 s timeouts ≈ 13.5 min
```

### What happens when one call fails (Bug A)

```mermaid
sequenceDiagram
    participant G as LangGraph
    participant L as OpenRouter
    participant B as Browser

    G->>L: 1. context_builder ✅
    G->>L: 2. agent_bug ✅ (findings saved in state)
    G->>L: 3. agent_security
    L--xG: 429 rate limited / 90 s timeout
    Note over G: specialist_agents.py has no try/except<br/>exception ends the whole graph
    G-->>B: SSE error: "Code review failed"
    Note over B: agent_bug findings are lost
```

---

## 5. Suggested architecture (fewer calls)

A version with **1–2 calls for small inputs** and **3 calls for larger ones**, with the specialists running in parallel:

```mermaid
flowchart TD
    S(["START"]) --> SZ{"input size"}

    SZ -->|"small (< ~200 lines)"| ONE["🔴 1. combined_review<br/>bugs + security + perf + arch + quality<br/>+ summary in ONE JSON"]
    ONE --> E1(["END (1 call)"])

    SZ -->|"large / repo"| FAN["fan out (parallel)"]
    FAN --> P1["🔴 agent_bug"]
    FAN --> P2["🔴 agent_security"]
    FAN --> P3["🔴 agent_performance"]
    FAN --> P4["🔴 agent_arch_quality"]
    P1 & P2 & P3 & P4 --> MERGE["⚪ merge + validate + dedupe<br/>raw_findings: Annotated[list, operator.add]"]
    MERGE --> SUM["🔴 aggregate_report"]
    SUM --> E2(["END (≈2 rounds of waiting)"])

    E1 & E2 -.-> OPT["Optional, on demand from UI:<br/>🔴 generate_fixes  🔴 generate_tests"]

    classDef llm fill:#fde2e2,stroke:#d33,color:#000
    class ONE,P1,P2,P3,P4,SUM llm
```

| Version | LLM calls | Waits (one after another) | Rough time with a fast model |
|---|---|---|---|
| Current | 8–9 | 8–9 | — (1.5–5 min on nemotron free) |
| Suggested, small input | 1 | 1 | ~5–15 s |
| Suggested, repo | 5 | 2 (parallel round + summary) | ~20–60 s |

The times for the suggested version are estimates; they haven't been measured.
