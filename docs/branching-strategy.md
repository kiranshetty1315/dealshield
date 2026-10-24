# DealShield AI — Git Branching Strategy & Engineering Standards

To maintain high code quality and prevent regressions during rapid parallel hackathon sprints, all team members must follow these engineering practices.

---

## 1. Branching Model

```
       main (Stable, Production-Ready Scaffold)
         ▲
         │ (Squash & Merge via PR after CI checks pass)
         │
    ┌────┴───────────────────────────┐
    │                                │
feature/chat-parser-edge-cases   feature/ai-extractor
(Team B)                         (Team C)
```

### The `main` Branch:
- `main` is protected and **always deployable**.
- Direct commits to `main` are disallowed. All changes must arrive via reviewed Pull Requests.
- CI pipeline (`.github/workflows/ci.yml`) must pass on every PR before merging.

### Feature Branches:
- Branch naming convention: `feature/<team>-<short-description>` or `feature/<topic>`:
  - `feature/frontend-dashboard`
  - `feature/chat-parser`
  - `feature/ai-extractor`
  - `feature/agreement-lifecycle`
  - `fix/parser-multiline-continuation`
- Branch off the latest `origin/main`:
  ```bash
  git checkout main
  git pull origin main
  git checkout -b feature/my-new-feature
  ```

---

## 2. Pull Request & Review Standards

1. **Focused Scope:** Keep pull requests small and focused on a single responsibility.
2. **Document API Changes:** If modifying an endpoint schema or Pydantic model:
   - Note the schema change in the PR description.
   - Update `packages/contracts/schemas/`.
   - Update `docs/api-contracts.md`.
3. **No Fake Completed Implementations:**
   - Unfinished routes must return explicit HTTP `501 Not Implemented` with diagnostic error objects. Never mock fake successful responses that hide missing functionality.
4. **Zero Credentials in Git:**
   - Never commit `.env` or real API keys.
   - Automated git hooks and CI check for accidental credential commits.
5. **No Force Pushing to Shared Branches:**
   - Never use `git push --force` on `main` or active team branches. Resolve merge conflicts via rebase or explicit merge commits.

---

## 3. Pre-Merge Verification Checklist

Before opening or merging a PR, run local verification:

```bash
# Backend verification:
cd apps/api
.\.venv\Scripts\Activate.ps1
python -m pytest tests/ -v

# Frontend verification:
cd ../web
npm run lint
npm run typecheck
npm run build
```
