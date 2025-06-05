# SSE Streaming formats

- chat:
    
    ```json
    data: {"message":{"id":"...","author":{"role":"assistant"},"content":{"parts":["Hello!"]}}}
    ```

- oai:
    
    ```json
    data: {"choices":[{"delta":{"content":"Hello!"},"index":0,"finish_reason":null}]}
    ```
