@echo off
call venv\Scripts\activate
python analyze.py %1
echo The analysis exited with status %ERRORLEVEL%. Press Enter to close the terminal.
pause >nul
