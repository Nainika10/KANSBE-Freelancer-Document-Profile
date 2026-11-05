"""
STAGE 4: FULL PIPELINE
----------------------
Connects every stage together:

    document -> text extraction -> PII detection -> professional
    extraction -> validation -> Client View

The professional information extraction is fully local:
    - No LLM
    - No Claude API
    - No API key
    - Rule-based extraction + local NLP

Run directly from the command line:
    python pipeline.py sample_resume.docx
"""

import json
import sys

from parser import parse_resume
from pii_detector import (
    detect_pii,
    contains_hard_block_pii,
    get_soft_warnings,
)
from extractor_fallback import extract_professional_info_rule_based


def _flatten(profile: dict) -> str:
    """
    Turns every string value in the profile dict into one big string,
    so the safety-gate PII scan can check it all in one pass.
    """

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
            "client_view": {...},
            "summary": {...}
        }

    Raises exceptions for unrecoverable errors such as a bad file.
    """

    # ------------------------------------------------------------
    # Step 1: Text extraction
    # ------------------------------------------------------------

    raw_text = parse_resume(filepath)

    # ------------------------------------------------------------
    # Step 2: PII detection
    # ------------------------------------------------------------
    # Scan the ORIGINAL document so we know what personal information
    # was present in the source document.

    source_pii = detect_pii(raw_text)

    # ------------------------------------------------------------
    # Step 3: Professional information extraction
    # ------------------------------------------------------------
    # LOCAL ONLY
    #
    # No Claude
    # No LLM
    # No API key
    # No internet
    #
    # Uses the rule-based extractor with local NLP support.

    profile = extract_professional_info_rule_based(raw_text)

    # ------------------------------------------------------------
    # Step 4: Final validation / safety gate
    # ------------------------------------------------------------

    flattened = _flatten(profile)

    hard_hits = contains_hard_block_pii(flattened)
    soft_hits = get_soft_warnings(flattened)

    if hard_hits:

        # Something personal made it into a professional field.
        # Remove those exact text spans from every field.

        for hit in hard_hits:

            for key, value in profile.items():

                if isinstance(value, list):

                    profile[key] = [
                        item.replace(
                            hit["text"],
                            "[REMOVED]"
                        )
                        if isinstance(item, str)
                        else item
                        for item in value
                    ]

        validation_status = (
            f"BLOCKED_AND_CLEANED "
            f"({len(hard_hits)} hard PII hit(s) removed)"
        )

    elif soft_hits:

        validation_status = (
            f"PASSED_WITH_WARNINGS "
            f"({len(soft_hits)} item(s) flagged for review)"
        )

    else:

        validation_status = "PASSED"

    # ------------------------------------------------------------
    # Step 5: Processing summary
    # ------------------------------------------------------------

    summary = {
        "document_processed": filepath,

        "extraction_method": (
            "Local NLP + Rule-based extraction"
        ),

        "pii_detected_in_source": [
            f["type"]
            for f in source_pii
        ],

        "professional_fields_extracted": {
            k: len(v)
            for k, v in profile.items()
        },

        "validation_status": validation_status,
    }

    return {
        "client_view": profile,
        "summary": summary,
    }


# ================================================================
# COMMAND-LINE EXECUTION
# ================================================================

if __name__ == "__main__":

    if len(sys.argv) != 2:

        print(
            "Usage: python pipeline.py <resume_file.pdf|.docx>"
        )

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

    print(
        "CLIENT VIEW "
        "(safe to show freelancer's clients)"
    )

    print("=" * 60)

    print(
        json.dumps(
            result["client_view"],
            indent=2
        )
    )

    print("\n" + "=" * 60)

    print("PROCESSING SUMMARY")

    print("=" * 60)

    print(
        json.dumps(
            result["summary"],
            indent=2
        )
    )