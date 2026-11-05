#!/usr/bin/env python3
"""Contrôles statiques non suffisants pour certifier les permissions Supabase."""
from pathlib import Path
import re

sql = Path(__file__).resolve().parents[1].joinpath(
    "supabase/migrations/20261105000100_physix_owner_content.sql"
).read_text(encoding="utf-8")
tables = (
    "physix_owners", "physix_chapters", "physix_resources",
    "physix_devoirs", "physix_resource_files"
)
for table in tables:
    assert re.search(
        rf"alter table public\.{table}\s+enable row level security", sql, re.I
    ), f"RLS manquant pour {table}"

for table in tables[1:]:
    assert re.search(
        rf"create policy physix_\w+_owner on public\.{table}", sql, re.I
    ), f"Policy propriétaire manquante pour {table}"

assert "for all to authenticated" in sql.lower()
assert "private.physix_is_owner" in sql
assert "on conflict (id) do update set public=false" in sql
assert "grant select,insert,update,delete" in sql.lower()
assert "storage.buckets" in sql
assert "insert into storage.objects" not in sql.lower()
assert "create policy" not in sql.lower().split("-- bucket privé uniquement.")[-1], (
    "Aucune policy Storage n'est prévue dans ce lot"
)
print("OK : contrats statiques présents. Tests RLS sur vrai Supabase toujours requis.")
