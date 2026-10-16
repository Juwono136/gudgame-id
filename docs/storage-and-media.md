# Storage & Media

Object storage for covers, avatars, and uploads is **SeaweedFS**, exposed through an nginx **storage_gateway** with basic auth. The app speaks an S3-compatible API via `@aws-sdk/client-s3`.

---

## Production topology

```text
App (lib/storage)  →  http://storage_gateway:8333  →  SeaweedFS
Public browsers    →  https://storage.gudgame.id     →  (Tunnel / gateway)
```

| Env | Role |
| --- | --- |
| `STORAGE_ENDPOINT` | Internal write endpoint (Docker DNS in prod) |
| `STORAGE_BUCKET` | Prod default `gudgame` |
| `STORAGE_AUTH_MODE` | Typically `nginx-basic` |
| `USERNAME_STORAGE` / `PASSWORD_STORAGE` | Gateway credentials |
| `NEXT_PUBLIC_STORAGE_URL` | Public CDN/base URL for browsers |

Generate htpasswd on deploy:

```bash
USERNAME_STORAGE=… PASSWORD_STORAGE=… ./ops/storage/generate-htpasswd.sh
```

Config lives under `ops/storage/`.

---

## App integration

| Piece | Location |
| --- | --- |
| Adapters / clients | `lib/storage/` |
| Media API patterns | `app/api/media/**` (and upload helpers) |
| DB fields | e.g. `coverImageUrl`, `coverImageStorageKey` on tournaments |

Prefer storing a **storage key** plus resolving public URLs through config — avoid hardcoding hostnames in business logic.

---

## Local vs production naming

| | Local (example) | Production |
| --- | --- | --- |
| Bucket | often `court-pedia` in `.env.example` | `gudgame` |
| Public URL | localhost / LAN | `https://storage.gudgame.id` |

Align new environments with **gudgame** naming to match production docs.

---

## Ops checklist

1. Gateway healthy before testing uploads.  
2. `npm run infra:check` includes storage when configured.  
3. 401 on upload → regenerate `.htpasswd` and restart `storage_gateway`.  
4. Never commit `.htpasswd` or storage passwords.

---

## Related

- [architecture.md](./architecture.md)
- [DEPLOYMENT-VPS.md](./DEPLOYMENT-VPS.md)
- [wiki-and-content.md](./wiki-and-content.md)
