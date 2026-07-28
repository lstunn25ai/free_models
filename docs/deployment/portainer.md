# Portainer deployment

The public deployment uses a pre-built container image. Portainer should pull the image; it should not receive local `.env` files or private source folders.

## Stack file

Use the root `docker-compose.yml`.

## Required Stack variables

Set values in Portainer Stack Environment variables:

| Variable | Purpose |
| --- | --- |
| `FREE_MODELS_IMAGE` | Full image name in the container registry |
| `IMAGE_TAG` | Immutable release tag or approved branch tag |
| `PROXY_NETWORK_NAME` | Existing Docker network used by the reverse proxy |
| `HOST_PORT` | Host port exposed to the reverse proxy |
| `PORT` | Internal application port, normally `3000` |
| `DATABASE_URL` | SQLite path, normally `file:/app/server/prisma/dev.db` |
| `OPENROUTER_API_KEY` | Optional provider credential |
| `GROQ_API_KEY` | Optional provider credential |
| `GEMINI_API_KEY` | Optional provider credential |
| `DEEPSEEK_API_KEY` | Optional provider credential |
| `HUGGINGFACE_API_KEY` | Optional provider credential |
| `NVIDIA_NIM_API_KEY` | Optional provider credential |
| `KIMI_API_KEY` | Optional provider credential |
| `MINIMAX_API_KEY` | Optional provider credential |
| `OPENCODE_API_KEY` | Optional provider credential |
| `CLOUDFLARE_API_TOKEN` | Optional provider credential |
| `ZAI_API_KEY` | Optional provider credential |
| `OLLAMA_API_KEY` | Optional provider credential |

Do not copy real values into GitHub, Compose, README files, ZIP archives, issue comments, or chat.

## First administrator

No administrator password belongs in Stack variables. On the first start, the container writes a one-time `/admin?setup=…` path to its own log. Open that path on the public site within 15 minutes and set the password for the single `admin` account. The path expires after setup or a restart; only the password hash and opaque session hashes are stored in SQLite.

## Persistent data

The named volume `db_data` stores the SQLite database at `/app/server/prisma`. Preserve this volume during image updates.

## Update procedure

1. Publish a verified image to the registry.
2. Change `IMAGE_TAG` in the Stack variables.
3. Validate the Stack configuration.
4. Pull and redeploy the Stack.
5. Confirm the container health check and `/api/health` response.

The initial release uses manual updates. No webhook or automatic production deployment is configured by this repository.
