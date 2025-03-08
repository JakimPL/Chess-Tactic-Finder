export default class Tactic {
    constructor(pgn) {
        this.gameJSON = JSON.parse(parser.pgn2json(pgn));
        this.base_pgn = pgn;
        this.base_fen = this.gameJSON["str"]["FEN"];
        this.moves = this.gameJSON["moves"];
        this.turn = "";
        this.fen = this.getFEN();
        this.pgn = this.getPGN();

        this.moveIndex = 0;
        this.firstMove = this.moves[0];
        this.nextMove = this.forward();

        this.solved = false;
    }

    forward() {
        if (this.moveIndex < this.moves.length - 1) {
            this.moveIndex++;
            const move = this.moves[this.moveIndex];
            this.nextMove = move;
            return move;
        } else {
            this.solved = true;
        }

        return null;
    }

    backward() {
        if (this.moveIndex > 0) {
            this.solved = false;
            this.moveIndex--;
            const move = this.moves[this.moveIndex];
            this.nextMove = move;
            return move;
        }

        return null;
    }

    getFEN() {
        const chess = new Chess(this.base_fen);
        chess.move(this.moves[0]);

        this.turn = chess.turn();

        return chess.fen();
    }

    getPGN() {
        const chess = new Chess(this.fen);
        for (const move of this.moves.slice(1)) {
            chess.move(move);
        }

        return chess.pgn();
    }
}
