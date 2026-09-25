"""
DEMO UI — Streamlit front-end for the existing pipeline.

This file does NOT contain any extraction, detection, or validation
logic of its own. It only:
  1. Lets the user upload a file through a browser
  2. Saves it to a temporary path
  3. Calls run_pipeline() from pipeline.py (the existing, tested logic)
  4. Renders the result as a resume-style Client View

Run with:
    streamlit run app.py
"""
import os
import tempfile

import streamlit as st

from pipeline import run_pipeline

# PII types that map to each summary row shown in the UI.
PII_CATEGORY_MAP = {
    "Email": {"EMAIL_ADDRESS"},
    "Phone": {"PHONE_NUMBER"},
    "Address/Location": {"LOCATION"},
    "Government ID": {"IN_AADHAAR", "IN_PAN", "US_SSN"},
}

st.set_page_config(page_title="Freelancer Document & Profile Generator", layout="centered")

# ---------------------------------------------------------------------------
# Minimal CSS for a clean, white, resume-like look. Purely cosmetic — no
# data handling happens here.
# ---------------------------------------------------------------------------
st.markdown("""
<style>
.resume-box {
    background: #ffffff;
    border: 1px solid #e0e0e0;
    border-radius: 6px;
    padding: 40px 48px;
    margin-top: 10px;
    margin-bottom: 20px;
}
.resume-section-title {
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 1.5px;
    color: #2c3e50;
    border-bottom: 2px solid #2c3e50;
    padding-bottom: 4px;
    margin-top: 26px;
    margin-bottom: 12px;
}
.resume-entry-title {
    font-size: 15px;
    font-weight: 700;
    color: #1a1a1a;
    margin-bottom: 2px;
}
.resume-entry-sub {
    font-size: 13px;
    color: #666666;
    margin-bottom: 8px;
}
.resume-bullet {
    font-size: 14px;
    color: #333333;
    margin: 3px 0 3px 4px;
}
.resume-skills {
    font-size: 14px;
    color: #333333;
    line-height: 1.8;
}
</style>
""", unsafe_allow_html=True)

st.title("Freelancer Document & Profile Generator")
st.caption("Professional Information Extraction with PII Protection")

st.divider()

uploaded_file = st.file_uploader("Upload Freelancer Document", type=["pdf", "docx"])
generate_clicked = st.button("Generate Client View", type="primary", disabled=uploaded_file is None)


def render_resume(client_view: dict):
    """
    Renders the whitelist-only client_view dict as a resume-style layout.
    Only draws a section if it has actual content — never invents text,
    never shows an empty heading. No PII fields exist in client_view to
    begin with (the pipeline never puts them there), so none can appear here.
    """
    skills = client_view.get("skills", [])
    experience = client_view.get("experience", [])
    responsibilities = client_view.get("responsibilities", [])
    roles = client_view.get("roles", [])
    projects = client_view.get("projects", [])
    technologies = client_view.get("technologies", [])
    certifications = client_view.get("certifications", [])
    achievements = client_view.get("achievements", [])
    portfolio = client_view.get("portfolio", [])

    html = ['<div class="resume-box">']

    # NOTE: the pipeline's whitelist schema does not extract a name or job
    # title field at all (by design — see extractor.py / extractor_fallback.py
    # schema). We never invent one, so no centered name/title header is
    # shown here — only what the data actually supports.

    # ---- SKILLS ----
    if skills:
        html.append('<div class="resume-section-title">SKILLS</div>')
        html.append(f'<div class="resume-skills">{" &nbsp;|&nbsp; ".join(skills)}</div>')

    # ---- EXPERIENCE ----
    # `experience` holds role/company/duration header lines (e.g.
    # "AI/ML Intern, CyberPulse (Jan 2025 - Present)") and `responsibilities`
    # holds the bullet points under them. The extractor doesn't structurally
    # link one experience entry to its bullets, so — without inventing that
    # link — all experience headers are shown together, followed by all
    # responsibility bullets together underneath. This stays faithful to
    # what was actually extracted rather than guessing a pairing.
    if experience or responsibilities:
        html.append('<div class="resume-section-title">EXPERIENCE</div>')
        for entry in experience:
            html.append(f'<div class="resume-entry-title">{entry}</div>')
        for item in responsibilities:
            html.append(f'<div class="resume-bullet">• {item}</div>')

    # ---- ROLES (education/background lines land here from the fallback extractor) ----
    if roles:
        html.append('<div class="resume-section-title">ROLES</div>')
        for r in roles:
            html.append(f'<div class="resume-bullet">• {r}</div>')

    # ---- PROJECTS ----
    if projects:
        html.append('<div class="resume-section-title">PROJECTS</div>')
        for p in projects:
            if ":" in p:
                name, desc = p.split(":", 1)
                html.append(f'<div class="resume-entry-title">{name.strip()}</div>')
                html.append(f'<div class="resume-entry-sub">{desc.strip()}</div>')
            else:
                html.append(f'<div class="resume-entry-title">{p}</div>')

    # ---- TECHNOLOGIES ----
    if technologies:
        html.append('<div class="resume-section-title">TECHNOLOGIES</div>')
        html.append(f'<div class="resume-skills">{" &nbsp;|&nbsp; ".join(technologies)}</div>')

    # ---- CERTIFICATIONS ----
    if certifications:
        html.append('<div class="resume-section-title">CERTIFICATIONS</div>')
        for c in certifications:
            html.append(f'<div class="resume-bullet">{c}</div>')

    # ---- ACHIEVEMENTS ----
    if achievements:
        html.append('<div class="resume-section-title">ACHIEVEMENTS</div>')
        for a in achievements:
            html.append(f'<div class="resume-bullet">• {a}</div>')

    # ---- PORTFOLIO ----
    if portfolio:
        html.append('<div class="resume-section-title">PORTFOLIO</div>')
        for item in portfolio:
            html.append(f'<div class="resume-bullet">• {item}</div>')

    html.append("</div>")
    st.markdown("\n".join(html), unsafe_allow_html=True)


if generate_clicked and uploaded_file is not None:
    suffix = "." + uploaded_file.name.rsplit(".", 1)[-1].lower()
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(uploaded_file.getvalue())
        tmp_path = tmp.name

    try:
        with st.spinner("Processing document..."):
            result = run_pipeline(tmp_path)
    except Exception as e:
        st.error(f"Processing failed: {e}")
        result = None
    finally:
        os.unlink(tmp_path)

    if result is not None:
        client_view = result["client_view"]
        summary = result["summary"]
        detected_types = set(summary["pii_detected_in_source"])
        validation_status = summary["validation_status"]

        # ---- PII Protection Summary ----
        st.subheader("PII Protection Summary")
        for label, type_set in PII_CATEGORY_MAP.items():
            found = bool(detected_types & type_set)
            status = "🔴 Detected (hidden from Client View)" if found else "🟢 Not detected"
            st.write(f"**{label}:** {status}")

        st.divider()

        # ---- CLIENT VIEW — resume-style rendering, no JSON, no debug info ----
        st.subheader("CLIENT VIEW")
        render_resume(client_view)

        # ---- Validation status ----
        st.subheader("Validation Status")
        if validation_status.startswith("PASSED_WITH_WARNINGS"):
            st.warning(validation_status)
        elif validation_status.startswith("BLOCKED_AND_CLEANED"):
            st.error(validation_status)
        else:
            st.success(validation_status)

        if validation_status.startswith("BLOCKED_AND_CLEANED"):
            st.warning(
                "Sensitive information was detected during final validation "
                "and removed before generating the Client View."
            )

st.divider()
st.caption(
    "Client View is generated using whitelist extraction. "
    "Only approved professional fields are exposed."
)
