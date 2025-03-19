#!/bin/bash

npm install --save chessground

cp node_modules/chessground/assets/chessground.base.css static/css/import/
cp node_modules/chessground/assets/chessground.brown.css static/css/import/
cp node_modules/chessground/assets/chessground.cburnett.css static/css/import/
cp -r node_modules/chessground/dist/*.js static/js/import/
