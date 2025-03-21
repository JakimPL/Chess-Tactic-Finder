import State from "./state.js";

export default class Game {
    constructor(fen, dtm) {
        this.fen = fen;
        this.chess = new Chess(fen);
        this.states = [new State(fen, dtm, null)];
        this.currentMove = 0;
        this.startingSide = this.chess.turn();
    }

    move(uci, dtm) {
        const source = uci.substr(0, 2);
        const target = uci.substr(2, 2);
        const promotion = uci.length === 5 ? uci[4] : "q";
        const move = this.chess.move({
            from: source,
            to: target,
            promotion: promotion,
        });

        if (move !== null && move !== undefined) {
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

    goTo(index) {
        if (index >= 0 && index < this.states.length) {
            if (index < this.currentMove) {
                while (this.currentMove > index) {
                    this.backward();
                }
            } else if (index > this.currentMove) {
                while (this.currentMove < index) {
                    this.forward();
                }
            }
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
                return this.chess.turn() === "w" ? "0-1" : "1-0";
            }
        }
    }

    getTurn() {
        return this.chess.turn();
    }

    getFEN() {
        return this.chess.fen();
    }

    getPGN() {
        return this.chess.pgn();
    }

    getSize() {
        return this.states.length;
    }

    isLastMove() {
        return this.currentMove === this.states.length - 1;
    }

    getDTZ() {
        return this.states[this.currentMove].dtm;
    }

    updateDTZ(dtm) {
        this.states[this.currentMove].dtm = dtm;
    }
}
