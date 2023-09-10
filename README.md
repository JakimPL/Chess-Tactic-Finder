## Chess Tactic Finder

This tool finds chess tactics out of PGN files, including missed ones. A tactic is a puzzle with one correct answer in each move. The opponent's response is assumed to be "good enough" with a low tolerance of errors.

A puzzle needs to satisfy certain conditions:
* There is only one correct move each time, and this move should be significantly better than any other alternatives.
*Each opponent response should be "good enough". Ideally, the opponent should consistently make the best moves possible. Bad puzzles assume bad opponent moves, especially falling into a mating net.
* It should be clear why the final position is winning. This can involve gaining a material advantage or delivering a checkmate. Occasionally, the goal may be to find a forced draw in a losing position, which is fine too.
* The starting move cannot be forced (meaning that is there is only one legal move). This simply defeats the purpose of a puzzle.

The algorithm tries to retrieve such puzzles from actual games and uses Stockfish to evaluate positions.

### Dependencies

It relies on the following packages:
* `chess`
* `stockfish` which needs Stockfish installed on your computer

It also uses `pgn-extract` tool to extract UCI moves from PGN files.

Make sure you set the proper paths (see `configuration.json`) to:
* Stockfish engine
* `pgn-extract` tool