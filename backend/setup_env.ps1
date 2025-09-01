# PowerShell script to set up Python environment for current session

Write-Host "Setting up Python environment..." -ForegroundColor Green

# Add Python to PATH for current session
$env:Path = "C:\Users\meganathan.s\AppData\Local\Programs\Python\Python312;C:\Users\meganathan.s\AppData\Local\Programs\Python\Python312\Scripts;" + $env:Path

Write-Host "Python PATH added for current session" -ForegroundColor Yellow

# Test Python
Write-Host "`nTesting Python installation:" -ForegroundColor Cyan
python --version
pip --version

Write-Host "`nYou can now use these commands:" -ForegroundColor Green
Write-Host "  python app.py        - Run the backend server"
Write-Host "  python -m flask run  - Run Flask development server"
Write-Host "  pip list            - List installed packages"

Write-Host "`nNote: This only works for the current PowerShell session." -ForegroundColor Yellow
Write-Host "To make it permanent, run this as Administrator:" -ForegroundColor Yellow
Write-Host '[Environment]::SetEnvironmentVariable("Path", $env:Path + ";C:\Users\meganathan.s\AppData\Local\Programs\Python\Python312;C:\Users\meganathan.s\AppData\Local\Programs\Python\Python312\Scripts", [System.EnvironmentVariableTarget]::Machine)' -ForegroundColor Cyan