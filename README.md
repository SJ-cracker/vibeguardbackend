# VibeGuard 🛡️

> You vibed the code into existence. VibeGuard makes sure it doesn't blow up in production.

VibeGuard is an open-source AI code auditor built for developers who use AI tools to
build fast. It scans your entire codebase — not just for syntax errors, but for security
vulnerabilities, broken API usage, deployment misconfigs, and logic bugs — then gives you
an interactive map of everything it found.

No more shipping code you don't fully understand.

---

## Why VibeGuard Exists

AI coding tools are magic. You describe a feature, you get working code, you ship it.
But "working" and "production-safe" are two very different things.

Vibe-coded projects tend to silently carry:

- 🔓 Security holes no one thought to ask the AI about
- 🐛 Bugs hiding in edge cases, async logic, and untested paths
- ⚡ APIs called with wrong methods, missing auth, or no error handling
- 💥 Deployment configs that pass locally but fail in prod
- 🌀 A codebase nobody — including you — fully understands

VibeGuard is the layer between "it works on my machine" and "it's safe to ship."

---

## What It Does

```
Your Code (file · repo · ZIP)
         │
         ▼
   Analysis Engine
   ├── Static Analysis   (AST · CFG · Call Graphs)
   └── AI Analysis       (LLM + Graph Neural Network)
         │
         ├── 🐛 Bug Predictor
         ├── 🔒 Security Scanner
         ├── ⚡ API Risk Auditor
         └── 🚀 Deployment Checker
         │
         ▼
   Output
   ├── Risk Dashboard
   ├── REST / Webhook API
   └── Interactive Codebase Flowchart
```

### 🐛 Bug Predictor
Finds code paths likely to cause runtime failures using ML models and AST pattern
analysis. Catches null dereferences, async race conditions, unhandled promise rejections,
and off-by-one errors before they become 3am incidents.

### 🔒 Security Scanner
Deep SAST powered by LLM reasoning. Goes beyond regex rules to understand context —
so it catches SQL/XSS/CMD injections, hardcoded secrets, broken auth patterns, and
insecure data exposure that simple scanners miss.

### ⚡ API Risk Auditor
Checks every API interaction in your code against the OpenAPI spec and security best
practices. Flags missing auth headers, wrong HTTP methods, unhandled 429s, and
unvalidated responses.

### 🚀 Deployment Checker
Audits your Dockerfiles, CI/CD pipelines, `.env` files, and IaC configs for
prod-breaking issues. Catches exposed secrets, missing health checks, insecure cloud
policies, and hardcoded environment assumptions.

---

## The Output

Everything lands in one place:

- **Risk Dashboard** — all findings ranked by severity, filterable by module, with
  drill-down detail on every issue
- **Interactive Codebase Flowchart** — a visual map of how your entire project connects.
  Finally understand what you actually built.
- **REST / Webhook API** — plug VibeGuard into your CI/CD pipeline so it runs
  automatically on every pull request

---

## Tech Stack

| Layer | Tools |
|---|---|
| Parsing | Tree-sitter · NetworkX · Joern |
| Static Analysis | Semgrep · Bandit · ESLint |
| AI / ML | LLM API · PyTorch Geometric · LangChain |
| Backend | FastAPI · Celery · Redis · PostgreSQL |
| Frontend | React · TypeScript · React Flow · Recharts |
| DevOps | Docker · GitHub Actions · Webhook API |

---

## Project Structure

```
vibeguard/
├── ingestion/          # Code input handlers (file, ZIP, GitHub URL)
├── parser/             # AST, CFG, and call graph generation
├── analysis/
│   ├── static/         # Rule-based scanners (Semgrep, Bandit, ESLint)
│   ├── ai/             # LLM reasoning pipeline
│   └── gnn/            # Graph Neural Network models
├── modules/
│   ├── bug_predictor/
│   ├── security_scanner/
│   ├── api_auditor/
│   └── deployment_checker/
├── api/                # FastAPI REST + webhook endpoints
├── dashboard/          # React frontend + codebase flowchart
├── workers/            # Celery async job queue
└── db/                 # PostgreSQL models + migrations
```

---

## Getting Started

```bash
# Clone the repo
git clone https://github.com/your-username/vibeguard.git
cd vibeguard

# Start all services
docker-compose up -d

# Install Python dependencies
pip install -r requirements.txt

# Install frontend dependencies
cd dashboard && npm install

# Run the dev server
uvicorn api.main:app --reload
```

Then open `http://localhost:3000`, drop in a file or GitHub URL, and let it rip.

---

## Roadmap

| Phase | Timeline | What Gets Built |
|---|---|---|
| Phase 1 | Weeks 1–3 | Code ingestion · AST parsing · Graph generation |
| Phase 2 | Weeks 4–7 | Static scanners · LLM integration · API + Deploy checkers |
| Phase 3 | Weeks 8–10 | GNN training · AI signal merging · Risk scoring |
| Phase 4 | Weeks 11–13 | Dashboard · Flowchart · REST API · Auth + multi-project |

---

## Contributing

VibeGuard is early and moving fast. Contributions are welcome.

1. Fork the repo
2. Create your branch (`git checkout -b feature/your-feature`)
3. Commit your changes (`git commit -m 'add: your feature'`)
4. Push and open a PR

For big changes, open an issue first so we can talk through the approach.

---

## License

MIT — see [LICENSE](LICENSE) for details.

---

*Built for developers who ship fast and want to sleep at night.*