# KANSBE — Freelancer Document & Profile Generator (docgen service)

FastAPI microservice that wraps the tested pipeline in `pipeline.py`.
It accepts a freelancer's resume (PDF/DOCX) and returns a privacy-safe,
whitelist-only **Client View** for clients to see.

> `app.py` (Streamlit demo) is kept for reference only. It is **not**
> part of the shipped service and `streamlit` is intentionally not in
> `requirements.txt`.

## How it works

```
PDF/DOCX upload
  → parser.py            (text extraction: PyMuPDF / python-docx)
  → pii_detector.py      (hybrid PII detection: regex backstop + Presidio)
  → extractor_fallback.py (rule-based professional extraction, no API key)
  → pipeline.py          (safety gate + validation status)
  → POST /process response (whitelist-only)
```

Response shape:

```json
{
  "clientView": {
    "skills": ["Python", "SQL"],
    "experience": ["..."],
    "roles": ["..."],
    "responsibilities": ["..."],
    "projects": ["..."],
    "technologies": ["..."],
    "certifications": ["..."],
    "achievements": ["..."],
    "portfolio": ["..."]
  },
  "validationStatus": "PASSED | PASSED_WITH_WARNINGS | BLOCKED_AND_CLEANED",
  "piiDetected": {
    "email": true,
    "phone": false,
    "addressLocation": true,
    "governmentId": false
  }
}
```

Guarantees enforced by `service.py`:

- Only the nine whitelist keys are returned (default-deny filter).
- `piiDetected` contains **booleans only** — never PII values.
- The original filename is never returned or logged.
- The uploaded file is written to a generic temp file and deleted in a
  `finally` block, always.
- Errors are generic (no stack traces, no file contents, no paths).

## Setup

```bash
cd ai-agent/docgen
python -m venv .venv
.venv\Scripts\activate        # Windows
pip install -r requirements.txt

# spaCy model (required by Presidio's NER and optional in extractor_fallback)
python -m spacy download en_core_web_lg
```

Auth key: set `PYTHON_API_KEY` in `docgen/.env`, or rely on the existing
key in `ai-agent/.env` (inherited automatically).

## Run

```bash
python service.py
# Serves on http://127.0.0.1:8002
```

## Test manually

```bash
curl -X POST "http://127.0.0.1:8002/process" \
  -H "x-api-key: <PYTHON_API_KEY>" \
  -F "file=@sample_resume.docx"
```

Automated tests (pytest) live in `docgen/tests/`.

## Limits

| Rule | Value |
|---|---|
| Allowed extensions | `.pdf`, `.docx` |
| Max file size | 10 MB |
| Processing timeout | 60 s (returns 504) |
| Port | 8002 (the legacy `../api.py` service stays on 8001) |
