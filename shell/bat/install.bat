:: create directories
mkdir database
mkdir games
mkdir json
mkdir reviews
mkdir tables
mkdir temp

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
rmdir static\css\import /q
mkdir static\css\import

rmdir static\js\import /q
mkdir static\js\import

curl "https://unpkg.com/@chrisoakman/chessboardjs@1.0.0/dist/chessboard-1.0.0.min.css" > static\css\import\chessboard-1.0.0.min.css

curl "https://code.jquery.com/jquery-3.4.1.min.js" > static\js\import\jquery-3.4.1.min.js
curl "https://unpkg.com/@chrisoakman/chessboardjs@1.0.0/dist/chessboard-1.0.0.min.js" > static\js\import\chessboard-1.0.0.min.js
curl "https://cdnjs.cloudflare.com/ajax/libs/chess.js/0.10.2/chess.js" > static\js\import\chess.js
curl "https://unpkg.com/chess-pgn-parser@1.3.9/dist/parser.js" > static\js\import\parser.js
curl -o static\js\import\sorttable.zip "https://www.kryogenix.org/code/browser/sorttable/sorttable.zip"
"C:\Program Files\7-Zip\7z.exe" x static\js\import\sorttable.zip -ostatic\js\import\ -aos
del static\js\import\sorttable.zip

:: install syzygy tablebases
echo Downloading Syzygy tablebases.
set layouts=KBBvK KBNvK KBvK KBvKB KBvKN KBvKP KNvK KNvKN KNvKP KPvK KPvKP KQvK KQvKB KQvKN KQvKP KQvKQ KQvKR KRRvK KRvK KRvKB KRvKN KRvKP KRvKR
rmdir /s /q tables\syzygy
mkdir tables\syzygy
for %%l in (%layouts%) do (
    curl -o tables\syzygy\%%l.rtbz "https://tablebase.lichess.ovh/tables/standard/3-4-5-dtz/%%l.rtbz"
    curl -o tables\syzygy\%%l.rtbw "https://tablebase.lichess.ovh/tables/standard/3-4-5-wdl/%%l.rtbw"
)

:: install gaviota tablebases
rmdir /s /q tables\gaviota
mkdir tables\gaviota
curl -o tables\gaviota\3.7z "https://chess.cygnitec.com/tablebases/gaviota/3/3.7z"
curl -o tables\gaviota\4.7z "https://chess.cygnitec.com/tablebases/gaviota/4/4.7z"

"C:\Program Files\7-Zip\7z.exe" x tables\gaviota\3.7z -otables\gaviota -aos
"C:\Program Files\7-Zip\7z.exe" x tables\gaviota\4.7z -otables\gaviota -aos
move tables\gaviota\3\*.cp4 tables\gaviota\
move tables\gaviota\4\*.cp4 tables\gaviota\
rmdir /s /q tables\gaviota\3
rmdir /s /q tables\gaviota\4

del tables\gaviota\*.7z

:: install chessground
echo Installing Chessground.
call shell\bat\chessground.bat
