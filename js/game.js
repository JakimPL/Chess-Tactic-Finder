class Game {
    constructor(pgn) {
        this.gameJSON = JSON.parse(parser.pgn2json(pgn))

        this.pgn = pgn
        if (this.gameJSON['str']['FEN'] != null) {
            this.fen = this.gameJSON['str']['FEN']
        } else {
            this.fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
        }

        this.moveIndex = -1
        this.moves = this.gameJSON['moves']
    }

    forward() {
        if (this.moveIndex < this.moves.length - 1) {
            this.moveIndex++
            var move = this.moves[this.moveIndex]
            this.nextMove = move
            return move
        }

        return null
    }

    backward() {
        if (this.moveIndex >= 0) {
            this.moveIndex--
            var move = this.moves[this.moveIndex]
            this.nextMove = move
            return move
        }

        return null
    }
}
