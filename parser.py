"""
STAGE 1: DOCUMENT PARSING
--------------------------
Goal: Take an uploaded resume file (PDF or DOCX) and turn it into plain text
that the rest of the pipeline can work with.

Nothing in this file understands "skills" or "PII" — it only reads files.
"""
import os
import pdfplumber
import docx


def parse_pdf(filepath: str) -> str:
    """Read a PDF file page by page and join all the text together."""
    text_parts = []
    with pdfplumber.open(filepath) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text()  # returns None if a page has no extractable text
            if page_text:
                text_parts.append(page_text)
    return "\n".join(text_parts)


def parse_docx(filepath: str) -> str:
    """Read a DOCX file paragraph by paragraph and join the text together."""
    document = docx.Document(filepath)
    return "\n".join(p.text for p in document.paragraphs if p.text.strip())


def parse_resume(filepath: str) -> str:
    """
    Main entry point for Stage 1.
    Looks at the file extension and calls the right parser.
    Raises a clear error if the file is missing or unsupported.
    """
    if not os.path.exists(filepath):
        raise FileNotFoundError(f"File not found: {filepath}")

    ext = filepath.lower().rsplit(".", 1)[-1]

    if ext == "pdf":
        text = parse_pdf(filepath)
    elif ext == "docx":
        text = parse_docx(filepath)
    else:
        raise ValueError(f"Unsupported file type '.{ext}'. Only .pdf and .docx are supported.")

    if not text.strip():
        raise ValueError(f"No readable text found in '{filepath}'. The file may be a scanned image without OCR.")

    return text
