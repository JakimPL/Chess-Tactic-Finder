:: installation
if not exist pgn-extract.exe (
	echo "Download pgn-extract.exe before installation!"
) else (
	if not exist "venv" (
		:: create a virtual environment
		py -m ensurepip --upgrade
		pip install virtualenv

		echo "Installing a virtual environment."
		virtualenv venv
		call venv\Scripts\activate

		:: download and install dependencies
		pip install -r requirements.txt
		python config.py paths.pgn_extract pgn-extract.exe
	) else (
		echo "Virtual environment found."
		call venv\Scripts\activate
	)
)
