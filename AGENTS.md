# 🤖 Welcome, Agents of CharGPT

This repository is a warped, proxy-based reinterpretation layer that sits between:
- 🟢 OpenAI-compatible API clients (`/v1/...`)
- 🟣 ChatGPT.com’s internal backend endpoints (`/backend-api/...`, `/api/...`, etc)

We aim to support **transliteration** of requests and responses in both directions.

## 🧠 Core Responsibilities

Agents working on this repo are responsible for:

1. Translating OpenAI-style API requests to ChatGPT.com-style equivalents
2. Translating ChatGPT.com responses back into OpenAI-style format
3. Routing **all traffic** through a WARP proxy connection (via Docker)
4. Supporting mock/stub responses for development and test harnessing
5. Maintaining a clear separation between:
   - OpenAI route handling logic
   - ChatGPT passthrough handling
   - Middleware and diagnostics

## 📁 Repo Structure Overview

```
.
├── backend/                  # Express.js proxy + routing logic
│   └── AGENTS.md            # Detailed backend work instructions
├── warp/                    # WARP CLI container and config
├── frontend/                # (future) optional dashboard or playground
├── .env.example             # Configuration spec
├── docker-compose.yml       # All services
└── README.md
```

## 🧪 Contribution Rules

- **Never break passthrough routing.** If it worked before, it must work after.
- **Log transformed payloads** during development with `[TRANSLIT]` tags for clarity.
- **Use `.env` configuration for everything** — never hardcode backend URLs, tokens, etc.
- If in doubt: **ask Tuesday.**
