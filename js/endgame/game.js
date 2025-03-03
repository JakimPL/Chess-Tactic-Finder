class Game {
    constructor(fen, dtz) {
        this.fen = fen
        this.chess = new Chess(fen)
        this.states = [new State(fen, dtz, null)]
        this.currentMove = 0
    }

    move(uci, dtz) {
        var source = uci.substr(0, 2)
        var target = uci.substr(2, 4)
        var move = this.chess.move({
            from: source,
            to: target,
            promotion: 'q'
	    })

        if (move != null) {
            if (!this.isLastMove()) {
                this.truncate()
            }
            this.states.push(new State(this.chess.fen(), dtz, move))
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
        if (!this.isLastMove()) {
            var move = this.states[this.currentMove + 1].move
            this.chess.move(move)
            this.currentMove++
            return true
        }

        return false
    }

    truncate() {
        this.states = this.states.slice(0, this.currentMove + 1)
    }

    isOver() {
        return this.chess.game_over()
    }

    getResult() {
        if (this.isOver()) {
            if (this.chess.in_draw()) {
                return '½-½'
            } else if (this.chess.in_checkmate()) {
                return this.chess.turn() == 'w' ? '0-1' : '1-0'
            }
        }
    }

    getTurn() {
        return this.chess.turn()
    }

    getFEN() {
        return this.chess.fen()
    }

    isLastMove() {
        return this.currentMove == this.states.length - 1
    }

    getDTZ() {
        return this.states[this.currentMove].dtz
    }

    updateDTZ(dtz) {
        this.states[this.currentMove].dtz = dtz
    }
}
