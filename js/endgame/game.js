class Game {
    constructor(fen) {
        this.fen = fen
        this.chess = new Chess(fen)
        this.moves = []
        this.currentMove = 0
    }

    move(uci) {
        var source = uci.substr(0, 2)
        var target = uci.substr(2, 4)
        var move = this.chess.move({
            from: source,
            to: target,
            promotion: 'q'
	    })

        if (move != null) {
            this.moves = this.moves.slice(0, this.currentMove)
            this.moves.push(move)
            this.currentMove++
        }

        return move
    }

    backward() {
        if (this.currentMove > 0) {
            this.chess.undo()
            this.currentMove--
            return true
        }

        return false
    }

    forward() {
        if (this.currentMove < this.moves.length) {
            var move = this.moves[this.currentMove]
            this.chess.move(move)
            this.currentMove++
            return true
        }

        return false
    }

    isOver() {
        return this.chess.game_over()
    }

    getTurn() {
        return this.chess.turn()
    }

    getFEN() {
        return this.chess.fen()
    }
}
