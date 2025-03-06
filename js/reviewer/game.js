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
        this.turn = this.getTurn()
        this.fens = this.getFENs()
    }

    forward() {
        if (this.moveIndex < this.moves.length - 1) {
            this.moveIndex++
            return this.moves[this.moveIndex]
        }

        return null
    }

    backward() {
        if (this.moveIndex >= 0) {
            this.moveIndex--
            return this.moves[this.moveIndex]
        }

        return null
    }

    goTo(moveIndex) {
        if (moveIndex >= 0 && moveIndex < this.moves.length) {
            this.moveIndex = moveIndex
            return this.moves[this.moveIndex]
        }

        return null
    }

    getTurn() {
        var chess = new Chess(this.fen)
        return chess.turn()
    }

    getFENs() {
        var chess = new Chess(this.fen)
        var fens = [this.fen]
        for (const move of this.moves) {
            chess.move(move)
            fens.push(chess.fen())
        }

        return fens
    }

    getFEN() {
        return this.fens[this.moveIndex + 1]
    }
}
