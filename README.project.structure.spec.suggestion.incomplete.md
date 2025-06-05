backend/
├── index.js
├── routes/
│   ├── oai/
│   │   └── v1/
│   │       └── chat/
│   │           └── completions.js       # Handles /v1/chat/completions
│   └── chat/
│       └── backend-api/
│           └── conversation.js          # Handles /backend-api/conversation if we override it
├── lib/
│   ├── translator.js                    # OpenAI → ChatGPT translator
│   ├── responseAdapter.js              # ChatGPT → OpenAI response adapter
│   └── session.js                      # Session & message ID logic (TBD)

