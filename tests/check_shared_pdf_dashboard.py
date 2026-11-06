#!/usr/bin/env python3
"""Shared PDF, teacher dashboard, and multi-class private publication guardrails."""
from pathlib import Path
root=Path(__file__).resolve().parents[1]
get=lambda name:(root/name).read_text(encoding="utf-8")
pdf=get("assets/admin-simple.js")
students=get("assets/admin-students.js")
dashboard=get("assets/admin-content.js")
drive=get("assets/admin-drive.js")
sql=get("supabase/migrations/20261106202920_physix_share_pdf_across_same_level_classes.sql")
assert 'id="simple-target-classes"' in pdf
assert 'name="target_class"' in pdf
assert 'target_classes,visibility:"private"' in pdf
assert 'level===classroom?.level' in pdf
assert 'target_classes.join(", ")' in pdf
assert 'data-publish-all' in students
assert 'publishForClass(f,code)' in students
assert 'for(const code of classes)' in students
assert 'info.classCodes.includes(code)' in students
assert 'student-admin-section' in students
assert 'px-simple-actions' in dashboard and 'px-simple-secondary' in dashboard
assert "designatedFolders.has(parent)" in drive
assert "chapter_class=any(new.target_classes)" in sql
assert "c.level=chapter_level" in sql and "c.active=true" in sql
assert "count(distinct val)" in sql
print("OK: shared PDF target classes, bulk publishing, simplified dashboard, DB constraints.")
