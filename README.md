# _Chess Tactic Finder_

This tool finds chess tactics out of PGN files, including missed ones. A _tactic_ is a puzzle with one correct answer in
each move. The opponent's response is assumed to be "good enough" with a low tolerance of errors.

A puzzle needs to satisfy certain conditions:

* There is only one correct move each time, and this move should be significantly better than any other alternatives.
* Each opponent response should be "good enough". Ideally, the opponent should consistently make the best moves
  possible. Bad puzzles assume bad opponent moves, especially falling into a mating net.
* It should be clear why the final position is winning. This can involve gaining a material advantage or delivering a
  checkmate. Occasionally, the goal may be to find a forced draw in a losing position, which is fine too.
* The starting move cannot be forced (meaning that is there is only one legal move). This simply defeats the purpose of
  a puzzle.

The algorithm tries to retrieve such puzzles from actual games and uses Stockfish to evaluate positions.

Retrieved tactics can be played in the browser via a simple _tactic player_ (see: _Playing tactics_ section).

## Installation and usage

To use _Chess-Tactic-Finder_ you need to have installed Python 3.10 or higher. You can download it
from [here](https://www.python.org/downloads/). You also need to have:

* [Stockfish](https://stockfishchess.org/) installed on your computer.
* [pgn-extract](https://www.cs.kent.ac.uk/people/staff/djb/pgn-extract/) tool downloaded.

### Windows

#### Installation

1. Download and install Python 3.10 or higher from [here](https://www.python.org/downloads/).
2. Download Stockfish from [here](https://stockfishchess.org/download/) to some directory, e.g. `C:\Stockfish`. The
   executable `stockfish-windows-x84-64.exe` (or any other version) should be contained in that folder.
3. Download `pgn-extract` from [here](https://www.cs.kent.ac.uk/people/staff/djb/pgn-extract/). Copy `pgn-extract.exe`
   to the main directory of this tool.
4. Run `run.bat` from Explorer or Launch the command line (`cmd`), proceed to the tool directory and run the
   installation script `run.bat`. This will create a virtual environment and install necessary JavaScript/Python
   dependencies.
5. After the installation, a server will start on `http://localhost:8000/`. After a successful installation you need to
   set a Stockfish executable path in the `Set paths > Stockfish` box. You can also set the path by running:

```batch
python config.py paths.stockfish "C:\Stockfish\stockfish-windows-x84-64.exe"
```

or you can edit `configuration.json` file manually and adjust the path (`/usr/bin/stockfish/` by default).

**Caution**. If you edit the path manually, make sure you use either a slash `/` or double backslash `\\` instead of `\`
in the path, that is:

```json
"stockfish": "C:\\Stockfish\\stockfish-windows-x84-64.exe"
```

#### Usage

After the first installation, you can just run `run.bat` to launch the server. Use _Game analysis_ section to analyze
your games.

The output tactics should be in the folder `tactics` in a directory corresponding to the PGN data. For
example `Player 1 vs Player 2 (2022.02.22) [aa519caa19c5d254aee5d63d626a94bd]`. A PGN file may contain multiple games,
and each game will have its own directory.

To run the tactic player directly, open `http://localhost:8000/chess/tactic.html` in your browser. You can change the port
in `configuration.json`.

### Linux

#### Installation

1. Install Python 3.10 or higher if not installed:
    ```bash
    sudo apt update
    sudo apt install python3
    ```
   Or, if you use an older release of Ubuntu (like 20.04), Python 3.10 may not be available in the repositories. In this
   case, you can use [deadsnakes PPA](https://launchpad.net/~deadsnakes/+archive/ubuntu/ppa):
    ```bash
    sudo add-apt-repository ppa:deadsnakes/ppa
    sudo apt update
    sudo apt install python3.10-full
    ```
2. Install Stockfish:
    ```bash
    sudo apt-get install stockfish
    ```
3. Install `pgn-extract` by
    ```bash
    sudo apt-get install pgn-extract
    ```
   Alternatively, you can download `pgn-extract` manually
   from [here](https://www.cs.kent.ac.uk/people/staff/djb/pgn-extract/). You may copy `pgn-extract` executable to the
   main directory of this tool or set the path to it in `configuration.json`, or by the command:
    ```bash
    python config.py paths.pgn_extract ./pgn-extract
    ```
4. Create a virtual environment, install dependencies and run the server by:
    ```bash
    source run.sh
    ```
   In case of permission error, run `chmod +x run.sh` first.

#### Usage

After the first installation, you can just run `run.sh` to launch the server. Use _Game analysis_ section to analyze
your games.

The output tactics should be in the folder `tactics` in a directory corresponding to the PGN data. For
example `Player 1 vs Player 2 (2022.02.22) [aa519caa19c5d254aee5d63d626a94bd]`. A PGN file may contain multiple games,
and each game will have its own directory.

To run the tactic player directly, open `http://localhost:8000/chess/tactic.html` in your browser. You can change the port
in `configuration.json`.

## Algorithm

The algorithm description is given in the [algorithm.md](/doc/algorithm.md) file.

## Configuration

A _Tactic Finder_ configuration is stored in `configuration.json` file. You can edit it manually or by a command:

```bash
python config.py <key> <value>
```

Use `.` for nested options, for instance `stockfish.depth` to configure Stockfish depth.

### _Tactic Finder_ options

_Tactic Finder_ uses certain thresholds for finding the tactics out of PGN files. Make sure you understand what do the
parameters exactly do. The algorithm within its parameters is described in [algorithm.md](/doc/algorithm.md).

#### Stockfish parameters

The algorithm relies on Stockfish engine to evaluate positions. The main parameters are:

* `stockfish.depth` - Stockfish depth. The higher the depth, the more accurate the evaluation, but the slower the
  algorithm. The default value is `18`.
* `stockfish.top_moves` - the number of top moves to consider. The default value is `5`.

Other parameters are contained in a dictionary `stockfish.parameters`.

#### _Tactic Finder_ parameters

The _Tactic Finder_ algorithm parameters are contained in `algorithm` dictionary. The main parameters are:

* `centipawn_threshold` - the minimum centipawn difference between the best and the second-best moves. This means that
  the only one correct move needs to be better than the second-best move by `centipawn_threshold` centipawns, unless
  there is a forced checkmate. The default value is `150`.
* `centipawn_limit`- the maximum value of centipawns for a position to consider. This prevents finding puzzles where an
  advantage for a player is huge already. The default value is `1000`.
* `centipawn_tolerance` - the allowed difference between the best move and a chosen move for an opponent to play. This
  allows searching for opponent's responses which are not the best move but good enough. The default value is `40`.
* `checkmate_progress_threshold` - the value from 0.0 to 1.0 concerning the minimal fraction of moves . This allows to
  consider checkmate puzzles even if there are multiple correct moves at some point. The default `0.5` requires at least
  half of moves towards the checkpoint to consider a puzzle `mating net`.
* `repetition_threshold` - the number of repetitions required to considered a position a draw (`repetition`) . The
  default value is `2` and it enforces finding only the
* `min_relative_material_balance` - the minimal material difference in points to consider a `material advantage` puzzle.
  The default value is `3`.

## Dependencies

_Chess Tactic Finder_ is primarily based on Stockfish, a UCI chess engine. Stockfish installation process is described
in _Installation_ section. It also uses `pgn-extract` tool to extract UCI moves from PGN files.

Besides that, the package relies on the following packages:

* `anytree`
* `chess`
* `matplotlib`
* `stockfish`
* `tqdm`

Make sure you set the proper paths (see `configuration.json`) to:

* Stockfish engine
* `pgn-extract` tool

The Tactic Player module is solely based on two JavaScript libraries:

* [chessboard.js](https://chessboardjs.com/) for the board
* [chess.js](https://github.com/jhlywa/chess.js/tree/master) for the game logic

with a help of a [`sorttable`](https://www.kryogenix.org/code/browser/sorttable/) library for sorting tables.
