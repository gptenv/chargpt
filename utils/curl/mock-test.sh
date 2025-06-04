#!/bin/bash

API_URL="http://localhost:8842/v1/chat/completions"

curl -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4o",
    "messages": [
      {
        "role": "user",
        "content": "Hello from curl test"
      }
    ]
  }'

