@echo off
if not exist "venv" (
	call shell\bat\install.bat
    python run.py
) else (
	echo Virtual environment found.
	call venv\Scripts\activate
    python run.py
)
