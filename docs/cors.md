# CORS (Short Guide)

- Allowed origins are controlled via `CORS_ALLOWED_ORIGINS` (comma-separated).
- Example (current):

```
CORS_ALLOWED_ORIGINS=http://localhost:3000
```

Notes
- Same-origin (http://localhost:4000 → http://localhost:4000) doesn’t use CORS.
- Postman/curl ignore CORS; they will still work.
- To allow Swagger UI on 4000:
```
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:4000
```
