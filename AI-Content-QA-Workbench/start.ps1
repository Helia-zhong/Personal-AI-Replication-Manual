param(
    [string]$Python = "python",
    [int]$Port = 8050
)
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot
if (Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue) {
    throw "Port $Port is in use. Choose another port with -Port."
}
$qaPython = Join-Path $PSScriptRoot ".venv/Scripts/python.exe"
if (-not (Test-Path $qaPython)) {
    & $Python -m venv .venv
    if ($LASTEXITCODE -ne 0) { throw "Virtual environment creation failed." }
}
& $qaPython -m pip install -r requirements.lock
if ($LASTEXITCODE -ne 0) { throw "Dependency installation failed." }
Write-Host "AI Content QA Workbench: http://127.0.0.1:$Port/"
& $qaPython -m uvicorn backend.app:app --host 127.0.0.1 --port $Port
