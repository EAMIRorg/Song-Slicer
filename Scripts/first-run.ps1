$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RootDir = Resolve-Path (Join-Path $ScriptDir "..")

Set-Location $RootDir

if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
    Write-Error "python not found. Install Python 3 before running this script."
}

if (-not (Test-Path "venv")) {
    python -m venv venv
}

& .\venv\Scripts\python.exe -m pip install --upgrade pip
& .\venv\Scripts\python.exe -m pip install -r requirements.txt

if (-not (Test-Path "node_modules")) {
    npm install
}

Write-Host "First-run setup complete."
