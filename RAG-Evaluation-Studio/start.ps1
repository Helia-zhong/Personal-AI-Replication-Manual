$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$python = if (Test-Path "$projectRoot\.venv\Scripts\python.exe") { "$projectRoot\.venv\Scripts\python.exe" } else { "python" }
& $python -m uvicorn app:app --app-dir "$projectRoot\backend" --host 127.0.0.1 --port 8030
