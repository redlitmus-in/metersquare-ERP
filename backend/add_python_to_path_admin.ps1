# Run this script as Administrator to permanently add Python to PATH

# Check if running as administrator
if (-NOT ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator"))
{
    Write-Host "This script needs to be run as Administrator!" -ForegroundColor Red
    Write-Host "Right-click PowerShell and select 'Run as Administrator'" -ForegroundColor Yellow
    pause
    exit
}

Write-Host "Adding Python to System PATH permanently..." -ForegroundColor Green

$pythonPath = "C:\Users\meganathan.s\AppData\Local\Programs\Python\Python312"
$scriptsPath = "C:\Users\meganathan.s\AppData\Local\Programs\Python\Python312\Scripts"

# Get current PATH
$currentPath = [Environment]::GetEnvironmentVariable("Path", [System.EnvironmentVariableTarget]::Machine)

# Check if Python is already in PATH
if ($currentPath -like "*$pythonPath*") {
    Write-Host "Python is already in PATH" -ForegroundColor Yellow
} else {
    # Add Python to PATH
    $newPath = $currentPath + ";" + $pythonPath + ";" + $scriptsPath
    [Environment]::SetEnvironmentVariable("Path", $newPath, [System.EnvironmentVariableTarget]::Machine)
    Write-Host "Python added to PATH successfully!" -ForegroundColor Green
    Write-Host "Please restart PowerShell for changes to take effect." -ForegroundColor Yellow
}

# Also set for current session
$env:Path = $pythonPath + ";" + $scriptsPath + ";" + $env:Path

Write-Host "`nTesting Python..." -ForegroundColor Cyan
python --version
pip --version

Write-Host "`nPython PATH configuration complete!" -ForegroundColor Green
Write-Host "You may need to restart PowerShell or your computer for changes to take full effect." -ForegroundColor Yellow
pause