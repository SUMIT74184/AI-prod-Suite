# Code Review Agent — Complete Multi-Agent Architecture

Mermaid diagrams of the whole system around the 5 specialist agents. They match the current code in `backend/app/code_review_agent/`.

🔴 = LLM call  ⚪ = plain Python  🟡 = early exit / known bug

---

## 1. Complete architecture (clients → backend → 5-agent LangGraph → LLM)

```mermaid
flowchart TB
    %% ================= CLIENTS =================
    subgraph CLIENTS["Clients"]
        direction LR
        UI["Code reviewer page<br/>code-reviewer/page.tsx<br/>EventSource"]
        INT["Integrations page<br/>GitHub / GitLab repo URL + token"]
        CLI["reviewer CLI<br/>bin/reviewer.mjs"]
    end

    %% ================= BACKEND =================
    subgraph BACKEND["FastAPI backend"]
        direction TB
        R1["GET /api/py/code-review/stream<br/>snippet sent as ?code="]
        R2["GET /api/py/code-review/stream/repo"]
        GF["GitFetcher<br/>git clone, read up to 20 files"]
        R3["POST /api/v1/review/cli<br/>POST /api/v1/review/tool_result"]
        W["stream_review()<br/>daemon thread → Queue → SSE<br/>ping every 15 s"]
        RUN["run_review() / handle_tool_response()"]
        STORE[("_session_store<br/>in-memory dict<br/>key: 'mock-session-id'")]
    end

    %% ================= LANGGRAPH =================
    subgraph GRAPH["LangGraph compiled_graph — 12 nodes, 8–9 LLM calls, all sequential"]
        direction TB
        START(["START"]) --> CB

        CB["🔴 context_builder<br/>'Do you need full files?'<br/>diff[:2000] · context_builder.py:56"]
        CB --> Q{"pending_tool_calls?"}
        Q -->|"yes: halt_for_tools"| HALT(["🟡 END early<br/>CLI: 202 + ToolCalls<br/>Web: 0 findings, score 100 (Bug B)"])
        Q -->|"no: continue"| A1

        DIFF[/"state.git_diff<br/>same full input for every agent"/]

        subgraph AGENTS["5 specialist agents — graph.py:87 'Sequential Agents to avoid 20 RPM limit'"]
            direction TB
            A1["🔴 1. agent_bug<br/>logic errors, edge cases,<br/>race conditions<br/>category: logic_error · :60"]
            A2["🔴 2. agent_security<br/>OWASP top 10, secrets,<br/>XSS, SQLi<br/>category: security · :85"]
            A3["🔴 3. agent_performance<br/>loops, N+1, memory leaks,<br/>Big-O<br/>category: performance · :109"]
            A4["🔴 4. agent_architecture<br/>SOLID, coupling,<br/>bad patterns<br/>category: architecture · :133"]
            A5["🔴 5. agent_quality<br/>naming, duplication,<br/>code smells<br/>category: quality · :158"]
            A1 --> A2 --> A3 --> A4 --> A5
        end

        DIFF -. "full diff copied into all 5 prompts" .-> AGENTS

        RAW[("state.raw_findings<br/>Finding: agent, description, severity,<br/>line_ref, category, confidence")]
        AGENTS -. "each agent appends findings" .-> RAW

        subgraph POST["Post-processing — post_processor.py"]
            direction TB
            V["⚪ validate_findings<br/>keep confidence ≥ 0.7"]
            D["⚪ deduplicate_findings<br/>key = line_ref + category"]
            AG["🔴 aggregate_report<br/>health score in Python<br/>LLM: explanation + 3 tips · :70"]
            FX["🔴 generate_fixes<br/>LLM only if high/critical<br/>sees findings, not code · :105"]
            GT["🔴 generate_tests<br/>first 2000 chars of diff · :134"]
            FIN["⚪ finalize_review<br/>status = complete"]
            V --> D --> AG --> FX --> GT --> FIN
        end

        A5 --> V
        RAW -.-> V
        FIN --> END(["END"])
    end

    %% ================= LLM =================
    subgraph LLMS["LLM layer"]
        direction TB
        LC["llm_client.generate_text()<br/>httpx timeout 90 s"]
        OR[("OpenRouter<br/>nemotron-3-ultra-550b:free<br/>~8–40 s per call")]
        GEM[("Google Gemini<br/>fallback")]
        LC -->|"OPENROUTER_API_KEY set"| OR
        LC -->|"otherwise"| GEM
    end

    %% ================= WIRING =================
    UI -->|"code in URL"| R1
    INT -->|"repo url"| R2
    R2 --> GF --> W
    R1 --> W
    W -->|"graph.stream(state)"| START
    CLI -. "protocol exists, CLI does not use it" .-> R3
    R3 --> RUN
    RUN -->|"graph.invoke(state)"| START
    RUN <-->|"park / resume state"| STORE
    CLI -. "calls Gemini directly, bypasses backend" .-> GEM

    GRAPH ==>|"9 nodes send prompts, one at a time"| LC

    END -->|"SSE 'complete' event"| W
    W -->|"SSE event after every node"| UI
    W -->|"SSE event after every node"| INT

    %% ================= STYLES =================
    classDef llm fill:#fde2e2,stroke:#d33,color:#000
    classDef py fill:#eef,stroke:#88a,color:#000
    classDef warn fill:#fff3cd,stroke:#c90,color:#000
    classDef data fill:#e8f4ea,stroke:#4a8,color:#000
    class CB,A1,A2,A3,A4,A5,AG,FX,GT llm
    class V,D,FIN,Q,W,RUN,R1,R2,R3,GF py
    class HALT warn
    class DIFF,RAW,STORE data
```

---

## 2. CLI tool-call loop (pause and resume)

```mermaid
sequenceDiagram
    autonumber
    participant C as CLI client
    participant O as Orchestrator API
    participant R as runner.py
    participant S as _session_store
    participant G as LangGraph

    C->>O: POST /api/v1/review/cli (diff)
    O->>R: run_review(diff)
    R->>G: invoke(initial_state)
    G->>G: 🔴 context_builder → needs_files ≠ []
    G-->>R: state + pending_tool_calls (END early)
    R->>S: store["mock-session-id"] = state
    R-->>O: state
    O-->>C: 202 + ToolCalls (read_file)
    C->>C: read files locally
    C->>O: POST /api/v1/review/tool_result
    O->>R: handle_tool_response(session_id, results)
    R->>S: load state
    R->>G: invoke(state) — restarts from START
    G->>G: context_builder ingests files into context_files
    G->>G: 🔴 5 agents → post-processing (8 more LLM calls)
    G-->>R: final state
    R->>S: delete session
    R-->>O: findings, fixes, tests
    O-->>C: 200 review result
    Note over G: context_files is never added to any agent prompt (Bug C)
    Note over S: one fixed session id shared by every CLI user (Bug D)
```

---

## 3. Web review timeline (one LLM call at a time)

```mermaid
sequenceDiagram
    autonumber
    participant B as Browser
    participant API as FastAPI /stream
    participant W as Worker thread
    participant G as LangGraph
    participant L as OpenRouter

    B->>API: GET /stream?code=...
    API->>W: start daemon thread
    W->>G: compiled_graph.stream(state)
    G->>L: context_builder
    L-->>G: {"needs_files": []}
    G-->>B: SSE context_builder
    loop 5 specialists, one after another
        G->>L: agent_bug / security / performance / architecture / quality (full diff)
        L-->>G: findings JSON
        G-->>B: SSE agent_*
    end
    G->>G: validate + deduplicate (no LLM)
    G->>L: aggregate_report
    opt high / critical findings exist
        G->>L: generate_fixes
    end
    G->>L: generate_tests
    G-->>B: SSE complete
    Note over B,L: ≈ 9 × (8–40 s) ≈ 1.5–5 min. Any failed agent call ends the run and loses earlier findings (Bug A).
```

---

## 4. Suggested architecture (parallel fan-out, fewer calls)

```mermaid
flowchart TD
    S(["START"]) --> SZ{"input size"}

    SZ -->|"small, under ~200 lines"| ONE["🔴 combined_review<br/>bug + security + perf + arch + quality<br/>+ summary in one JSON"]
    ONE --> E1(["END · 1 call"])

    SZ -->|"large / repo"| FAN["fan out in parallel"]
    FAN --> P1["🔴 agent_bug"]
    FAN --> P2["🔴 agent_security"]
    FAN --> P3["🔴 agent_performance"]
    FAN --> P4["🔴 agent_arch_quality"]
    P1 & P2 & P3 & P4 --> MERGE["⚪ merge + validate + dedupe<br/>raw_findings: Annotated[list, operator.add]"]
    MERGE --> SUM["🔴 aggregate_report"]
    SUM --> E2(["END · 5 calls, 2 waits"])

    E1 & E2 -.-> OPT["On demand from the UI:<br/>🔴 generate_fixes · 🔴 generate_tests"]

    classDef llm fill:#fde2e2,stroke:#d33,color:#000
    classDef py fill:#eef,stroke:#88a,color:#000
    class ONE,P1,P2,P3,P4,SUM llm
    class MERGE py
```
