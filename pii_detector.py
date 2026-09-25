"""
STAGE 2: PII DETECTION
------------------------
Goal: Given raw text, find anything that looks like personal/private
information (PII) and separate it from professional information.

This file is used in TWO places in the pipeline:
  1. Informational — to show what PII exists in the source document
     (for the processing summary).
  2. Safety gate — to re-check the FINAL client-view JSON before it is
     shown, in case something personal slipped into a "professional"
     field by mistake.

We use a HYBRID approach:
  - Regex: for PII with a fixed, predictable shape (emails, Indian
    Aadhaar/PAN numbers). Fast and precise for structured formats.
  - Presidio (NER-based): for PII embedded in free-form text (phone
    numbers in various formats, person names, locations/addresses,
    dates). Presidio combines its own regex recognizers with a spaCy
    NER model under one API.
"""
import re
from presidio_analyzer import AnalyzerEngine, PatternRecognizer, Pattern

# ---------------------------------------------------------------------------
# REGEX BACKSTOP for hard-block PII (phone, email).
# WHY THIS EXISTS: Presidio's NER-based phone detector scores confidence
# partly using nearby context words (e.g. "phone:", "call me at"). When a
# phone number appears WITHOUT such context — e.g. buried inside a
# responsibilities sentence — its confidence can drop below our 0.6
# threshold and slip past the NER-only check. Regex has no such weakness:
# a phone-shaped string of digits is always caught, regardless of context.
# This runs independently of Presidio and ORs together with it, so a hard
# hit here can never be missed due to a low confidence score.
# ---------------------------------------------------------------------------
_BACKSTOP_PHONE_RE = re.compile(r"(?:\+?\d{1,3}[\s-]?)?\d{5}[\s-]?\d{5}\b")
_BACKSTOP_EMAIL_RE = re.compile(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}")


def _backstop_hard_hits(text: str) -> list[dict]:
    """Confidence-independent regex scan for phone/email, used alongside
    Presidio so low NER confidence can never cause a silent leak."""
    hits = []
    for m in _BACKSTOP_PHONE_RE.finditer(text):
        hits.append({"type": "PHONE_NUMBER", "text": m.group(), "start": m.start(), "end": m.end(), "confidence": 1.0})
    for m in _BACKSTOP_EMAIL_RE.finditer(text):
        hits.append({"type": "EMAIL_ADDRESS", "text": m.group(), "start": m.start(), "end": m.end(), "confidence": 1.0})
    return hits

# ---------------------------------------------------------------------------
# Custom recognizers for India-specific ID formats that Presidio does not
# know about out of the box (its built-in recognizers are mostly US/EU).
# ---------------------------------------------------------------------------

aadhaar_pattern = Pattern(name="aadhaar_pattern", regex=r"\b\d{4}\s?\d{4}\s?\d{4}\b", score=0.85)
aadhaar_recognizer = PatternRecognizer(supported_entity="IN_AADHAAR", patterns=[aadhaar_pattern])

pan_pattern = Pattern(name="pan_pattern", regex=r"\b[A-Z]{5}\d{4}[A-Z]\b", score=0.85)
pan_recognizer = PatternRecognizer(supported_entity="IN_PAN", patterns=[pan_pattern])

_analyzer = AnalyzerEngine()
_analyzer.registry.add_recognizer(aadhaar_recognizer)
_analyzer.registry.add_recognizer(pan_recognizer)

# Entity types this project cares about (Presidio supports many more; we
# scope the search to what the task explicitly asks us to hide/detect).
PII_ENTITIES = [
    "PHONE_NUMBER", "EMAIL_ADDRESS", "PERSON", "LOCATION",
    "DATE_TIME", "IN_AADHAAR", "IN_PAN", "US_SSN", "CREDIT_CARD",
]

# HARD_BLOCK: if these appear in the final Client View output, ALWAYS block —
# there is no legitimate reason contact details or ID numbers should be
# in a professional profile.
HARD_BLOCK_ENTITIES = {"PHONE_NUMBER", "EMAIL_ADDRESS", "IN_AADHAAR", "IN_PAN", "US_SSN", "CREDIT_CARD"}

# SOFT_WARN: flagged for a human reviewer, but NOT auto-blocked.
#   - PERSON: the freelancer's name is allowed to appear (it isn't in the
#     "must hide" list from the task), so we can't hard-block all names.
#   - LOCATION / DATE_TIME: high false-positive rate on professional text
#     (e.g. an acronym misread as a place, or "Jan 2025" misread as a date
#     of birth). Worth a human glance, not worth auto-deleting content over.
SOFT_WARN_ENTITIES = {"PERSON", "LOCATION", "DATE_TIME"}


def detect_pii(text: str) -> list[dict]:
    """
    Scans `text` and returns every PII span found, e.g.:
    [{"type": "EMAIL_ADDRESS", "text": "a@b.com", "start": 10, "end": 17, "confidence": 0.95}, ...]
    """
    results = _analyzer.analyze(text=text, entities=PII_ENTITIES, language="en")
    findings = []
    for r in results:
        findings.append({
            "type": r.entity_type,
            "text": text[r.start:r.end],
            "start": r.start,
            "end": r.end,
            "confidence": round(r.score, 2),
        })
    return findings


def contains_hard_block_pii(text: str, threshold: float = 0.6) -> list[dict]:
    """Returns any HARD_BLOCK findings — from Presidio (confidence-gated)
    PLUS the regex backstop (always active, no confidence dependency).
    Non-empty result = must block/clean the output."""
    findings = detect_pii(text)
    presidio_hits = [f for f in findings if f["type"] in HARD_BLOCK_ENTITIES and f["confidence"] >= threshold]
    backstop_hits = _backstop_hard_hits(text)

    # Deduplicate: don't report the same exact text twice if both layers caught it
    seen_texts = {h["text"] for h in presidio_hits}
    combined = presidio_hits + [h for h in backstop_hits if h["text"] not in seen_texts]
    return combined


def get_soft_warnings(text: str, threshold: float = 0.6) -> list[dict]:
    """Returns SOFT_WARN findings, for logging/review only."""
    findings = detect_pii(text)
    return [f for f in findings if f["type"] in SOFT_WARN_ENTITIES and f["confidence"] >= threshold]
