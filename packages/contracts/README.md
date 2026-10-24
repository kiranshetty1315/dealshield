# Shared Contracts

This package contains the canonical API contracts shared between the frontend and backend.

## Contents

### `schemas/`
JSON Schema definitions for all API request/response types:
- `agreement-analysis.schema.json` — Complete analysis output structure

### `examples/`
Sample JSON payloads for development and testing:
- `sample-analysis-response.json` — Example analysis response with conflicts and missing terms
- `sample-upload-request.md` — Upload endpoint documentation with examples

## API Versioning

All API endpoints are versioned under `/api/v1/`. Breaking changes require a new version prefix (`/api/v2/`).

## Type Generation

### Backend (Python)
The backend defines canonical types using **Pydantic models** in `apps/api/app/schemas/`. The FastAPI application automatically generates an OpenAPI specification at `/docs` and `/openapi.json`.

### Frontend (TypeScript)
Frontend types should be generated from the OpenAPI spec to avoid duplication:

```bash
# Generate TypeScript types from OpenAPI spec
cd apps/web
npx openapi-typescript http://localhost:8000/openapi.json -o src/types/api-generated.ts
```

> **Note:** During initial scaffold development, TypeScript interfaces are manually maintained in `apps/web/src/types/index.ts`. Once the backend API stabilizes, switch to auto-generated types.

## Single Source of Truth

The **backend Pydantic schemas** are the single source of truth for API contracts. Do NOT maintain conflicting duplicated schemas. When updating an API contract:

1. Update the Pydantic model in `apps/api/app/schemas/`
2. Regenerate frontend TypeScript types from OpenAPI
3. Update JSON Schema examples in this package
4. Document the change in `docs/api-contracts.md`
