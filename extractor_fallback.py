"""
STAGE 3: LOCAL PROFESSIONAL INFORMATION EXTRACTION

Goal:
Produce the same professional-profile JSON schema as the previous
LLM extractor, but using local Python rules and spaCy.

No API key.
No LLM.
No internet connection required.

Uses:
    - Resume section detection
    - Rule-based extraction
    - Local technology whitelist
    - spaCy available locally as supplementary NLP
"""

import re
import spacy


# ============================================================
# LOAD SPACY LOCALLY
# ============================================================

# No API or LLM is required.
try:
    NLP = spacy.load("en_core_web_lg")
except Exception:
    NLP = None


# ============================================================
# RECOGNIZED RESUME SECTION HEADINGS
# ============================================================

SECTION_HEADINGS = {

    # Skills
    "SKILLS": "skills",
    "TECHNICAL SKILLS": "skills",
    "CORE SKILLS": "skills",
    "KEY SKILLS": "skills",

    # Experience
    "EXPERIENCE": "experience",
    "WORK EXPERIENCE": "experience",
    "PROFESSIONAL EXPERIENCE": "experience",
    "EMPLOYMENT": "experience",
    "INTERNSHIP": "experience",
    "INTERNSHIPS": "experience",

    # Projects
    "PROJECTS": "projects",
    "ACADEMIC PROJECTS": "projects",
    "PERSONAL PROJECTS": "projects",
    "KEY PROJECTS": "projects",

    # Education
    "EDUCATION": "roles",
    "EDUCATIONAL QUALIFICATIONS": "roles",
    "ACADEMIC BACKGROUND": "roles",

    # Certifications
    "CERTIFICATIONS": "certifications",
    "CERTIFICATES": "certifications",

    # Achievements
    "ACHIEVEMENTS": "achievements",
    "AWARDS": "achievements",
    "HONORS": "achievements",

    # Technologies
    "TECHNOLOGIES": "technologies",
    "TECHNOLOGY": "technologies",
    "TECH STACK": "technologies",
    "TECHNICAL STACK": "technologies",

    # Portfolio
    "PORTFOLIO": "portfolio",
    "WORK SAMPLES": "portfolio",
    "PORTFOLIO/WORK SAMPLES": "portfolio",
}


# ============================================================
# LOCAL TECHNOLOGY WHITELIST
# ============================================================

# Common technologies that can be detected locally without an LLM.
# This list can be expanded as new resume formats are encountered.

TECHNOLOGY_WHITELIST = [

    # --------------------------------------------------------
    # Programming Languages
    # --------------------------------------------------------

    "Python",
    "Java",
    "JavaScript",
    "TypeScript",
    "C",
    "C++",
    "C#",
    "Go",
    "Rust",
    "Kotlin",
    "Swift",
    "PHP",
    "Ruby",

    # --------------------------------------------------------
    # Web / Frontend
    # --------------------------------------------------------

    "HTML",
    "CSS",
    "React",
    "React.js",
    "Angular",
    "Vue",
    "Next.js",
    "Node.js",
    "Express",
    "Bootstrap",
    "Tailwind CSS",

    # --------------------------------------------------------
    # Backend / APIs
    # --------------------------------------------------------

    "FastAPI",
    "Flask",
    "Django",
    "Spring",
    "Spring Boot",
    "REST API",
    "GraphQL",

    # --------------------------------------------------------
    # Databases
    # --------------------------------------------------------

    "MongoDB",
    "MySQL",
    "PostgreSQL",
    "SQLite",
    "Oracle",
    "Redis",
    "Firebase",

    # --------------------------------------------------------
    # Cloud / DevOps
    # --------------------------------------------------------

    "AWS",
    "Azure",
    "Google Cloud",
    "GCP",
    "Docker",
    "Kubernetes",
    "Jenkins",
    "Git",
    "GitHub",
    "GitLab",

    # --------------------------------------------------------
    # Data / Machine Learning
    # --------------------------------------------------------

    "NumPy",
    "Pandas",
    "Scikit-learn",
    "TensorFlow",
    "PyTorch",
    "Keras",
    "OpenCV",
    "spaCy",
    "NLTK",

    # --------------------------------------------------------
    # AI / Generative AI
    # --------------------------------------------------------

    "LangChain",
    "LlamaIndex",
    "Hugging Face",
    "Transformers",
    "OpenAI",
    "OpenAI API",
    "Groq",
    "Mistral",
    "Ollama",

    # --------------------------------------------------------
    # Security / Privacy
    # --------------------------------------------------------

    "Presidio",
    "Wireshark",
    "Nmap",
    "Metasploit",

    # --------------------------------------------------------
    # Mobile
    # --------------------------------------------------------

    "Flutter",
    "React Native",
    "Android",
    "Android Studio",

    # --------------------------------------------------------
    # Other Tools
    # --------------------------------------------------------

    "Streamlit",
    "Jupyter",
    "Postman",
]


# ============================================================
# HELPER: CLEAN RESUME LINE
# ============================================================

def _clean_line(line: str) -> str:
    """
    Clean common resume formatting artifacts.
    """

    line = line.strip()

    # Remove common bullet characters
    line = line.lstrip("•●▪◦*-").strip()

    # Normalize repeated spaces
    line = re.sub(r"\s+", " ", line)

    return line


# ============================================================
# HELPER: FIND RESUME SECTIONS
# ============================================================

def _find_section_boundaries(lines: list[str]) -> dict:
    """
    Scan all lines and identify recognized resume sections.

    Returns:
        {
            "skills": [...],
            "experience": [...],
            "projects": [...],
            ...
        }
    """

    heading_positions = []

    for i, line in enumerate(lines):

        clean = line.strip().upper().rstrip(":")

        if clean in SECTION_HEADINGS:

            heading_positions.append(
                (i, SECTION_HEADINGS[clean])
            )

    sections = {}

    for idx, (start, field) in enumerate(heading_positions):

        if idx + 1 < len(heading_positions):

            end = heading_positions[idx + 1][0]

        else:

            end = len(lines)

        content_lines = [

            _clean_line(line)

            for line in lines[start + 1:end]

            if line.strip()
        ]

        sections.setdefault(field, []).extend(
            content_lines
        )

    return sections


# ============================================================
# HELPER: SPLIT LIST VALUES
# ============================================================

def _split_list_line(line: str) -> list[str]:
    """
    Split a line on common separators.
    """

    parts = re.split(
        r"[,;|•]",
        line
    )

    return [
        part.strip()
        for part in parts
        if part.strip()
    ]


# ============================================================
# HELPER: REMOVE DUPLICATES
# ============================================================

def _unique(items: list[str]) -> list[str]:
    """
    Remove duplicate items while preserving
    their original order.
    """

    seen = set()

    result = []

    for item in items:

        item = item.strip()

        if not item:
            continue

        key = item.lower()

        if key not in seen:

            seen.add(key)

            result.append(item)

    return result


# ============================================================
# HELPER: EXTRACT TECHNOLOGIES LOCALLY
# ============================================================

def _extract_technologies(text: str) -> list[str]:
    """
    Detect known technologies from resume text
    using a local whitelist.

    No LLM or API is used.
    """

    found = []

    text_lower = text.lower()

    for technology in TECHNOLOGY_WHITELIST:

        pattern = (
            r"(?<!\w)"
            + re.escape(technology.lower())
            + r"(?!\w)"
        )

        if re.search(pattern, text_lower):

            found.append(technology)

    return _unique(found)


# ============================================================
# MAIN LOCAL RULE-BASED EXTRACTION
# ============================================================

def extract_professional_info_rule_based(text: str) -> dict:
    """
    Extract professional information locally using
    section detection and rule-based processing.

    No LLM or API is used.
    """

    lines = text.splitlines()

    sections = _find_section_boundaries(lines)

    # Same output schema expected by the application
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

    # ========================================================
    # SKILLS
    # ========================================================

    for line in sections.get("skills", []):

        result["skills"].extend(
            _split_list_line(line)
        )

    # ========================================================
    # TECHNOLOGIES
    # ========================================================
    #
    # Detect technologies locally from the complete resume.
    #
    # This uses a whitelist rather than an LLM or spaCy
    # entity guessing, which helps avoid false positives.
    # ========================================================

    result["technologies"] = _extract_technologies(text)

    # ========================================================
    # EXPERIENCE
    # ========================================================
    #
    # The first line is treated as the role/company entry.
    # Following lines are treated as responsibilities.
    #
    # Example:
    #
    # AI/ML Intern, CyberPulse
    # Built security monitoring platform
    # Implemented log ingestion pipeline
    #
    # becomes:
    #
    # experience:
    #   AI/ML Intern, CyberPulse
    #
    # responsibilities:
    #   Built security monitoring platform
    #   Implemented log ingestion pipeline
    # ========================================================

    experience_lines = sections.get(
        "experience",
        []
    )

    if experience_lines:

        result["experience"].append(
            experience_lines[0]
        )

        for line in experience_lines[1:]:

            result["responsibilities"].append(
                line
            )

    # ========================================================
    # PROJECTS
    # ========================================================

    for line in sections.get("projects", []):

        if " - " in line:

            name, description = line.split(
                " - ",
                1
            )

            result["projects"].append(
                f"{name.strip()}: {description.strip()}"
            )

        else:

            result["projects"].append(
                line
            )

    # ========================================================
    # DIRECT SECTION PASSTHROUGHS
    # ========================================================

    result["certifications"] = sections.get(
        "certifications",
        []
    )

    result["achievements"] = sections.get(
        "achievements",
        []
    )

    result["roles"] = sections.get(
        "roles",
        []
    )

    result["portfolio"] = sections.get(
        "portfolio",
        []
    )

    # ========================================================
    # REMOVE DUPLICATES
    # ========================================================

    result["skills"] = _unique(
        result["skills"]
    )

    result["experience"] = _unique(
        result["experience"]
    )

    result["roles"] = _unique(
        result["roles"]
    )

    result["responsibilities"] = _unique(
        result["responsibilities"]
    )

    result["projects"] = _unique(
        result["projects"]
    )

    result["technologies"] = _unique(
        result["technologies"]
    )

    result["certifications"] = _unique(
        result["certifications"]
    )

    result["achievements"] = _unique(
        result["achievements"]
    )

    result["portfolio"] = _unique(
        result["portfolio"]
    )

    return result


# ============================================================
# OPTIONAL SPACY ENTITY EXTRACTION
# ============================================================

def _extract_spacy_entities(text: str) -> list[str]:
    """
    Extract useful named entities locally using spaCy.

    This is supplementary information only.

    It is intentionally NOT automatically added to
    technologies because spaCy can identify organizations
    or products that are not actually technologies.
    """

    if NLP is None:

        return []

    doc = NLP(text)

    entities = []

    for ent in doc.ents:

        if ent.label_ in {"ORG", "PRODUCT"}:

            value = ent.text.strip()

            if value:

                entities.append(value)

    return _unique(entities)