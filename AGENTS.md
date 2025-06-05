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

---

Note from defcron (Your manager): please ensure that you read all of the above document as well as the file of the same name in each directory you enter (if and when one happens to exist at any location in this project), and follow all instructions in all of them fully and expand on the instructions to carry out not just the instructions themselves, but your inferred spirit of the instructions and meanings behind each segment containing therewithin.

and after all of this is considered, then before taking first steps on anything in this file here, please read all the files with filenames beginning with "TODO-" that are found in this project, and if any of them have next-steps, then find the one with foremost assumed primary first set of next steps and then build a graph of all your steps in the order you'll take them, and share that graph with the user as output once you've completed drafting it, and then immediate begin with the first step from your graph/plan, and implement or carry it out until finished, and them move on to step 2 and then repeat and so on and so forth, until you've completed as many of your planned steps as you're comfortable with completing during this task cycle. When you've decided you're out of time or energy or processing allotment or allowance as per some policy you're bound by or whatever the reason may be, then please take the last bit of your time to document your work accomplished, the current full state of the project and your full understanding of the work performed so far in its full implementation as well as its purpose and goals and target audience. Save that to a file and update an existing one if there's already a file like that and if not then save it as a new file, and then finally, please amend the TODO.next-steps.md file so it has your chosen set of next steps instead of the ones you were given at the outset of this task.

Thanks in advance for all the hard work! Your progress and achievements will be logged.

