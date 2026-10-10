# Virasat Backend Dev Server Launcher (PowerShell)
$ErrorActionPreference = "Stop"

Write-Host "Starting Virasat backend server..." -ForegroundColor Cyan
if (Test-Path ".\.venv\Scripts\uvicorn.exe") {
    .\.venv\Scripts\uvicorn.exe app.main:app --reload --port 8000
} else {
    uvicorn app.main:app --reload --port 8000
}
