from pipeline import run_pipeline
from pathlib import Path

FIXTURES = Path(__file__).parent / 'fixtures'

def test_sample_resume_pipeline():
    p = FIXTURES / 'sample_resume.docx'
    res = run_pipeline(str(p))
    assert 'client_view' in res
    cv = res['client_view']
    assert isinstance(cv.get('skills'), list)

def test_leak_test_has_cleanup():
    p = FIXTURES / 'leak_test_resume.docx'
    if not p.exists():
        return
    res = run_pipeline(str(p))
    assert res['summary']['validation_status'].startswith('BLOCKED_AND_CLEANED')
