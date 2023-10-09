@echo off
call venv\Scripts\activate
python %1 %2
echo The analysis exited with status %ERRORLEVEL%. Press Enter to close the terminal.
pause >nul
