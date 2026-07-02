# Phase 09 — PDF & Certificate Generation

## Flow

1. Admin/Teacher → `POST /certificates/generate` with `{studentId, termId}`
2. `CertificatesService.generate()`:
   - Builds `CertificateSnapshot` (immutable JSON snapshot of grades)
   - Calls `PdfRenderService.render(snapshot, template)`
   - Stores PDF in MinIO via `StorageAdapter`
   - Saves `pdfStorageKey` on snapshot
3. Client → `GET /certificates/snapshots/:id/pdf` → streams PDF from MinIO

## PDF Rendering

- **Engine**: Playwright (Chromium headless)
- **Template**: HTML with RTL Hebrew layout
- **Package**: `@school/certificate-layout` → `render-layout-html.ts`
- **Font**: Embedded Hebrew font in HTML template

## Storage

| Backend | Config | Usage |
|---|---|---|
| memory | `STORAGE_BACKEND=memory` | Dev (default, not persistent) |
| s3 | `STORAGE_BACKEND=s3` | Prod / MinIO |

## MinIO Setup (for persistent storage)

```bash
# MinIO starts with docker compose
# Set in apps/api/.env:
STORAGE_BACKEND=s3
S3_ENDPOINT=http://127.0.0.1:9000
S3_BUCKET=certificates
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_FORCE_PATH_STYLE=true
```
