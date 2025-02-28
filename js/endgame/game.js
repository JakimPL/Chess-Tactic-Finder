class Game {
    constructor(fen) {
        this.fen = fen
        this.chess = new Chess(fen)
    }

    move(uci) {
        var source = uci.substr(0, 2)
        var target = uci.substr(2, 4)
        return this.chess.move({
            from: source,
            to: target,
            promotion: 'q'
	    })
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
