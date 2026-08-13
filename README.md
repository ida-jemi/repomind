# RepoMind — AI Software Archaeologist & Institutional Memory Engine

RepoMind reconstructs the *story* of a codebase. Point it at any public GitHub
repository and it:

- Parses the full commit history to compute **contributor influence** and a
  **file co-change graph** ("gravity") — using transparent, reproducible
  formulas, not AI guesswork
- Flags **stale / forgotten files** as candidates for cleanup
- Extracts **decision candidates** from PR and issue history (migrations,
  removals, rewrites) and turns them into **decision cards** on an
  interactive strata timeline
- Builds a **RAG (Retrieval-Augmented Generation) pipeline** over commits,
  PRs, issues, and the README, so you can ask *"why was Redis introduced?"*
  and get an answer that **cites its evidence** with a confidence label
- Generates a readable **Repo Biography** — a narrative history of the
  project, not just a dashboard of numbers

It runs in two modes:
- **Gemini mode** (`GEMINI_API_KEY` set) — real embeddings + generated
  narratives/answers
- **Offline mode** (no key) — a deterministic local TF-IDF embedding fallback
  and extractive (not generated) answers, so the whole app is still fully
  demoable without a paid API key

---

## Architecture

```
┌─────────────────┐        ┌──────────────────────┐        ┌─────────────────┐
│   React frontend │  REST  │   Node/Express API    │        │   External APIs │
│  (Vite + D3 +     │◄──────►│                        │◄──────►│  GitHub REST API │
│   Tailwind)       │        │  ┌──────────────────┐  │        │  Gemini API      │
└─────────────────┘        │  │ gitAnalyzer.js    │  │        │  (optional)      │
                             │  │  clone + git log   │  │        └─────────────────┘
                             │  │  parsing            │  │
                             │  ├──────────────────┤  │
                             │  │ influenceScorer.js │  │        ┌─────────────────┐
                             │  │ coChangeGraph.js   │  │◄──────►│    MongoDB       │
                             │  ├──────────────────┤  │        │  users, analyses, │
                             │  │ embeddingService.js│  │        │  evidence vectors │
                             │  │ vectorStore.js     │  │        │  (or in-memory if │
                             │  │  (RAG retrieval)    │  │        │  no URI set)      │
                             │  ├──────────────────┤  │        └─────────────────┘
                             │  │ llmService.js      │  │
                             │  │  (Gemini + fallback)│  │
                             │  └──────────────────┘  │
                             └──────────────────────┘
```

**Design principle:** the AI layer *narrates* signals that are computed by
real algorithms (git log analysis, graph theory, TF-IDF) — it doesn't
fabricate them. This is called out explicitly in the code comments and is a
deliberate choice to keep the tool's claims defensible.

---

## Project structure

```
repomind/
├── backend/
│   ├── config/db.js              # MongoDB connection (graceful no-DB fallback)
│   ├── models/                   # User, RepoAnalysis, EvidenceChunk (Mongoose)
│   ├── middleware/auth.js        # JWT auth (required + optional variants)
│   ├── routes/                   # auth, repos (analysis), chat (RAG Q&A)
│   ├── services/
│   │   ├── githubService.js      # GitHub REST API (repo, PRs, issues, README)
│   │   ├── gitAnalyzer.js        # clones repo, parses `git log --numstat`
│   │   ├── influenceScorer.js    # contributor influence formula
│   │   ├── coChangeGraph.js      # file "gravity" + stale/dead detection
│   │   ├── embeddingService.js   # Gemini embeddings + local TF-IDF fallback
│   │   ├── vectorStore.js        # cosine-similarity retrieval (RAG)
│   │   ├── llmService.js         # Gemini chat + offline extractive fallback
│   │   └── analysisPipeline.js   # orchestrates the full analysis run
│   └── server.js
└── frontend/
    └── src/
        ├── components/
        │   ├── StrataTimeline.jsx   # signature "dig-site" decision timeline
        │   ├── InfluenceGraph.jsx   # D3 force-directed contributor graph
        │   ├── DecisionChat.jsx     # RAG Q&A chat UI
        │   ├── BiographyPanel.jsx
        │   └── FileGraphPanel.jsx
        └── pages/                  # Landing, Login, Dashboard, NewAnalysis, AnalysisView
```

---

## Setup

### Prerequisites
- Node.js 18+
- `git` installed and on PATH (used to clone target repos)
- Optional: a MongoDB connection string (MongoDB Atlas free tier works well)
- Optional: a Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey)
- Optional but recommended: a [GitHub personal access token](https://github.com/settings/tokens)
  (no scopes needed for public repos) — without one, GitHub API calls are
  capped at 60/hour, which you'll hit quickly

### Backend

```bash
cd backend
npm install
cp .env.example .env
# edit .env — at minimum you can leave everything blank and it will
# run in in-memory + offline mode for a quick local demo
npm run dev
```

The API starts on `http://localhost:5000`. Check `GET /api/health` to confirm
which mode it's running in (DB connected vs in-memory, Gemini vs offline).

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Opens on `http://localhost:5173` and proxies `/api` requests to the backend
(see `vite.config.js`).

### Try it immediately (no signup needed)

Analyses work in **guest mode** without an account — just paste a public
GitHub repo URL on the landing page. Small repos (a few hundred commits or
fewer) analyze in well under a minute.

---

## Environment variables (backend `.env`)

| Variable | Required? | Notes |
|---|---|---|
| `PORT` | No | Defaults to 5000 |
| `MONGODB_URI` | No | Without it, everything runs in-memory (fine for a demo, data is lost on restart) |
| `JWT_SECRET` | Yes, for accounts | Any long random string |
| `GITHUB_TOKEN` | Recommended | Raises the GitHub API rate limit from 60/hr to 5,000/hr |
| `GEMINI_API_KEY` | No | Without it, embeddings + answers use the local offline fallback |
| `MAX_COMMITS_TO_ANALYZE` | No | Defaults to 500, caps analysis time on huge repos |

---

## Deployment

A straightforward free-tier setup:

1. **MongoDB Atlas** — create a free cluster, get the connection string
2. **Backend → Render** (or Railway/Fly.io) — deploy the `backend/` folder as
   a Node web service, set the environment variables from the table above
3. **Frontend → Vercel** (or Netlify) — deploy the `frontend/` folder;
   update `src/api/client.js`'s `BASE` constant (or wire up `VITE_API_BASE`)
   to point at your deployed backend URL, and set `CLIENT_ORIGIN` on the
   backend to your deployed frontend URL for CORS
4. Optional: GitHub Actions workflow to run `npm run build` on push as a CI
   check before deploying

---

## Known limitations (worth stating explicitly)

- **Dead-code detection is a heuristic**, not true static analysis — it
  flags files that haven't been modified in a long time or no longer exist
  in the tree, not files with genuinely zero references. A full solution
  would need a per-language import/reference graph.
- **Decision inference from git history is inherently uncertain** — commit
  messages and PR descriptions don't always state *why* a change was made.
  This is why every answer and decision card carries an explicit confidence
  label and cites its evidence, rather than presenting inferences as fact.
- **Large repos** (tens of thousands of commits) will be slow with the
  current synchronous pipeline — a production version should move analysis
  to a background job queue (the `status` field on each analysis is already
  designed for polling).

## Possible extensions

- Background job queue (BullMQ + Redis) for large-repo analysis
- Slack/Discord export ingestion as an additional evidence source (as
  originally sketched in the "Memory Weaver" concept)
- Per-language static analysis for genuinely verified dead-code detection
- Multi-repo comparison view
