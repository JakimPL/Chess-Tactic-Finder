class Tactic {
    getNextMove() {
        if (this.moveIndex < this.moves.length - 1) {
            this.moveIndex++
            var move = this.moves[this.moveIndex]
            this.nextMove = move
            return move
        } else {
            this.solved = true
        }

        return null
    }

    constructor(pgn) {
        this.pgn = pgn
        this.gameJSON = JSON.parse(parser.pgn2json(pgn))
        this.fen = this.gameJSON['str']['FEN']
        this.moves = this.gameJSON['moves']
        this.firstMove = this.moves[0]

        this.moveIndex = 0
        this.nextMove = this.getNextMove()

        this.solved = false
    }
}
