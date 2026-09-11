param(
    [int]$Port = 8091,
    [string]$Python = "python"
)
$ErrorActionPreference = "Stop"
Set-Location -LiteralPath $PSScriptRoot
$RuntimePython = Join-Path $PSScriptRoot ".venv\Scripts\python.exe"
if (-not (Test-Path -LiteralPath $RuntimePython)) {
    & $Python -m venv .venv
    if ($LASTEXITCODE -ne 0) { throw "Could not create the Python environment." }
}
& $RuntimePython -m pip install -r requirements.lock
if ($LASTEXITCODE -ne 0) { throw "Could not install dependencies." }
Write-Host "AgentFlow: http://127.0.0.1:$Port"
& $RuntimePython -m uvicorn backend.app:app --host 127.0.0.1 --port $Port
exit $LASTEXITCODE
