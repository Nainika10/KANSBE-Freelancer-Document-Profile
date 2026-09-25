"""
STAGE 4: FULL PIPELINE
-------------------------
Connects every stage together:
 
    document -> text extraction -> PII detection -> professional
    extraction -> validation -> Client View
 
Run directly from the command line:
    python pipeline.py sample_resume.docx
"""
import json
import sys
 
from parser import parse_resume
from pii_detector import detect_pii, contains_hard_block_pii, get_soft_warnings
from extractor import extract_professional_info, is_llm_available
from extractor_fallback import extract_professional_info_rule_based
 
 
def _flatten(profile: dict) -> str:
    """Turns every string value in the profile dict into one big string,
    so the safety-gate PII scan can check it all in one pass."""
    texts = []
    for value in profile.values():
        if isinstance(value, str):
            texts.append(value)
        elif isinstance(value, list):
            texts.extend(str(v) for v in value)
    return " ".join(texts)
 
 
def run_pipeline(filepath: str) -> dict:
    """
    Runs the full pipeline on one resume file and returns a result dict:
        {
          "client_view": {...},        # the final safe JSON profile
          "summary": {...},            # processing summary (see step 7)
        }
    Raises exceptions for unrecoverable errors (bad file, etc.) — the
    caller (the __main__ block below) is responsible for showing a
    friendly message.
    """
    # ---- Step 1: Text extraction ----
    raw_text = parse_resume(filepath)
 
    # ---- Step 2: PII detection (on the ORIGINAL document, for reporting) ----
    source_pii = detect_pii(raw_text)
 
    # ---- Step 3: Professional information extraction (whitelist-only) ----
    used_llm = is_llm_available()
    if used_llm:
        try:
            profile = extract_professional_info(raw_text)
        except Exception as e:
            # If the LLM path fails for any reason (bad key, network, bad
            # JSON), fall back to the rule-based extractor rather than crash.
            print(f"[warning] LLM extraction failed ({e}); using rule-based fallback instead.")
            profile = extract_professional_info_rule_based(raw_text)
            used_llm = False
    else:
        profile = extract_professional_info_rule_based(raw_text)
 
    # ---- Step 4: Final validation (safety gate) ----
    flattened = _flatten(profile)
    hard_hits = contains_hard_block_pii(flattened)
    soft_hits = get_soft_warnings(flattened)
 
    if hard_hits:
        # Something personal made it into a "professional" field.
        # Remove those exact text spans from every field rather than
        # silently shipping them, and report what was removed.
        for hit in hard_hits:
            for key, value in profile.items():
                if isinstance(value, list):
                    profile[key] = [
                        item.replace(hit["text"], "[REMOVED]") if isinstance(item, str) else item
                        for item in value
                    ]
        validation_status = f"BLOCKED_AND_CLEANED ({len(hard_hits)} hard PII hit(s) removed)"
    elif soft_hits:
        validation_status = f"PASSED_WITH_WARNINGS ({len(soft_hits)} item(s) flagged for review)"
    else:
        validation_status = "PASSED"
 
    summary = {
        "document_processed": filepath,
        "extraction_method": "LLM (Claude)" if used_llm else "Rule-based fallback",
        "pii_detected_in_source": [f["type"] for f in source_pii],
        "professional_fields_extracted": {k: len(v) for k, v in profile.items()},
        "validation_status": validation_status,
    }
 
    return {"client_view": profile, "summary": summary}
 
 
if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python pipeline.py <resume_file.pdf|.docx>")
        sys.exit(1)
 
    filepath = sys.argv[1]
 
    try:
        result = run_pipeline(filepath)
    except FileNotFoundError as e:
        print(f"[error] {e}")
        sys.exit(1)
    except ValueError as e:
        print(f"[error] {e}")
        sys.exit(1)
 
    print("=" * 60)
    print("CLIENT VIEW (safe to show freelancer's clients)")
    print("=" * 60)
    print(json.dumps(result["client_view"], indent=2))
 
    print("\n" + "=" * 60)
    print("PROCESSING SUMMARY")
    print("=" * 60)
    print(json.dumps(result["summary"], indent=2))
 