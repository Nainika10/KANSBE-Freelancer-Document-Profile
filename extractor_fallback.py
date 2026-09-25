"""
STAGE 3 (FALLBACK): WHITELIST EXTRACTION — RULE-BASED, NO API KEY NEEDED
---------------------------------------------------------------------------
Goal: Same as extractor.py (produce the same JSON schema), but using
simple section-header + line-splitting rules instead of an LLM.

This is simpler and less flexible than the LLM version — it works by
looking for common resume section headings (SKILLS, EXPERIENCE, etc.)
and reading the lines underneath each one. It won't be as smart as an
LLM at handling unusual formatting, but it needs no API key and no
internet access, which makes it good for offline testing and demos.
"""
import re

# Recognized section headings and which output field they map to.
# Matching is case-insensitive and allows a few common synonyms.
SECTION_HEADINGS = {
    "SKILLS": "skills",
    "TECHNICAL SKILLS": "skills",
    "EXPERIENCE": "experience",
    "WORK EXPERIENCE": "experience",
    "PROJECTS": "projects",
    "CERTIFICATIONS": "certifications",
    "CERTIFICATES": "certifications",
    "ACHIEVEMENTS": "achievements",
    "AWARDS": "achievements",
    "EDUCATION": "roles",          # education entries are grouped with roles/background
    "TECHNOLOGIES": "technologies",
    "PORTFOLIO": "portfolio",
    "WORK SAMPLES": "portfolio",
    "PORTFOLIO/WORK SAMPLES": "portfolio",
}


def _find_section_boundaries(lines: list[str]) -> dict:
    """
    Scans all lines once and records where each recognized section starts
    and ends. Returns {output_field: [line, line, ...]} for each section found.
    """
    heading_positions = []
    for i, line in enumerate(lines):
        clean = line.strip().upper().rstrip(":")
        if clean in SECTION_HEADINGS:
            heading_positions.append((i, SECTION_HEADINGS[clean]))

    sections = {}
    for idx, (start, field) in enumerate(heading_positions):
        end = heading_positions[idx + 1][0] if idx + 1 < len(heading_positions) else len(lines)
        content_lines = [l.strip() for l in lines[start + 1:end] if l.strip()]
        sections.setdefault(field, []).extend(content_lines)
    return sections


def _split_list_line(line: str) -> list[str]:
    """Splits a comma/semicolon/pipe separated line into individual items."""
    parts = re.split(r"[,;|]", line)
    return [p.strip() for p in parts if p.strip()]


def extract_professional_info_rule_based(text: str) -> dict:
    """
    Main entry point for the fallback extractor.
    Returns the same schema shape as extractor.extract_professional_info(),
    filled in from whatever recognized sections were found in the text.
    Fields with no matching section stay as empty lists — never guessed.
    """
    lines = text.splitlines()
    sections = _find_section_boundaries(lines)

    result = {
        "skills": [],
        "experience": [],
        "roles": [],
        "responsibilities": [],
        "projects": [],
        "technologies": [],
        "certifications": [],
        "achievements": [],
        "portfolio": [],
    }

    # SKILLS / TECHNOLOGIES: usually comma-separated on one or more lines
    for field in ("skills", "technologies"):
        for line in sections.get(field, []):
            result[field].extend(_split_list_line(line))

    # EXPERIENCE: lines starting with "-" or "•" are treated as responsibilities,
    # everything else is treated as a role/company/duration header line.
    for line in sections.get("experience", []):
        if line.startswith(("-", "•", "*")):
            result["responsibilities"].append(line.lstrip("-•* ").strip())
        else:
            result["experience"].append(line)

    # PROJECTS: "Name - Description" format is split; otherwise kept as-is
    for line in sections.get("projects", []):
        if " - " in line:
            name, desc = line.split(" - ", 1)
            result["projects"].append(f"{name.strip()}: {desc.strip()}")
        else:
            result["projects"].append(line)

    # Direct passthroughs — each line is one item
    result["certifications"] = sections.get("certifications", [])
    result["achievements"] = sections.get("achievements", [])
    result["roles"] = sections.get("roles", [])  # education/background lines land here
    result["portfolio"] = sections.get("portfolio", [])

    return result
