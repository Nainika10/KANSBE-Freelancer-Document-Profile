
"""
KANSBE — Freelancer Document & Profile Generator (service layer)
----------------------------------------------------------------
FastAPI wrapper around the tested pipeline in pipeline.py.

POST /process
    Accepts one PDF/DOCX resume, runs the full pipeline
    (parse -> PII detection -> extraction -> validation) and returns
    ONLY the whitelist-safe Client View plus boolean PII flags.

Privacy rules enforced here:
    - The uploaded file is written to a temp file and ALWAYS deleted
      in a finally block.
    - The response never contains the original filename, raw resume
      text, PII values, or anything outside the whitelist fields.
    - piiDetected contains booleans only (no types-with-values, no spans).
    - Errors are generic; no stack traces or internal details are leaked.

Auth: same x-api-key scheme as ../api.py (shared PYTHON_API_KEY).

Run:
    python service.py   # uvicorn on 127.0.0.1:8002
"""

import os
import tempfile
from pathlib import Path

import anyio
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, File, HTTPException, Security, UploadFile
from fastapi.security import APIKeyHeader

# Local .env (docgen) wins; otherwise inherit the key from ../.env (ai-agent).
load_dotenv(Path(__file__).resolve().parent / ".env")
load_dotenv(Path(__file__).resolve().parent.parent / ".env")

app = FastAPI(title="KANSBE Client View Generator")

API_KEY = os.getenv("PYTHON_API_KEY")

api_key_header = APIKeyHeader(
    name="x-api-key",
    auto_error=True,
)

# Hard limits
MAX_UPLOAD_SIZE = 10 * 1024 * 1024  # 10 MB
ALLOWED_EXTENSIONS = {".pdf", ".docx"}
PROCESS_TIMEOUT_SECONDS = 60

# DEFAULT-DENY whitelist: the ONLY fields that may appear in a Client View.
CLIENT_VIEW_WHITELIST = {
    "skills",
    "experience",
    "roles",
    "responsibilities",
    "projects",
    "technologies",
    "certifications",
    "achievements",
    "portfolio",
}

# Entity types -> response boolean categories for piiDetected.
_PII_CATEGORY_MAP = {
    "email": {"EMAIL_ADDRESS"},
    "phone": {"PHONE_NUMBER"},
    "addressLocation": {"LOCATION"},
    "governmentId": {"IN_AADHAAR", "IN_PAN", "US_SSN"},
}


def verify_api_key(
    api_key: str = Security(api_key_header),
):
    """Verify the API key supplied by the caller."""

    if not API_KEY or api_key != API_KEY:
        raise HTTPException(
            status_code=401,
            detail="Invalid or missing API key",
        )

    return api_key


def _filter_client_view(profile: dict) -> dict:
    """Keep ONLY whitelisted keys whose values are lists of strings.

    Anything unexpected (extra keys, nested objects, non-string items)
    is dropped, never passed through."""

    client_view = {}

    for key in CLIENT_VIEW_WHITELIST:
        value = profile.get(key)

        if not isinstance(value, list):
            continue

        client_view[key] = [
            item for item in value if isinstance(item, str)
        ]

    return client_view


def _normalize_status(raw_status: str) -> str:
    """Reduce the pipeline status string to its base token:
    PASSED | PASSED_WITH_WARNINGS | BLOCKED_AND_CLEANED."""

    base = (raw_status or "").strip().split(" ", 1)[0]

    if base in {"PASSED", "PASSED_WITH_WARNINGS", "BLOCKED_AND_CLEANED"}:
        return base

    return "PASSED_WITH_WARNINGS"  # unknown -> flag for review, never PASSED


def _build_pii_flags(source_pii_types: list) -> dict:
    """Map detected entity TYPE names to booleans. Never carries values."""

    detected = set(source_pii_types or [])

    return {
        category: bool(detected & entities)
        for category, entities in _PII_CATEGORY_MAP.items()
    }


@app.post("/process")
async def process_document(
    file: UploadFile = File(...),
    api_key: str = Depends(verify_api_key),
):
    """Parse a resume, extract professional fields, and return the
    privacy-safe Client View."""

    filename = Path(file.filename or "").name
    extension = Path(filename).suffix.lower()

    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail="Only PDF and DOCX files are supported.",
        )

    tmp_path = None

    try:
        file_bytes = await file.read(MAX_UPLOAD_SIZE + 1)

        if not file_bytes:
            raise HTTPException(
                status_code=400,
                detail="The uploaded file is empty.",
            )

        if len(file_bytes) > MAX_UPLOAD_SIZE:
            raise HTTPException(
                status_code=413,
                detail="File exceeds the 10 MB limit.",
            )

        # Write to a private temp file; the pipeline reads from disk.
        # The temp file has a generic name — the original filename is
        # never used, stored, or logged.
        with tempfile.NamedTemporaryFile(
            delete=False,
            suffix=extension,
            prefix="docgen_",
        ) as tmp:
            tmp.write(file_bytes)
            tmp_path = tmp.name

        # Import only when called (matches ../api.py convention and keeps
        # service startup fast).
        from pipeline import run_pipeline

        with anyio.fail_after(PROCESS_TIMEOUT_SECONDS):
            result = await anyio.to_thread.run_sync(
                run_pipeline, tmp_path
            )

        summary = result.get("summary") or {}

        return {
            "clientView": _filter_client_view(result.get("client_view") or {}),
            "validationStatus": _normalize_status(
                summary.get("validation_status", "")
            ),
            "piiDetected": _build_pii_flags(
                summary.get("pii_detected_in_source")
            ),
        }

    except HTTPException:
        raise

    except TimeoutError:
        raise HTTPException(
            status_code=504,
            detail="Document processing timed out. Please try again.",
        )

    except ValueError:
        # Empty / unreadable / image-only document. Message is generic and
        # never echoes file contents or paths.
        raise HTTPException(
            status_code=422,
            detail=(
                "No readable text could be extracted. "
                "The file may be scanned, image-based, or empty."
            ),
        )

    except Exception:
        # Do not return resume contents or internal details.
        # The exception remains available to server-side diagnostics.
        print("Client view generation failed")

        raise HTTPException(
            status_code=500,
            detail="Document processing failed. Please try again later.",
        )

    finally:
        # ALWAYS remove the temp file, success or failure.
        if tmp_path:
            try:
                os.unlink(tmp_path)
            except OSError:
                pass

        await file.close()


# --------------------------------------------------
# Start the FastAPI server
# --------------------------------------------------


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        app,
        host="127.0.0.1",
        port=8002,
    )
