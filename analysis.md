# 🔍 Code Reviewer Agent — Performance & Bug Analysis

> **Date:** 2026-10-03
>
> **Summary:** Even small repos are slow because every review makes **~9 LLM calls sequentially** to a **slow free reasoning model**. Separately, several bugs cause results to be empty, incorrect, or fail entirely. Bugs A and B were confirmed by running the graph with a fake LLM (no real API calls). **No code has been changed yet.**

---

## 📁 Files Analysed

| File | Role |
|---|---|
| `backend/app/code_review_agent/graph.py` | LangGraph pipeline definition |
| `backend/app/code_review_agent/context_builder.py` | Decides whether extra files are needed |
| `backend/app/code_review_agent/specialist_agents.py` | 5 specialist LLM agents |
| `backend/app/code_review_agent/post_processor.py` | Validate / dedupe / aggregate / fixes / tests |
| `backend/app/code_review_agent/runner.py` | `run_review`, `stream_review`, resume logic |
| `backend/app/code_review_agent/nodes.py` | Old 7-node implementation **(unused)** |
| `backend/app/routers/code_review.py` | SSE endpoints for snippet and repo review |
| `backend/app/routers/review_orchestrator.py` | CLI tool-call protocol endpoints |
| `backend/app/services/git_fetcher.py` | Repo clone + file extraction |
| `backend/app/core/llm_client.py` | OpenRouter / Gemini client |
| `frontend/app/modules/code-reviewer/page.tsx` | Web UI (EventSource consumer) |
| `frontend/bin/reviewer.mjs` | `ai-reviewer` CLI |

---

## ⏱️ Part 1 — Why It's Slow (Even for Small Repos)

### 1. Nine LLM Calls in a Row, Whatever the Input Size

`code_review_agent/graph.py:87-100` runs the following sequential pipeline:

```
context_builder
  → agent_bug → agent_security → agent_performance → agent_architecture → agent_quality
  → validate_findings → deduplicate_findings
  → aggregate_report → generate_fixes → generate_tests
  → finalize_review
```

| Node | LLM Call? |
|---|---|
| `context_builder` | ✅ Yes |
| `agent_bug` / `security` / `performance` / `architecture` / `quality` | ✅ Yes × 5 |
| `validate_findings`, `deduplicate_findings` | ❌ No |
| `aggregate_report` | ✅ Yes |
| `generate_fixes` | ✅ Yes *(only when high/critical findings exist)* |
| `generate_tests` | ✅ Yes |
| `finalize_review` | ❌ No |

> **Total: 8–9 calls, each waiting for the previous one.** A 10-line snippet goes through the same path as a 20-file repo, so the minimum time is the sum of all 9 calls.

---

### 2. The Model Is Very Slow

`backend/.env` sets:

```env
OPENROUTER_MODEL=nvidia/nemotron-3-ultra-550b-a55b:free
```

This is a **550B reasoning model** on OpenRouter's free tier. It "thinks" before answering, so even short replies take a long time.

**Measured speeds from `backend/hang_output.log`:**

| Prompt Size | Reply Size | Time |
|---|---|---|
| 555 chars | 398 chars | **12.0 s** |
| 12,927 chars | 939 chars | **9.4 s** |
| 1,162 chars | 163 chars | **2.2 s** |
| 25,348 chars | 887 chars | **8.4 s** |

> Code-review JSON replies are longer → expect **15–40 s per call** → nine sequential calls = **~2–5 minutes even for tiny input**.

---

### 3. The 90 s Timeout and No Retries Make Slow Runs Much Worse

`core/llm_client.py:128`:

```python
with httpx.Client(timeout=90.0) as client:
```

There are **no retries**. When the free tier is busy, each call can wait up to 90 s.

> **Worst case: 9 × 90 s ≈ 13.5 minutes** — and the run can still fail at the end (see Bug A below).

---

### 4. The Whole Repo Is Sent 5 Times

`routers/code_review.py:247-250` joins up to 20 **whole files** into one string with no size limit:

```python
for file in extracted_files:
    code_context += f"--- FILE: {file['filepath']} ---\n{file['content']}\n\n"
```

That full string goes into **all 5** specialist prompts (`specialist_agents.py:55, 80, 104, 128, 152`). A minified/generated `.js` file of several hundred KB gets processed 5 times — causing slower replies, higher timeout risk, and more rate-limit pressure.

---

### 5. Requests Keep Running After the User Leaves

`routers/code_review.py:181` and `:275`:

```python
threading.Thread(target=worker, daemon=True).start()
```

There is **no cancellation**. If the user closes the tab, refreshes, or starts a new review, the old run keeps calling the LLM — consuming the free tier's ~20 req/min quota, causing the **next** review to hit rate limits.

---

### 6. Smaller Sources of Delay

| Source | Details |
|---|---|
| No timeout on `git clone` | `git_fetcher.py:67` — `subprocess.run(...)` with no timeout; a stalled clone hangs forever |
| Reads everything, then trims | `git_fetcher.py:76-95` — reads **every** matching file in full, then keeps only 20 at `:104` |
| Polling loop | `code_review.py:186-192` — `get_nowait()` + `asyncio.sleep(0.5)` adds ~0.5 s per event |
| CLI `dir` command | `reviewer.mjs:212-221` — reviews files one after another, no concurrency, no file-size limit |

---

### ⏳ Estimated Time Per Review (Current Setup)

| Scenario | Estimate |
|---|---|
| Tiny snippet, model responsive | ~1.5–3 min |
| Small repo (≤20 files), model responsive | ~3–6 min |
| Free tier busy / rate limited | Up to ~13 min, often ending in failure |

---
---

## 🐛 Part 2 — Bugs

---

### Bug A — One Failed LLM Call Kills the Whole Review

> ⚠️ **Confirmed with a test**

**Where:** `specialist_agents.py:60, 85, 109, 133, 158`

The specialist agents call `generate_text(prompt)` with **no try/except**.

**What happens:** A single 429, timeout, or 5xx raises an exception through LangGraph. `stream_review` catches it and emits `status: "error"`. All findings already collected by earlier agents are **thrown away**.

**Test — injected `RuntimeError("429 rate limited")` into the security agent:**

```
context_builder   Running context_builder...
agent_bug         Running agent_bug...
error             Code review failed: 429 rate limited
LLM calls before failure: 3
```

> 💥 The user waits several minutes and gets **nothing**.

---

### Bug B — Web UI Can Finish with Zero Findings

> ⚠️ **Confirmed with a test**

**Where:** `graph.py:78-85`

```python
"halt_for_tools": END,
```

If `context_builder`'s LLM requests any file, the graph goes straight to `END`. Only the CLI tool protocol can resume — the web UI and repo review **cannot**. This is likely for repo scans where the prompt already contains `--- FILE: x ---` headers.

**Test — fake LLM returning `{"needs_files": ["src/main.py"]}`:**

```
context_builder   {...}
complete          {"findings": [], "fixes": [], "health_score": 100, ...}
LLM calls: 1
```

> 💥 Result: **zero findings, health score 100** — looks like "your code is perfect".

---

### Bug C — Files Fetched by `context_builder` Are Never Used

**Where:** `context_builder.py:27-31`

```python
new_context[f"file_{tool_id}"] = str(result)
```

Two problems:
1. `context_files` gets populated, but **no agent prompt ever includes it** — agents only use `state['git_diff']`.
2. Keys are `file_<uuid>` instead of the file path, so the check at `:70` (`if filepath not in state.get("context_files", {})`) **never matches**.

> The whole tool round trip costs an extra LLM call and contributes **nothing**.

---

### Bug D — Concurrent CLI Sessions Overwrite Each Other

**Where:** `runner.py:30` and `review_orchestrator.py:50`

```python
session_id = "mock-session-id"
_session_store["mock-session-id"] = final_state
```

Three problems:
1. Two simultaneous CLI reviews **overwrite each other's state**.
2. The store is an in-memory dict — lost on restart, doesn't work with multiple workers.
3. No LangGraph checkpointer → `handle_tool_response` re-invokes from `START` (`runner.py:49`) instead of resuming mid-graph.

---

### Bug E — The Generated Fixes Are Made Up

**Where:** `post_processor.py:96-103`

`generate_fixes_node` sends **only the findings, not the actual code** — yet asks for `original_code` and `suggested_code`. The model has to **guess both**.

**Related input truncations:**

| Location | What's Truncated |
|---|---|
| `generate_tests_node` (`post_processor.py:128`) | Only sees the first **2,000 chars** of the diff |
| `context_builder` (`context_builder.py:48`) | Only sees the first **2,000 chars** — and `# Truncated for safety` ends up **inside** the prompt |

---

### Bug F — Health Score of 0 Shows as 100

**Where:** `frontend/app/modules/code-reviewer/page.tsx` — `complete` and progressive handlers

```ts
healthScore: data.data.health_score || 100
```

`0 || 100` evaluates to `100` → the **worst possible code shows as perfect**.

**Fix:** Replace `||` with `??` (nullish coalescing).

---

### Bug G — Ping Events Throw Errors in the Frontend

The backend sends pings with no `data` field:

```python
{"status": "ping", "message": "Analyzing code... Please hold on."}
```

The frontend's `else` branch tries to read `data.data.deduplicated_findings` → throws a `TypeError` every 15 s. It's caught and logged (console noise only), but still a bug.

**Fix:** Add `if (data.status === 'ping') return;` at the top of the handler, or send `data: {}`.

---

### Bug H — Code Is Sent in the URL

**Where:** `page.tsx:133-134`

```ts
new EventSource(`/api/py/code-review/stream?code=${encodeURIComponent(code)}...`)
```

- URL-encoded code is **~3× longer** than raw.
- Servers/proxies commonly limit URLs to **8–16 KB**.
- Medium-sized pastes fail with **"Connection to review pipeline lost"**.
- The code also ends up in **server/proxy access logs**.

**Fix:** POST the code → receive a job ID → open SSE `GET` with that ID (or stream over `fetch` + `ReadableStream`).

---

### Bug I — Reasoning Model Can Return Empty Content

**Where:** `llm_client.py:144-145`

```python
content = data["choices"][0]["message"]["content"]
logger.info("[llm_client] OpenRouter reply len=%d", len(content))
```

For reasoning models, `content` can be `null` (e.g., output limit hit during reasoning). Then `len(None)` raises a `TypeError` — which cascades into **Bug A** (kills the entire review).

---

### Bug J — Weak JSON Parsing Loses Findings Silently

**Where:** `specialist_agents.py:17-42` (and copy-pasted in `post_processor.py` and `context_builder.py`)

Two failure modes:
1. **Code-fence stripping** — only removes fences at the very start/end. If the model writes text before/after JSON (common for reasoning models), `json.loads` fails → returns **no findings**, only a log line.
2. **Confidence parsing** — `float(item.get("confidence"))` fails on values like `"high"` → **drops that finding and every finding after it** (findings before it are kept).

---

### Bug K — Dedup Key Is Too Broad

**Where:** `post_processor.py:36`

```python
key = f"{f.get('line_ref')}_{f.get('category')}"
```

Many findings have `line_ref: "unknown"`. All findings with the same category and unknown line are **merged into one** → real distinct issues get silently dropped.

---

### Bug L — Dead or Confusing Code

| Issue | Details |
|---|---|
| `nodes.py` (546 lines) | All **unused** — from the old 7-node graph; references state keys no longer in `ReviewState` |
| Stale docstrings | `routers/code_review.py` and `__init__.py` still describe the old node list |
| `/api/py/code-review/run` | Returns hardcoded: `complexity=""`, `language="unknown"`, `line_count=0`, `structure={}` |
| `tools.py` helpers | Defined but never called; `context_builder.py` imports `request_read_file` but never uses it |
| CLI `reviewer.mjs` | Calls Gemini **directly** — doesn't use `/api/v1/review` protocol at all |
| Two default models | `config.py:33` → `gemini-2.0-flash-exp:free` vs `llm_client.py:36` → `nemotron-3-ultra-550b-a55b:free` |
| Missing env file | `llm_client.py:27` / `gemini_client.py:21` load `backend/.env.local` (doesn't exist); `config.py` loads `backend/.env` — load order depends on import order |
| Mock route | `frontend/app/api/code-review/route.ts` returns **hardcoded mock data** |

---

### Bug M — 🔒 Security Notes (For Reference)

| Risk | Details |
|---|---|
| PAT in clone URL | `git_fetcher.py:44` — if clone fails, git's stderr could expose the token. Don't add stderr logging without redacting |
| Token in query param | Repo token passed as `GET /stream/repo?token=...` — appears in server, proxy, and browser history logs |
| Unrestricted clone URLs | `/stream/repo` accepts any URL — restrict to `github.com` / `gitlab.com` to prevent cloning from internal or unexpected locations |

---
---

## ✅ Part 3 — Recommended Fixes (In Order of Impact)

| # | Fix | Expected Effect |
|---|---|---|
| **1** | **Switch to a fast model** (e.g. Gemini 2.5 Flash, fast non-reasoning OpenRouter model, or Claude Haiku-class) | Probably the biggest speedup: **several times faster** |
| **2** | **Run the 5 specialists in parallel** — fan out from `context_builder` with `Annotated[list, operator.add]` on `raw_findings`, or merge into **one call** (as `services/code_reviewer.py` already does) | 5 sequential → 1 parallel round or 1 call |
| **3** | **Scale pipeline to input size** — for small inputs (<~200 lines), skip `context_builder` and run one combined call; make tests/fixes optional | Small reviews: ~9 calls → **~1–2** |
| **4** | **Wrap every agent in try/except**, add retry with backoff on 429/5xx, lower timeout to ~30–45 s, handle `content is None` | One failure no longer loses the whole review |
| **5** | **Fix Bug B** — skip `context_builder` on web/repo paths, or route to agents when no tool runner exists | No more silent "perfect code" false results |
| **6** | **Cap input size** — per-file byte limit (~50 KB), total-context limit, skip minified/generated files | Smaller prompts, faster replies |
| **7** | Cancel worker on client disconnect, add `timeout=` to `git clone`, fix **Bugs F, G, H, I, J** | Fewer wasted calls and UI glitches |
| **8** | Remove `nodes.py`, fix docstrings, unify to single default model and env file | Easier to maintain |

---

### 📈 Expected Result After Fixes 1–3

| Scenario | Now | After Fixes 1–3 |
|---|---|---|
| Tiny snippet | ~1.5–3 min | **~5–15 s** |
| Small repo (≤20 files) | ~3–6 min | **~20–60 s** |
