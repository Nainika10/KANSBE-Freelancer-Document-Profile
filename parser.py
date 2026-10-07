"""
STAGE 1: DOCUMENT PARSING
-------------------------
Reads PDF and DOCX resumes and converts them into plain text.

PDF parsing uses PyMuPDF.
DOCX parsing uses python-docx.

No LLM or external API is used here.
"""

import os
import pymupdf
import docx


def parse_pdf(filepath: str) -> str:
    """Extract text from PDF using PyMuPDF."""

    text_parts = []

    with pymupdf.open(filepath) as pdf:
        for page in pdf:
            page_text = page.get_text("text")

            if page_text and page_text.strip():
                text_parts.append(page_text)

    return "\n".join(text_parts)


def parse_docx(filepath: str) -> str:
    """Extract text from DOCX using python-docx."""

    document = docx.Document(filepath)

    return "\n".join(
        paragraph.text
        for paragraph in document.paragraphs
        if paragraph.text.strip()
    )


def parse_resume(filepath: str) -> str:
    """Main document parsing function."""

    if not os.path.exists(filepath):
        raise FileNotFoundError(
            f"File not found: {filepath}"
        )

    ext = filepath.lower().rsplit(".", 1)[-1]

    if ext == "pdf":
        text = parse_pdf(filepath)

    elif ext == "docx":
        text = parse_docx(filepath)

    else:
        raise ValueError(
            f"Unsupported file type '.{ext}'. "
            "Only .pdf and .docx are supported."
        )

    if not text.strip():
        raise ValueError(
            f"No readable text found in '{filepath}'. "
            "The file may be scanned or image-based."
        )

    return text