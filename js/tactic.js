class Tactic {
    constructor(pgn) {
        this.gameJSON = JSON.parse(parser.pgn2json(pgn))
        this.base_pgn = pgn
        this.base_fen = this.gameJSON['str']['FEN']
        this.moves = this.gameJSON['moves']
        this.turn = ''
        this.fen = this.get_fen()
        this.pgn = this.get_pgn()

        this.moveIndex = 0
        this.firstMove = this.moves[0]
        this.nextMove = this.forward()

        this.solved = false
    }

    forward() {
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

    backward() {
        if (this.moveIndex > 0) {
            this.solved = false
            this.moveIndex--
            var move = this.moves[this.moveIndex]
            this.nextMove = move
            return move
        }

        return null
    }

    get_fen() {
        var chess = new Chess(this.base_fen)
        chess.move(this.moves[0])

        this.turn = chess.turn()

        var fen = chess.fen()
        return fen
    }

    get_pgn() {
        var chess = new Chess(this.fen)
        for (const move of this.moves.slice(1)) {
            chess.move(move)
        }

        var pgn = chess.pgn()
        return pgn
    }
}
