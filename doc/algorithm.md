# Algorithm for Finding Tactic Puzzles from Chess Games

Learning from your mistakes is a crucial part of your chess development. One way to do that is by analyzing your games to find weak moves from both players, missed opportunities, and, of course, overlooked checkmates.

In some scenarios, tactical elements come into play. By "tactics" I refer to positions where a forced checkmate or a significant material advantage can be gained through a sequence of moves.

A fun way to learn from your mistakes is to turn your game into a puzzle.

## Puzzles

Not every tactical situation qualifies as a puzzle. A puzzle, like every [Daily Puzzle](https://www.chess.com/daily-chess-puzzle), has to met certain conditions.

A good puzzle should meet the following criteria:

-   There is only one correct move each time, and this move should be significantly better than any other alternatives.
-   Each opponent response should be "good enough". Ideally, the opponent should consistently make the best moves possible. Bad puzzles assume bad opponent moves, especially falling into a mating net.
-   It should be clear why the final position is winning. This can involve gaining a material advantage or delivering a checkmate. Occasionally, the goal may be to find a forced draw in a losing position, which is fine too.
-   The starting move cannot be forced (meaning that is there is only one legal move). This simply defeats the purpose of a puzzle.

For the first conditions there some nuances that need to be addressed. There are, roughly speaking, three types of puzzle I consider:

-   Checkmate puzzles
-   Draw puzzles
-   Material advantage puzzles

You may ask about positional advantage puzzles. Unfortunately, this is somehow hard to quantify.

### Checkmate Puzzles

In checkmate puzzles, the player's objective is to find a checkmate. Often, the additional challenge is to find the shortest mate possible, assuming the opponent tries to delay the checkmate. To create a puzzle from a position, each turn should offer only one option for delivering the shortest possible checkmate.

However, [chess.com](chess.com) checkmate puzzles sometimes have a different policy. In some puzzles in each player's turn there is only one move leading to a checkmate and all remaining ones are stepping out of the checkmate, or even losing. I will refer to this type of puzzles as _hard checkmates_.

<img src="/img/doc/mate_in_4.png" alt="Mate in 4" width="360"/>

### Draw Puzzles

Sometimes the goal of the puzzle is to evade being defeated by forcing a draw. This means that the player must find a move that forces a draw in a position where every other move leads to a loss. It does not matter whether the draw is obtained by a perpetual check or a stalemate.

<img src="/img/doc/repetition.png" alt="Repetition" width="360"/>

### Material advantage puzzles

If there is no checkmate involved, it should be rather clear that a final position is winning. This includes gaining a serious material advantage (including promoting a pawn). The position should be somehow resolved, without many threats from both players.

<img src="/img/doc/material_advantage.png" alt="Material advantage" width="360"/>

## Algorithm

Inspired by [chess.com puzzle gathering algorithm](https://www.chess.com/blog/CHESScom/how-we-built-a-puzzle-database-with-half-a-million-puzzles "chess.com puzzle gathering algorithm"), I've developed a simple algorithm with a similar purpose. It walks over [PGN](https://pl.wikipedia.org/wiki/Portable_Game_Notation) files and attempts to find tactic puzzles out of the games. The tactics don't necessarily have to be played as in the actual game; the tool primarily seeks missed opportunities.

In each game position an algorithm tries to find a puzzle that satisfies mentioned conditions.

To evaluate positions, we need a chess engine, and I've chosen [Stockfish](https://stockfishchess.org/), an obvious choice, for two reasons:

-   it is proven to be really strong
-   there are many convenient programming tools communicating with Stockfish

Personally, I write code in Python and it is really easy to use Stockfish via [a library](https://pypi.org/project/stockfish/).

Chess engines use a centipawn unit to represent an advantage of a player, in one 1/100th of a pawn. We will stick to that unit.

### Ok, but how does the algorithm work exactly?

The algorithm builds a tree of positions, or simply: variations. Let us focus on two simple rules that each puzzle needs to have:

-   There should always be only one correct move per position, significantly better than other alternatives
-   The opponent must play accurately.

So, how do we know that there is only one good move in a chess position? This depends on there is a forced mate or not.

#### Forced Mate

Before we discuss the idea, it is good to know the concept of the _checkmate counter_. If you've ever analyzed your game, you've probably come across symbols like M1, M3 or M12, representing the minimal number of moves required to force a checkmate in a position. In such situations we always assume that the opponent always prolongs a checkmate as much as possible.

So, we know that **there is only one good move if there is only one move that decreases the checkmate counter**. This is the purpose of puzzles like _Mate in 2_ or _Mate in 3_. You not only have to checkmate your opponent but also find the shortest route to that goal.

Here's a puzzle in that spirit (mate in 3):

<img src="/img/doc/mate_in_3.png" alt="Mate in 3" width="360"/>

If we talk about _hard checkmates_, the conditions become much simpler: **there should be only one way to deliver a checkmate**. All other moves miss the mate.

<img src="/img/doc/hard_checkmate.png" alt="Hard checkmate" width="360"/>

Sometimes, there is only one correct one move up to a certain point. To include checkmate puzzles that have multiple options towards the end, I decided to allow puzzles where there's substantial progress toward checkmate up to that point. As a rule of thumb I picked a threshold of 50% of moves. In other words, a checkmate puzzle can end before the actual checkmate if more than 50% of the initial moves have a definite answer.

For example, if there is a forced mate in 7 moves, a puzzle needs to have at least 4 moves with only one correct answer.

#### Forced Draw

In some puzzles the objective is to find a draw instead of checkmating the opponent or gaining a material advantage. In these cases, it is demanded that there is only one move that maintains the draw and other ones lead to a loss. A move is considered "losing" if the opponent:

-   Has a forced checkmate.
-   Gains a significant advantage, at least 150 centipawns.

In other words, at each move the evaluation of a top move should be 0 centipawns and every other move should either lead to a checkmate or be evaluated as at least 150 centipawns in favor of the opponent.

#### Other Cases

If there is no checkmate, how do we know that there is only one good move? I came up with a rather simple definition: the evaluation of the top move is considered significantly better than other moves if the evaluation of the best move exceeds the second-best move by a certain threshold: 150 centipawns. If there is only one move, the only one legal move is the only good one. However, as mentioned earlier, the first move should not be forced.

I impose another requirement to fulfill the third condition: the evaluation for a player has to be positive. There is no point of a puzzle if you punish the opponent's mistake and you lose anyway.

<img src="/img/doc/deflection.png" alt="Deflection" width="360"/>

#### Upper Limit

Occasionally, one player might have a substantial advantage over the opponent. But, honestly, I don't see a point of a puzzle that needs you to capitalize an advantage from 2000 centipawns (about 2 queens) to 3000 centipawns if the game is already winning. So I've set an upper limit of 1000 centipawns for a puzzle to avoid such situations, where almost any non-blunder move would suffice.

#### Best Response

We defined the situation when there is only one good move. But what about the opponent's responses?

In cases of forced mate puzzles, the opponent is required to prolong a checkmate as long he can. Of course, sometimes there might be more than one such move. In such cases, each response is considered valid, that is, "good enough".

If there is not a mating net involved, any move that doesn't worsen the position compared to the best move by more than 40 centipawns is allowed. Some suboptimal play is allowed here but the opponent surely won't give up the game entirely. Of course, any blunder that steps into a mate is forbidden. (This does not apply to the last opponent's move before the tactic.)

This provides a clear definition of a "good enough" response.

### Building a Tree

Given a position, the algorithm consequently constructs a tree of variations. For each player's move, it checks if there is only one good move. If yes, then it proceeds to find all "good enough" opponent responses. For each response, the process continues by verifying if there is only one good move and continues to find. And so on.

The algorithm stops either if there is no such move or if the game simply ends. At the end of the process we obtain of a tree of nodes.

```
/c3b3
└── /c3b3/d6d3
└── /c3b3/d6d3/c1c3
└── /c3b3/d6d3/c1c3/d3c3
└── /c3b3/d6d3/c1c3/d3c3/b3c3
└── /c3b3/d6d3/c1c3/d3c3/b3c3/c7e5
├── /c3b3/d6d3/c1c3/d3c3/b3c3/c7e5/c3b3
│ └── /c3b3/d6d3/c1c3/d3c3/b3c3/c7e5/c3b3/e5a1
│ └── /c3b3/d6d3/c1c3/d3c3/b3c3/c7e5/c3b3/e5a1/e3a7
├── /c3b3/d6d3/c1c3/d3c3/b3c3/c7e5/c3c2
│ └── /c3b3/d6d3/c1c3/d3c3/b3c3/c7e5/c3c2/e5a1
│ └── /c3b3/d6d3/c1c3/d3c3/b3c3/c7e5/c3c2/e5a1/e3a7
└── /c3b3/d6d3/c1c3/d3c3/b3c3/c7e5/c3b4
└── /c3b3/d6d3/c1c3/d3c3/b3c3/c7e5/c3b4/e5a1
└── /c3b3/d6d3/c1c3/d3c3/b3c3/c7e5/c3b4/e5a1/e3a7
```

An example tree of nodes in an example. Each move is represented in the [long algebraic notation](<https://en.wikipedia.org/wiki/Algebraic_notation_(chess)#Long_algebraic_notation>) (move format including a starting position of a piece, like e2e4 instead of e4). Here's the corresponding situation:

<img src="/img/doc/situation.png" alt="Situation" width="360"/>

Additionally, at each step, the algorithm determines if a position is **resolved**. Has checkmate been delivered? Is there a stalemate? Is there a draw by threefold repetition? Has a significant material advantage gained? If not, we don't have a puzzle with a clear winning (or drawing) outcome.

This process creates a tree of variations. If there is at least one resolved branch, yes, we have a puzzle! If there are multiple resolved branches, we pick the longest one as potentially more interesting.

Most of the time, there is no puzzle at all. But any time your opponent makes a mistake, falls into a mate, and there is only way to punish that, a puzzle emerges from that position.

**And that's it!** The only thing it remains to walk over all games you have, over all positions you met... This may take some time if we allow Stockfish to think more on moves.

The algorithm is far from being perfect as it is in a very early stage. But still I find it useful enough. As each tactic is saved not only to PGN file but also a data structure that contains:

-   A sequence of all moves with FEN positions.
-   Initial evaluations.
-   A simple classification (checkmate, stalemate, draw by repetition or material advantage).

One can filter some results by imposing additional conditions on tactics. Speaking of which...

## Further Improvements

Not every situation captured by the algorithm results in a good puzzle. There are some improvements that can still to be made.

### Remove Bad/Too Straightforward Puzzles

Sometimes the opponent simply blunders by hanging a piece or even hanging a mate i one. A one-mover problem is usually not interesting and does not provide any challenge. More generally, when the opponent's move is just an obvious blunder, punishing such move may be not a good source for an interesting puzzle.

In other cases, some puzzles are just too straightforward. However, human perception of what is easy to find (and not interesting as such) is rather hard to quantify.

### Classify Puzzles

It would be nice to have a classification of puzzles. Is it a checkmate puzzle? A forced draw puzzle? This part is easily done.

However, identifying the theme of a puzzle is a much more challenging task.

Another classification concerns the puzzle's difficulty level, measuring how challenging a certain puzzle is. This, again, appears to be a demanding problem in its own right.

### Chess Engine Weaknesses

Chess engines, despite their impressive capabilities, aren't perfect. Even when the evaluations are highly accurate, they are still, by nature, heuristics.

Sometimes it is not enough: even the best engines may miss certain checkmates, especially with lower depth values or under time constraints. As the algorithm relies on Stockfish evaluations, one should be careful — sometimes the proposed solution may be not objectively the best one.
