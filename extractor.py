"""
STAGE 3 (PRIMARY): WHITELIST EXTRACTION — LLM-BASED
------------------------------------------------------
Goal: Read the raw resume text and pull out ONLY professional information,
into a fixed JSON shape. Nothing personal is ever asked for, so nothing
personal can leak through this stage.

This is "whitelist extraction": instead of taking the whole resume and
trying to delete personal details afterwards (easy to miss something),
we only ever ask for the professional fields we want, and build the
Client View purely from those.

Used ONLY if an ANTHROPIC_API_KEY environment variable is set.
Otherwise pipeline.py falls back to extractor_fallback.py (no API key needed).
"""
import json
import os

# Client-view schema. Every field starts empty/null and is only filled in
# if that information is explicitly present in the source document.
CLIENT_VIEW_SCHEMA = {
    "skills": [],
    "experience": [],       # e.g. ["3 years", "AI/ML Intern at CyberPulse"]
    "roles": [],
    "responsibilities": [],
    "projects": [],
    "technologies": [],
    "certifications": [],
    "achievements": [],
    "portfolio": [],
}

EXTRACTION_SYSTEM_PROMPT = """You extract ONLY professional information from resumes into JSON.

Return a JSON object with EXACTLY these fields (same names, same order):
{
  "skills": [],
  "experience": [],
  "roles": [],
  "responsibilities": [],
  "projects": [],
  "technologies": [],
  "certifications": [],
  "achievements": [],
  "portfolio": []
}

STRICT RULES — follow all of them exactly:
1. Only extract information that is explicitly written in the source text.
2. NEVER infer, assume, guess, exaggerate, or invent information.
3. If a field has no information in the source document, leave it as an
   empty list []. Do not fill it with placeholder or guessed content.
4. Do NOT include phone numbers, email addresses, physical addresses,
   date of birth, or any government ID numbers anywhere in the output,
   even inside free-text fields like "responsibilities" or "achievements".
5. Preserve the original wording as closely as possible — do not
   creatively paraphrase or embellish.
6. Respond with ONLY the JSON object. No preamble, no explanation, no
   markdown code fences.
"""


def is_llm_available() -> bool:
    """Check whether an API key is configured before attempting to use the LLM path."""
    return bool(os.environ.get("ANTHROPIC_API_KEY"))


def extract_professional_info(resume_text: str) -> dict:
    """
    Sends the resume text to Claude with strict extraction-only instructions
    and returns the parsed JSON. Raises RuntimeError if no API key is set,
    or ValueError if the model's response isn't valid JSON (should be rare
    given the system prompt, but we handle it rather than crash).
    """
    if not is_llm_available():
        raise RuntimeError("ANTHROPIC_API_KEY is not set — cannot use the LLM extractor.")

    from anthropic import Anthropic
    client = Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])

    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=2000,
        system=EXTRACTION_SYSTEM_PROMPT,
        messages=[{"role": "user", "content": resume_text}],
    )

    raw = response.content[0].text.strip()
    raw = raw.replace("```json", "").replace("```", "").strip()

    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError as e:
        raise ValueError(f"LLM did not return valid JSON: {e}\nRaw response: {raw[:300]}")

    # Ensure every expected key exists even if the model omitted an empty one
    for key in CLIENT_VIEW_SCHEMA:
        parsed.setdefault(key, [])

    return parsed
