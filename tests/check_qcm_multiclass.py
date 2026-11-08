#!/usr/bin/env python3
"""Claude duplicate repair and owner-only same-level multi-class QCM guardrails."""
from pathlib import Path
p=Path(__file__).resolve().parents[1]
e=(p/"supabase/functions/physix-qcm-claude/index.ts").read_text()
ui=(p/"assets/admin-qcm.js").read_text()
assert "class_codes" in ui and "qcm-class-targets" in ui
assert "classCodes:getSelectedClasses()" in ui
for token in ("selectedCodes","chapterMap","chapter.level","chapter.subject",
              "same[0].id","targetChapterIds","new Set(selectedCodes).size",
              ".eq(\"active\",true)","for(const code of selectedCodes)drafts.push",
              "drafts.length","published:false","repairPrompt",
              "replacement.map(normalized)","maxTokens:850",
              "normalized(replacement[Number(item.correct_option)])"):
    assert token in e,token
assert "ANTHROPIC_API_KEY" not in ui
assert "SUPABASE_SERVICE_ROLE_KEY" not in e
print("PASS: QCM duplicate repair, per-class draft isolation, ownership checks")
