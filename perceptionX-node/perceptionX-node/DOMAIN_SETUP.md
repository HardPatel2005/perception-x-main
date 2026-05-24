PerceptionX — Custom domain setup (perceptionx.me)

This file describes how to connect your Namecheap-registered domain perceptionx.me to the Render service hosting the Node app, enable HTTPS, and verify CORS and API connectivity.

Summary
- Domain: perceptionx.me (you control it in Namecheap)
- App service (Render): currently deployed at https://perception-x-main-hard.onrender.com
- Goal: make https://perceptionx.me (and https://www.perceptionx.me) point to your Render service and ensure the Node backend accepts requests from that origin.

Prerequisites
- You have access to the Namecheap control panel (screenshot shows the domain active).
- Your Render service is active and you have service name or default render url (e.g. perception-x-main-hard.onrender.com).
- You can edit records in Namecheap DNS (or use a third-party DNS provider).

Overview of steps
1. Add custom domains on Render.
2. Add DNS records in Namecheap as Render instructs (CNAME or ALIAS/ANAME). If Namecheap lacks ALIAS, use `www` CNAME + URL redirect from apex to `www`.
3. Configure Render environment variables and CORS (already set via `render.yaml`).
4. Clear build cache & redeploy on Render.
5. Verify DNS, HTTPS, and API calls (preflight + POST).

1) Add custom domains on Render
- Open your Render dashboard → Services → open the `perceptionx-node` service.
- Settings → Custom Domains → Add Domain.
  - Add `perceptionx.me` and `www.perceptionx.me` as domains.
- After adding, Render will display the exact DNS records you must add in Namecheap. Keep this tab open.

2) Configure DNS in Namecheap
- Log into Namecheap → Domain List → click `Manage` for `perceptionx.me`.
- Under "Nameservers": if you use Namecheap BasicDNS (default), add records in the "Advanced DNS" or "Domain" DNS editor. If you use custom nameservers (Cloudflare, other), edit DNS there instead.

Recommended DNS setups (choose one):

A) Best (if Namecheap supports ALIAS/ANAME for the apex):
- Add an ALIAS / ANAME (apex) record (Host: @) pointing to the Render-provided target (the value Render shows; often your-service.onrender.com or a DNS target).
- Add a CNAME for `www` pointing to the same Render target or to `perception-x-main-hard.onrender.com`.

B) If Namecheap does NOT support ALIAS/ANAME (common):
- Add a CNAME record: Host `www` → Value `perception-x-main-hard.onrender.com` (your Render default URL).
- For the root/apex (@): Use Namecheap URL Redirect (masking not required) from `http://perceptionx.me` → `https://www.perceptionx.me`. This keeps the apex reachable and forces traffic to `www`.

C) Alternative (if Render provides A records):
- Render sometimes provides A records (IPv4 addresses) for apex — add those exact A records for Host `@` using the IPs Render shows.
- Also add CNAME `www` → the Render CNAME target.

Notes about TTL and propagation
- Use default TTL (or 300s during testing) to speed propagation.
- DNS changes can take minutes to an hour. Use `dig`/`nslookup` to verify.

3) Verify Render & env vars
- In Render service settings, confirm the domain status becomes "configured" and then "Active" (Render will provision TLS cert automatically once DNS is pointed correctly).
- Ensure these env vars are set for your Node service (we added them in `render.yaml`):
  - `VITE_API_URL` = https://perceptionx.me
  - `CORS_ORIGIN` = https://perceptionx.me
  - `VITE_PYTHON_API_URL` and `PYTHON_API_URL` = your Python service URL (no underscores)
- If you prefer the site to work on both `www` and apex, include both origins in `CORS_ORIGIN`, comma-separated:
  - `CORS_ORIGIN=https://perceptionx.me,https://www.perceptionx.me`

4) Redeploy & clear build cache
- In Render: Deploys → Manual Deploy → Deploy Latest (Clear build cache option) to ensure the front-end build bakes `VITE_API_URL` correctly.
- Wait for build and deploy logs to finish.

5) Verification commands
- Check DNS (uses `dig` or `nslookup`):

```bash
# Linux/Mac (dig)
dig +short perceptionx.me
dig +short www.perceptionx.me

# Windows (PowerShell)
nslookup perceptionx.me
nslookup www.perceptionx.me
```

- HTTP/HTTPS checks (curl):

```bash
# Check root response
curl -i https://perceptionx.me/

# Preflight OPTIONS test for signup endpoint
curl -i -X OPTIONS 'https://perceptionx.me/api/auth/signup' \
  -H 'Origin: https://perceptionx.me' \
  -H 'Access-Control-Request-Method: POST' \
  -H 'Access-Control-Request-Headers: content-type'

# Try a test POST (use test data; this will create a user in DB)
curl -i -X POST 'https://perceptionx.me/api/auth/signup' \
  -H 'Content-Type: application/json' \
  -d '{"username":"testuser","email":"test@example.com","password":"password123"}'
```

What to expect
- `OPTIONS` should return a 204 or 200 and include `Access-Control-Allow-Origin: https://perceptionx.me` (or `*` if allowed).
- POST `/api/auth/signup` should return 201 on success or 400/409 if user exists.

Troubleshooting
- If `OPTIONS` returns 404 or request goes to wrong host:
  - Confirm the browser's Network tab shows the Request URL exactly `https://perceptionx.me/api/auth/...` (no underscores). If it shows underscores, the built frontend still contains a bad VITE value — rebuild after fixing env.
  - In Render logs, find the incoming request lines (they include method and path). Confirm the service receiving them is your Node service.
- If TLS fails or domain not secure:
  - Wait for Render to provision certificates after DNS changes. It may take a few minutes.
- If apex is not supported by Namecheap for CNAME/ALIAS and you used redirect → `www` is recommended as canonical.

Optional improvements
- Use relative API paths from the browser (e.g., `/api/auth/...`) if the frontend is served by the same Node server. This removes the need to bake `VITE_API_URL` at build time.
- Add both `https://perceptionx.me` and `https://www.perceptionx.me` to `CORS_ORIGIN` to avoid origin mismatch.

If you want, I can:
- Add these exact DNS steps into `RENDER_DEPLOYMENT.md` and `.env.example` in the repo.
- Watch Render deploy logs now and report back when the domain becomes Active and the OPTIONS + POST tests succeed.

---
File created by assistant: `DOMAIN_SETUP.md`
