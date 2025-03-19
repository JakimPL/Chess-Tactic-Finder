@echo off
npm install --save chessground

copy node_modules\chessground\assets\chessground.base.css static\css\import\
copy node_modules\chessground\assets\chessground.brown.css static\css\import\
copy node_modules\chessground\assets\chessground.cburnett.css static\css\import\
xcopy /Y node_modules\chessground\dist\*.js static\js\import\
