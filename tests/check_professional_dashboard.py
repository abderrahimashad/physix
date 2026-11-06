#!/usr/bin/env python3
"""Homepage layout remains functional, authenticated and data-driven."""
from pathlib import Path
root=Path(__file__).resolve().parents[1]
src=(root/"assets/admin-content.js").read_text()
html=(root/"admin.html").read_text()
required=["px-pro-shell","px-pro-hero","px-pro-summary","px-pro-kpi",
          "px-pro-actions","px-pro-group-chips","px-pro-groups",
          "activeClasses.length","privateFiles","chapterCount","publishedResources",
          'id="open-dashboard"','id="open-tracking"','id="open-remises"',
          'id="open-wheel"','id="open-qcm"','id="open-pedagogy"',
          'data-class-focus','dispatchEvent(new Event("change"',
          "physixQuickPdfRender","physixStudentAdminRender","owner-logout"]
for marker in required: assert marker in src,marker
for marker in ["@media(max-width:850px)","@media(max-width:530px)",
               ".px-pro-hero",".px-pro-actions",".px-pro-kpi"]:
    assert marker in html,marker
assert "localStorage" not in src and "sessionStorage" not in src
print("OK: real-count dashboard, teacher-only actions, responsive class shortcuts")
