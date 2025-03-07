#!/bin/bash
mkdir -p database
mkdir -p games
mkdir -p json
mkdir -p reviews
mkdir -p tables
mkdir -p temp

# create a virtual environment
echo "Installing a virtual environment."
python3.10 -m venv venv
source venv/bin/activate

# download and install dependencies
echo "Installing Python dependencies."
pip install -r requirements.txt

# download js scripts
echo "Downloading JavaScript scripts."
rm static/css/import -rf
mkdir static/css/import

rm static/js/import -rf
mkdir static/js/import

wget -P static/css/import/ "https://unpkg.com/@chrisoakman/chessboardjs@1.0.0/dist/chessboard-1.0.0.min.css"

wget -P static/js/import/ "https://code.jquery.com/jquery-3.4.1.min.js"
wget -P static/js/import/ "https://unpkg.com/@chrisoakman/chessboardjs@1.0.0/dist/chessboard-1.0.0.min.js"
wget -P static/js/import/ "https://cdnjs.cloudflare.com/ajax/libs/chess.js/0.10.2/chess.js"
wget -P static/js/import/ "https://unpkg.com/chess-pgn-parser@1.3.9/dist/parser.js"
wget -P static/js/import/ "https://www.kryogenix.org/code/browser/sorttable/sorttable.js"

# install syzygy tablebases
echo "Downloading Syzygy tablebases."
layouts=("KRvK" "KQvK" "KPvK" "KRRvK" "KBBvK" "KBNvK" "KQvKR" "KQvKN" "KQvKB")
rm tables/syzygy -rf
mkdir tables/syzygy
for layout in "${layouts[@]}"; do
    wget -P tables/syzygy "https://tablebase.lichess.ovh/tables/standard/3-4-5-dtz/${layout}.rtbz"
    wget -P tables/syzygy "https://tablebase.lichess.ovh/tables/standard/3-4-5-wdl/${layout}.rtbw"
done

# install gaviota tablebases
rm tables/gaviota -rf
mkdir tables/gaviota
wget -P tables/gaviota "https://chess.cygnitec.com/tablebases/gaviota/3/3.7z"
wget -P tables/gaviota "https://chess.cygnitec.com/tablebases/gaviota/4/4.7z"

7z x tables/gaviota/3.7z -otables/gaviota
7z x tables/gaviota/4.7z -otables/gaviota

rm tables/gaviota/*.7z
