---
artifact: DEPLOYMENT
status: reference
created: 2026-05-23
scope: Deployment options — AWS (EC2 + S3/CloudFront + RDS) and Railway + Neon + Vercel. Not part of the build path.
---

# DEPLOYMENT REFERENCE — IdeaLens

> This document is **not part of the build path** (SKELETON → ITER_01 → … → ITER_07).
> Deploy only after ITER_07 is complete and all tests pass locally.
> Two options are documented. Choose one based on cost tolerance.

---

## Option A — AWS (EC2 + S3/CloudFront + RDS)

**Estimated cost:** ~$26/month
**When to choose:** You need a production-grade setup you control entirely.

### Architecture

```
Browser
  ├── HTTPS (idealens.dev)     → CloudFront CDN → S3 (static React SPA)
  └── HTTPS (api.idealens.dev) → EC2 t4g.small (Nginx → Docker: FastAPI :8000)
                                      └── RDS db.t4g.micro (PostgreSQL 16, private subnet)
```

- Domain: `idealens.dev` → CloudFront. `api.idealens.dev` → EC2 Elastic IP
- TLS: ACM certificate for CloudFront (free, `us-east-1`). Let's Encrypt via Certbot for EC2 API (ACM certificates cannot be installed directly on EC2 instances)
- Secrets: AWS Secrets Manager (`JWT_SECRET`, `API_KEY_ENCRYPTION_KEY`, `DATABASE_URL`)
- IaC: Terraform — all AWS resources managed exclusively through it

### Terraform Module Structure

```
infra/
├── backend.tf            # S3 remote state + DynamoDB lock
├── main.tf
├── variables.tf
├── terraform.tfvars
└── modules/
    ├── networking/       # VPC, public subnet, security groups
    ├── ecr/              # Container registry for API image only
    ├── ec2/              # t4g.small, Elastic IP, instance role, user data
    ├── rds/              # PostgreSQL 16 + subnet group (private — EC2 only)
    ├── s3/               # Static site bucket + Origin Access Control
    ├── cloudfront/       # Distribution, OAC, ACM cert, HTTPS redirect
    └── secrets/          # Secrets Manager entries (values set manually post-apply)
```

### Nginx Config for SSE

Nginx must not buffer the SSE stream:

```nginx
location /api/chat {
    proxy_pass         http://localhost:8000;
    proxy_buffering    off;
    proxy_read_timeout 120s;
    proxy_set_header   X-Accel-Buffering no;
}
```

Without `proxy_buffering off`, Nginx will buffer SSE tokens and the client receives them in batches instead of in real time.

### CI/CD (GitHub Actions)

Deployments use AWS SSM `send-command` — no SSH keys stored in GitHub Secrets.

```yaml
- name: Deploy API
  run: |
    aws ssm send-command \
      --instance-ids ${{ secrets.EC2_INSTANCE_ID }} \
      --document-name "AWS-RunShellScript" \
      --parameters commands='[
        "docker pull $ECR_REPO:latest",
        "docker compose -f /opt/idealens/docker-compose.prod.yml up -d --no-deps api"
      ]'
```

Frontend deploy: build React SPA → `aws s3 sync dist/ s3://idealens-frontend --delete` → `aws cloudfront create-invalidation`.

### Required GitHub Secrets

```
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
AWS_REGION
ECR_REPOSITORY_URI
EC2_INSTANCE_ID
CLOUDFRONT_DISTRIBUTION_ID
DATABASE_URL            (for migrations in CI)
JWT_SECRET
API_KEY_ENCRYPTION_KEY
FRONTEND_URLS
```

### First Deploy Sequence

1. `terraform init && terraform apply`
2. Push API secrets to Secrets Manager manually (post-apply)
3. SSH to EC2 once to run `alembic upgrade head`
4. Push to `main` → GitHub Actions handles all subsequent deploys

### Upgrade Path

When scaling is needed, migrate from EC2 to ECS Fargate + ALB. Terraform modules are designed to support this without application code changes. The ALB idle timeout must be tuned for SSE (`idle_timeout = 60` is insufficient — set to `300`).

---

## Option B — Railway + Neon + Vercel

**Estimated cost:** ~$5/month (Railway Hobby plan)
**When to choose:** Cost is a constraint; you want the fastest path to a live URL.

### Architecture

```
Browser
  ├── HTTPS              → Vercel (global CDN, static React SPA)
  └── HTTPS              → Railway (persistent container: FastAPI :8000)
                                └── Neon (serverless PostgreSQL, pooled connection)
```

Railway runs a persistent container — SSE streaming works identically to EC2. No cold-start concerns.

### Prerequisites

```bash
npm install -g @railway/cli @vercel/cli
railway login
vercel login
# Neon: create account at neon.tech (free, no credit card)
```

### Step 1 — Neon (Database)

1. Create project at `console.neon.tech` → get pooled connection string
2. Convert to asyncpg format: `postgresql+asyncpg://user:pass@host/db?sslmode=require`
3. Add SSL param to `backend/app/db/base.py` engine: `connect_args={"ssl": "require"}`
4. Run: `alembic upgrade head` (point `DATABASE_URL` at Neon temporarily)

### Step 2 — Railway (Backend)

Create `backend/railway.toml`:
```toml
[build]
  dockerfilePath = "../infra/Dockerfile.backend"
  dockerContext = "."

[deploy]
  startCommand = "uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 2"
  healthcheckPath = "/health"
  restartPolicyType = "on_failure"
```

Set Railway environment variables:
```
ENVIRONMENT=production
DATABASE_URL=<neon asyncpg url>
JWT_SECRET=<generate with: openssl rand -hex 32>
API_KEY_ENCRYPTION_KEY=<generate with: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())">
FRONTEND_URLS=<set after Vercel deploy>
```

Deploy: `cd backend && railway up`

### Step 3 — Vercel (Frontend)

React + Vite produces a static bundle — no server adapter needed. Build output is plain HTML/JS/CSS in `dist/`.

```bash
cd frontend
vercel deploy --prod
```

Set Vercel environment variable: `VITE_API_URL=https://<your-railway-url>`

Rebuild and redeploy after setting the env var (Vite bakes it in at build time).

### Step 4 — Cross-Origin Cookie Fix

Railway and Vercel are on different domains. The httpOnly refresh cookie must use `samesite="lax"` (not `"strict"`):

```python
# backend/app/api/routes/auth.py — in register AND login
response.set_cookie(
    key="refresh_token",
    value=token,
    httponly=True,
    samesite="lax",     # changed from "strict"
    secure=True,
    max_age=...,
)
```

Set `FRONTEND_URLS` in Railway to your Vercel URL.

### Step 5 — CI/CD

```yaml
# .github/workflows/deploy.yml
jobs:
  deploy-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm install -g @railway/cli
      - run: railway up --service idealens-api
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}

  deploy-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm install -g vercel
      - run: vercel deploy --prod --token ${{ secrets.VERCEL_TOKEN }}
        env:
          VITE_API_URL: ${{ secrets.RAILWAY_PUBLIC_URL }}
```

### Required GitHub Secrets

```
RAILWAY_TOKEN
VERCEL_TOKEN
VERCEL_ORG_ID
VERCEL_PROJECT_ID
RAILWAY_PUBLIC_URL    (set after first Railway deploy)
```

---

## Backend Dockerfile (`infra/Dockerfile.backend`)

Used by both deployment options:

```dockerfile
FROM python:3.12-slim AS base
WORKDIR /app
RUN pip install uv

FROM base AS development
COPY pyproject.toml uv.lock ./
RUN uv sync
COPY . .
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]

FROM base AS production
COPY pyproject.toml uv.lock ./
RUN uv sync --no-dev
COPY . .
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
```

## Frontend Build for Production

React + Vite produces a static bundle. No server required — just `npm run build` and serve `dist/`.

```bash
VITE_API_URL=https://api.idealens.dev npm run build
# → dist/ contains index.html + assets/
```

The `VITE_API_URL` is baked into the bundle at build time. Rebuild required if the API URL changes.
