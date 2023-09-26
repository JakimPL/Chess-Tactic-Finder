:: installation
@echo off
if not exist pgn-extract.exe (
	echo Downloading pgn-extract.exe.
	curl "https://www.cs.kent.ac.uk/people/staff/djb/pgn-extract/pgn-extract.exe" > pgn-extract.exe
)

if not exist "venv" (
	call shell\bat\install.bat
    python run.py
) else (
	echo Virtual environment found.
	call venv\Scripts\activate
    python run.py
)
