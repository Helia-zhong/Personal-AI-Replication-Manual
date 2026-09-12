param(
    [string]$Python = "python",
    [int]$Port = 8060
)
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot
if (Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue) {
    throw "Port $Port is in use. Choose another port with -Port."
}
$routerPython = Join-Path $PSScriptRoot ".venv/Scripts/python.exe"
if (-not (Test-Path $routerPython)) {
    & $Python -m venv .venv
    if ($LASTEXITCODE -ne 0) { throw "Virtual environment creation failed." }
}
& $routerPython -m pip install -r requirements.lock
if ($LASTEXITCODE -ne 0) { throw "Dependency installation failed." }
Write-Host "Model Router Sandbox: http://127.0.0.1:$Port/"
& $routerPython -m uvicorn backend.app:app --host 127.0.0.1 --port $Port
