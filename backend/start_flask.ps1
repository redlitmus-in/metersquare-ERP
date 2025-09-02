# PowerShell script to start Flask with proper Python path

$pythonPath = "C:\Users\meganathan.s\AppData\Local\Programs\Python\Python312\python.exe"

Write-Host "Starting Flask Development Server..." -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Green
Write-Host ""

# Set Flask environment variables
$env:FLASK_APP = "app.py"
$env:FLASK_ENV = "development"
$env:FLASK_DEBUG = "1"

Write-Host "Flask App: app.py" -ForegroundColor Cyan
Write-Host "Environment: development" -ForegroundColor Cyan
Write-Host "Debug Mode: ON" -ForegroundColor Cyan
Write-Host ""
Write-Host "Server will start at: http://localhost:5000" -ForegroundColor Yellow
Write-Host "Press CTRL+C to stop the server" -ForegroundColor Yellow
Write-Host ""

# Run Flask
& $pythonPath -m flask run --host=0.0.0.0 --port=5000