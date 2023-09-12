## Chess Tactic Finder

This tool finds chess tactics out of PGN files, including missed ones. A tactic is a puzzle with one correct answer in each move. The opponent's response is assumed to be "good enough" with a low tolerance of errors.

A puzzle needs to satisfy certain conditions:
* There is only one correct move each time, and this move should be significantly better than any other alternatives.
*Each opponent response should be "good enough". Ideally, the opponent should consistently make the best moves possible. Bad puzzles assume bad opponent moves, especially falling into a mating net.
* It should be clear why the final position is winning. This can involve gaining a material advantage or delivering a checkmate. Occasionally, the goal may be to find a forced draw in a losing position, which is fine too.
* The starting move cannot be forced (meaning that is there is only one legal move). This simply defeats the purpose of a puzzle.

The algorithm tries to retrieve such puzzles from actual games and uses Stockfish to evaluate positions.

### Usage

To scan the PGN file, use the following:

```bash
python main.py game.pgn
```

The output tactics should be in the folder `tactics` in a directory corresponding to the PGN data. For example `Player 1 vs Player 2 (2022.02.22) [aa519caa19c5d254aee5d63d626a94bd]`. A PGN file may contain multiple games, and each game will have its own directory.

### Dependencies

It relies on the following packages:
* `anytree` 
* `chess`
* `stockfish` which needs Stockfish installed on your computer
* `tqdm`

It also uses `pgn-extract` tool to extract UCI moves from PGN files.

Make sure you set the proper paths (see `configuration.json`) to:
* Stockfish engine
* `pgn-extract` tool

### Playing tactics

After scanning your PGN files, you can play the tactics in the browser. To do so, run the following:

```bash
python play.py
```

The server will be running on `http://localhost:8000/tactic_player.html`. You can change the port in `configuration.json`.

The module is solely based on two JavaScript libraries:
* [chessboard.js](https://chessboardjs.com/) for the board
* [chess.js](https://github.com/jhlywa/chess.js/blob/master/README.md) for the game logic
