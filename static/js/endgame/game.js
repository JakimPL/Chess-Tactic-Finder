class Game {
    constructor(fen, dtm) {
        this.fen = fen;
        this.chess = new Chess(fen);
        this.states = [new State(fen, dtm, null)];
        this.currentMove = 0;
    }

    move(uci, dtm) {
        const source = uci.substr(0, 2);
        const target = uci.substr(2, 4);
        const move = this.chess.move({
            from: source,
            to: target,
            promotion: "q",
        });

        if (move != null) {
            if (!this.isLastMove()) {
                this.truncate();
            }
            this.states.push(new State(this.chess.fen(), dtm, move));
            this.currentMove++;
        }

        return move;
    }

    backward() {
        if (this.currentMove > 0) {
            this.chess.undo();
            this.currentMove--;
            return true;
        }

        return false;
    }

    forward() {
        if (!this.isLastMove()) {
            const move = this.states[this.currentMove + 1].move;
            this.chess.move(move);
            this.currentMove++;
            return true;
        }

        return false;
    }

    truncate() {
        this.states = this.states.slice(0, this.currentMove + 1);
    }

    isOver() {
        return this.chess.game_over();
    }

    getResult() {
        if (this.isOver()) {
            if (this.chess.in_draw()) {
                return "½-½";
            } else if (this.chess.in_checkmate()) {
                return this.chess.turn() == "w" ? "0-1" : "1-0";
            }
        }
    }

    getTurn() {
        return this.chess.turn();
    }

    getFEN() {
        return this.chess.fen();
    }

    isLastMove() {
        return this.currentMove == this.states.length - 1;
    }

    getDTZ() {
        return this.states[this.currentMove].dtm;
    }

    updateDTZ(dtm) {
        this.states[this.currentMove].dtm = dtm;
    }
}
