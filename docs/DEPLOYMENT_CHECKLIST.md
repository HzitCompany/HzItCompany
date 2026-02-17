# Deployment Checklist

## Frontend (Vite SPA)
- Build: `npm run build`
- Serve `dist/` via a CDN or static host.
- Set caching:
  - `index.html`: `Cache-Control: no-store` (or very short TTL)
  - `assets/*`: `Cache-Control: public, max-age=31536000, immutable`
- Configure `sitemap.xml` and `robots.txt` at the site root.
- Configure redirects so all routes serve `index.html` (SPA fallback).

## Backend (Express API)
- Provision Postgres.
- Apply `server/db/schema.sql`.
- Set env vars from `server/.env.example`.
- Run behind a reverse proxy / load balancer.
- Keep compression enabled (the API uses `compression` middleware).
- Enable health checks (`GET /api/health`).

## CDN recommendations
- Use Cloudflare/Fastly/AWS CloudFront for caching and WAF.
- Turn on Brotli/Gzip.
- Enable HTTP/2 or HTTP/3.

## Observability
- Add uptime checks for frontend and `/health`.
- Capture API error rates (5xx) and latency percentiles.

## Release hygiene
- Separate environments: staging vs production.
- Use CI to run:
  - frontend: `npm ci` + `npm run build`
  - backend: `npm ci` + `npm run build` + `npm audit --omit=dev`
