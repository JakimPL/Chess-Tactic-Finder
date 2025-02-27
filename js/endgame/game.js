class Game {
    constructor(fen) {
        this.fen = fen
        this.chess = new Chess(fen)
    }

    move(move) {
        return this.chess.move(move)
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
