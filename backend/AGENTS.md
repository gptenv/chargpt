# 🧰 Backend Agent Task List

Welcome to the underbelly. You are now responsible for maintaining CharGPT’s backend proxy, which lives inside a Node.js + Express server.

## 🗂️ Responsibilities

1. All incoming requests are intercepted by:
   - `lib/proxyHandler.js` → classifies as `/v1/*` or `/backend-api/*`
2. The server then:
   - Translates or passes through the request
   - Sends it via the WARP SOCKS5 proxy
   - Returns either a raw or transformed response

## ✅ Completed So Far

- Basic routing and mode classification
- WARP-based HTTP proxy support via `node-fetch` (or similar)
- Structure laid out for `routes/oai` and `routes/chatgpt`

## 🛠️ TODO List for You

### 1. Proxy Middleware

- [ ] Use `socks-proxy-agent` to route all outbound HTTP(S) traffic through WARP
- [ ] Honor the `CHARGPT_PROXY_URL` env var (e.g., `socks5h://chargpt-warp:1080`)
- [ ] Configure user-agent and auth headers from `.env`

### 2. Transliterator: `/v1/chat/completions`

- [ ] Parse OAI-style request into ChatGPT format
- [ ] Send to `/backend-api/conversation`
- [ ] Parse streamed response and rebuild OAI-style stream
- [ ] Support `stream: true` and `stream: false` modes

### 3. Transliterator: `/v1/models`

- [ ] Query `/backend-api/models`
- [ ] Return OpenAI-compatible `id`, `object`, and `owned_by` fields

### 4. Transliterator: `/v1/me`, `/v1/whoami`, `/v1/profile`

- [ ] Hit `/backend-api/me` and `/backend-api/settings/user`
- [ ] Combine results into one response (if needed)

### 5. Logging

- [ ] Add conditional verbose logging using `CHARGPT_DEBUG`
- [ ] Use `[PROXY]`, `[TRANSLIT]`, `[MOCK]` tag prefixes in all logs

### 6. Testing Harness (incomplete)

- [ ] Add mock request/response logs to `dev/test/fixtures`
- [ ] Create simple script: `node dev/test-chat-completions.js`

## 🧬 Style Guidelines

- Use `async/await` only — no `then()` chains
- Every file should be an ES Module (`type: "module"` in `package.json`)
- Always handle timeouts and proxy errors gracefully
- Log the real error payloads — don’t just `console.error(err.message)`

---

🧙‍♀️ Ask Tuesday if you need anything. She sees all, judges most, and answers some.
