@echo off
echo Adding Python to System PATH...
echo.

REM Add Python to the current session
set PATH=C:\Users\meganathan.s\AppData\Local\Programs\Python\Python312;C:\Users\meganathan.s\AppData\Local\Programs\Python\Python312\Scripts;%PATH%

REM Add Python to system PATH permanently (requires admin privileges)
echo To add Python to PATH permanently, run this command as Administrator:
echo.
echo setx /M PATH "C:\Users\meganathan.s\AppData\Local\Programs\Python\Python312;C:\Users\meganathan.s\AppData\Local\Programs\Python\Python312\Scripts;%%PATH%%"
echo.
echo Or you can add it manually through:
echo 1. Right-click 'This PC' or 'My Computer'
echo 2. Click 'Properties'
echo 3. Click 'Advanced system settings'
echo 4. Click 'Environment Variables'
echo 5. Under 'System variables', find and select 'Path', then click 'Edit'
echo 6. Click 'New' and add these paths:
echo    - C:\Users\meganathan.s\AppData\Local\Programs\Python\Python312
echo    - C:\Users\meganathan.s\AppData\Local\Programs\Python\Python312\Scripts
echo 7. Click 'OK' on all windows
echo 8. Restart your terminal/command prompt
echo.
echo Testing Python...
python --version
pip --version
echo.
pause