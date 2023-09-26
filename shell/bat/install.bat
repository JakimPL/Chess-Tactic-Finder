:: download pgn-extract
if not exist pgn-extract.exe (
	echo Downloading pgn-extract.exe.
	curl "https://www.cs.kent.ac.uk/people/staff/djb/pgn-extract/pgn-extract.exe" > pgn-extract.exe
)

:: create a virtual environment
echo Installing a virtual environment.
py -m ensurepip --upgrade
pip install virtualenv

python -m virtualenv venv
call venv\Scripts\activate

:: download and install dependencies
echo Installing Python dependencies.
pip install -r requirements.txt
python config.py paths.stockfish C:\Stockfish\stockfish-windows-x86-64.exe
python config.py paths.pgn_extract pgn-extract.exe

:: download js scripts
echo Downloading JavaScript scripts.
rmdir css\import /q
mkdir css\import

rmdir js\import /q
mkdir js\import

curl "https://unpkg.com/@chrisoakman/chessboardjs@1.0.0/dist/chessboard-1.0.0.min.css" > css\import\chessboard-1.0.0.min.css
curl "https://code.jquery.com/jquery-3.4.1.min.js" > js\import\jquery-3.4.1.min.js
curl "https://unpkg.com/@chrisoakman/chessboardjs@1.0.0/dist/chessboard-1.0.0.min.js" > js\import\chessboard-1.0.0.min.js
curl "https://cdnjs.cloudflare.com/ajax/libs/chess.js/0.10.2/chess.js" > js\import\chess.js
curl "https://unpkg.com/chess-pgn-parser@1.3.9/dist/parser.js" > js\import\parser.js
curl "https://www.kryogenix.org/code/browser/sorttable/sorttable.js" > js\import\sorttable.js
