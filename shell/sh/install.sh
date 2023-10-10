#!/bin/bash

# create a virtual environment
echo "Installing a virtual environment."
python3.10 -m venv venv
source venv/bin/activate

# download and install dependencies
echo "Installing Python dependencies."
pip install -r requirements.txt

# download js scripts
echo "Downloading JavaScript scripts."
rm css/import -rf
mkdir css/import

rm js/import -rf
mkdir js/import

wget -P css/import/ "https://unpkg.com/@chrisoakman/chessboardjs@1.0.0/dist/chessboard-1.0.0.min.css"
wget -P css/import/ "https://raw.githubusercontent.com/mcba1n/chessboard-arrows/master/chessboard-arrows.css"

wget -P js/import/ "https://code.jquery.com/jquery-3.4.1.min.js"
wget -P js/import/ "https://unpkg.com/@chrisoakman/chessboardjs@1.0.0/dist/chessboard-1.0.0.min.js"
wget -P js/import/ "https://cdnjs.cloudflare.com/ajax/libs/chess.js/0.10.2/chess.js"
wget -P js/import/ "https://unpkg.com/chess-pgn-parser@1.3.9/dist/parser.js"
wget -P js/import/ "https://www.kryogenix.org/code/browser/sorttable/sorttable.js"
wget -P js/import/ "https://raw.githubusercontent.com/mcba1n/chessboard-arrows/master/chessboard-arrows.js"
