# Project Worklog

## Overview
CharGPT acts as a transliteration proxy between OpenAI compatible requests and ChatGPT's internal APIs. Recent work implemented a persistence layer for conversation IDs and integrated it into the chat completion route. The logic now respects user supplied `conversation_id` values and filters the field when empty.

## Work Performed
- Added pluggable session store with adapters for SQLite (default), Postgres, Redis and Memcached.
- Created SessionManager class to abstract token hashing and TTL handling.
- Updated translator and chat completion route to utilize SessionManager.
- Added environment variables for session configuration.
- Created simple tests for store and manager modules and updated chat completion tests to check conversation_id.

## Current State
Session data is persisted via the configured adapter (SQLite by default). Requests reuse conversation IDs based on token and thread hash. Responses inject conversation_id unless pure mode is enabled.

## Next Steps
See `TODO.next-steps.md` for planned improvements including integration tests, a debug endpoint and adapter error handling.

## 2025-06-05
### Updates
- Added `touchSession()` in `SessionManager` to refresh TTL without modifying stored conversation IDs.
- Chat completion route now invokes `touchSession` on each request so user provided IDs are forwarded but never stored.
- Updated tests to cover new behavior.
