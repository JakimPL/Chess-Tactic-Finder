
# Chess Tactic Finder  
  
This tool finds chess tactics out of PGN files, including missed ones. A _tactic_ is a puzzle with one correct answer in each move. The opponent's response is assumed to be "good enough" with a low tolerance of errors.  
  
A puzzle needs to satisfy certain conditions:  
* There is only one correct move each time, and this move should be significantly better than any other alternatives.  
* Each opponent response should be "good enough". Ideally, the opponent should consistently make the best moves possible. Bad puzzles assume bad opponent moves, especially falling into a mating net.  
* It should be clear why the final position is winning. This can involve gaining a material advantage or delivering a checkmate. Occasionally, the goal may be to find a forced draw in a losing position, which is fine too.  
* The starting move cannot be forced (meaning that is there is only one legal move). This simply defeats the purpose of a puzzle.  
  
The algorithm tries to retrieve such puzzles from actual games and uses Stockfish to evaluate positions.   
  
Retrieved tactics can be played in the browser via a simple _tactic player_ (see: _Playing tactics_ section).  
  
## Installation and usage
  
To use _Chess-Tactic-Finder_ you need to have installed Python 3.10 or higher. You can download it from [here](https://www.python.org/downloads/). You also need to have:  
* [Stockfish](https://stockfishchess.org/) installed on your computer.  
* [pgn-extract](https://www.cs.kent.ac.uk/people/staff/djb/pgn-extract/) tool downloaded.  
  
### Windows

#### Installation
  
1. Download and install Python 3.10 or higher from [here](https://www.python.org/downloads/).  
2. Download Stockfish from [here](https://stockfishchess.org/download/) to some directory, e.g. `C:\Stockfish`. The executable `stockfish-windows-x84-64.exe` (or any other version) should be contained in that folder.  
3. Download `pgn-extract` from [here](https://www.cs.kent.ac.uk/people/staff/djb/pgn-extract/). Copy `pgn-extract.exe` to the main directory of this tool. 
4. Launch the command line (`cmd`), proceed to the tool directory and run the installation script `run.bat`. For the first time, it will install a virtual environment and install necessary Python dependencies.
5. After a successful installation you need to set a Stockfish executable path: `python config.py paths.stockfish [executable path]`, e.g.:
```batch
python config.py paths.stockfish "C:\Stockfish\stockfish-windows-x84-64.exe"  
```
or you can edit `configuration.json` file manually and adjust the path (`/usr/bin/stockfish/` by default).

#### Usage

You can run the analysis by:
```batch
python main.py game.pgn  
```
assuming `game.pgn` is a PGN file of a game (or multiple games). The output tactics should be in the folder `tactics` in a directory corresponding to the PGN data. For example `Player 1 vs Player 2 (2022.02.22) [aa519caa19c5d254aee5d63d626a94bd]`. A PGN file may contain multiple games, and each game will have its own directory.

To run the tactic player, run:
```batch
python play.py
```

and open `http://localhost:8000/tactic_player.html` in your browser. You can change the port in `configuration.json`.

### Linux

#### Installation

1. Install Python 3.10 or higher if not installed:
    ```bash
    sudo apt update
    sudo apt install python3
    ```  
    Or, if you use an older release of Ubuntu (like 20.04), Python 3.10 may not be available in the repositories. In this case, you can use [deadsnakes PPA](https://launchpad.net/~deadsnakes/+archive/ubuntu/ppa):
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
   Alternatively, you can download `pgn-extract` manually from [here](https://www.cs.kent.ac.uk/people/staff/djb/pgn-extract/). You may copy `pgn-extract` executable to the main directory of this tool or set the path to it in `configuration.json`, or by the command:
    ```bash
    python config.py paths.pgn_extract ./pgn-extract
    ```
4. Create a virtual environment by running:
    ```bash
    # chmod +x run.sh in case of permission error
    ./run.sh
    ``` 
5. Run the virtual environment:
    ```bash
    source venv/bin/activate
    ```

#### Usage

To run the analysis, run:
```bash  
python main.py games.pgn
```  

assuming `game.pgn` is a PGN file of a game (or multiple games). The output tactics should be in the folder `tactics` in a directory corresponding to the PGN data. For example `Player 1 vs Player 2 (2022.02.22) [aa519caa19c5d254aee5d63d626a94bd]`. A PGN file may contain multiple games, and each game will have its own directory.

To run the tactic player, run:
```batch
python play.py
```

and open `http://localhost:8000/tactic_player.html` in your browser. You can change the port in `configuration.json`.

## Dependencies  
  
_Chess Tactic Finder_ is primarily based on Stockfish, a UCI chess engine. Stockfish installation process is described in _Installation_ section. It also uses `pgn-extract` tool to extract UCI moves from PGN files.    
  
Besides that, the package relies on the following packages:  
* `anytree`
* `chess`  
* `stockfish`  
* `tqdm`
  
Make sure you set the proper paths (see `configuration.json`) to:  
* Stockfish engine  
* `pgn-extract` tool  
  
### Playing tactics  
  
After scanning your PGN files, you can play the tactics in the browser. To do so, run the following (in the virtual environment): 
  
```bash  
python play.py
```  
  
The server will be running on `http://localhost:8000/tactic_player.html`. You can change the port in `configuration.json`.  
  
The module is solely based on two JavaScript libraries:  
* [chessboard.js](https://chessboardjs.com/) for the board  
* [chess.js](https://github.com/jhlywa/chess.js/blob/master/README.md) for the game logic  
  
with a help of a [`sorttable`](https://www.kryogenix.org/code/browser/sorttable/) library for sorting tables.
