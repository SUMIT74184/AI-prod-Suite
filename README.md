# AI Productivity Suite

A modern, high-performance web application featuring 5 specialized AI agents designed to supercharge your workflow. Built with a stunning human-centric UI, a deep-space violet theme, and robust authentication.

## 🚀 Quick Start

### 1. Install Dependencies
Make sure you have Node.js 18+ installed. We recommend using `pnpm`.
```bash
pnpm install
```

### 2. Environment Variables
Create a `.env.local` file in the root directory and add the following keys for authentication (Clerk) and the AI CLI tool (Gemini):
```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key
GEMINI_API_KEY=your_gemini_api_key
```
*(Note: Clerk protection is temporarily disabled in `middleware.ts.disabled` during local UI development. Rename it back to `middleware.ts` to re-enable route protection).*

### 3. Run Development Server
```bash
pnpm dev
```
Navigate to `http://localhost:3000` to access the Bento Box dashboard.

---

## 🧩 Modules

1. **AI Research Assistant**: Your primary workspace for synthesizing documents, deep-diving into topics, and organizing knowledge.
2. **AI Code Reviewer**: Analyze and optimize code structure automatically.
3. **Prompt Playground**: Test, iterate, and perfect your system prompts in a dedicated sandbox.
4. **Web Research Agent**: Deploy autonomous agents to scour the web and compile comprehensive reports.
5. **Workflow Automation**: Chain multiple AI agents together to automate complex, multi-step tasks.

---

## 💻 AI Code Reviewer CLI Tool

This project also includes a custom Node.js-based terminal tool for running AI code reviews directly from your CLI.

**Setup the CLI Tool:**
```bash
# Link the CLI globally so it can be run from anywhere
npm link
```

**Usage:**
```bash
# Review a specific file
ai-reviewer path/to/your/file.js
```
*(Requires `GEMINI_API_KEY` to be set in your `.env` file).*

---

## 🛠 Tech Stack
- **Framework**: Next.js 16 (React 19)
- **Language**: TypeScript 5.7
- **Styling**: Tailwind CSS 4 with custom `oklch` theme variables.
- **Authentication**: `@clerk/nextjs`
- **Icons**: Lucide React
