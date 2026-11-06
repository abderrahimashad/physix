#!/usr/bin/env python3
"""Static gates for prepared Google Drive integration (not a live OAuth test)."""
from pathlib import Path
import json
root=Path(__file__).resolve().parents[1]
bridge=(root/"assets/admin-drive.js").read_text(encoding="utf-8")
simple=(root/"assets/admin-simple.js").read_text(encoding="utf-8")
config=(root/"assets/drive-config.js").read_text(encoding="utf-8")
html=(root/"admin.html").read_text(encoding="utf-8")
cfg=json.loads((root/"vercel.json").read_text(encoding="utf-8"))
csp=next(h["value"] for item in cfg["headers"] for h in item["headers"] if h["key"]=="Content-Security-Policy")
files_sql=(root/"supabase/migrations/20261106000500_physix_google_drive_provider_metadata.sql").read_text(encoding="utf-8")
big_sql=(root/"supabase/migrations/20261106000600_physix_google_drive_large_pdf_metadata.sql").read_text(encoding="utf-8")
assert 'clientId:""' in config and 'pickerApiKey:""' in config and 'appId:""' in config
assert "dahim78@gmail.com" in config and "1yMgX32A4in4MqJaOlWkhcQek-3Z_Lcf_" in config
for name in ["1BAC BIOF G1","1BAC BIOF G2","1BAC BIOF G3","2BAC PC BIOF"]:
    assert name in config
assert "https://www.googleapis.com/auth/drive.file" in bridge
assert 'https://www.googleapis.com/auth/drive"' not in bridge
for required in ["expectedEmail","setSelectFolderEnabled(true)","setDeveloperKey","setAppId",
                 "resumable","Content-Range","CHUNK=8*1024*1024",
                 "accessToken=null","authorizedFolders","selectRootFolder(classCode)",
                 "folderId","drive.google.com/file/d/"]:
    assert required in bridge, required
assert "localStorage" not in bridge and "sessionStorage" not in bridge
assert "service_role" not in bridge and "client_secret" not in bridge
assert "permissions.create" not in bridge and "/permissions" not in bridge
assert "drive_file_id:driveFileId" in simple
assert 'storage_provider:driveEnabled?"google_drive":"supabase"' in simple
assert "driveEnabled&&!drive.isConnected()" in simple
assert "classCode:classroom.code" in simple
assert 'storage_provider==="google_drive"' in simple
assert 'src="/assets/drive-config.js"' in html and 'src="/assets/admin-drive.js"' in html
assert html.index('src="/assets/admin-drive.js"') < html.index('src="/assets/admin-simple.js"')
for host in ["https://www.googleapis.com","https://accounts.google.com","https://apis.google.com"]:
    assert host in csp
assert "frame-src" in csp
assert "drive_file_id text" in files_sql and "storage_provider" in files_sql
assert "storage_provider='google_drive'" in big_sql
assert "5497558138880" in big_sql
print("OK — Drive owner upload guarded by explicit OAuth configuration and private metadata")
