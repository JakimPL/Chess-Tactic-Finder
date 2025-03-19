import { Chessground } from "../import/chessground.js";

export default class ChessBoard {
    constructor(elementId, draggable, onDragStart, onDrop, onSnapEnd) {
        this.emptyFEN = "8/8/8/8/8/8/8/8 w - - 0 1";

        this.playerColor = null;
        this.onDragStart = onDragStart;
        this.onDrop = onDrop;
        this.onSnapEnd = onSnapEnd;

        this.element = document.getElementById(elementId);
        this.board = Chessground(this.element, this.getConfig(draggable));
        this.boardElement = document.querySelector("cg-board");
    }

    getConfig(draggable = true, fen = this.emptyFEN) {
        return {
            enabled: draggable,
            fen: fen,
            turnColor: this.getTurnColor(fen),
            movable: {
                enabled: draggable,
                color: this.playerColor,
                showDests: true,
            },
            premovable: {
                enabled: false,
                showDests: true,
            },
            draggable: {
                enabled: true,
                showGhost: true,
            },
            highlight: {
                lastMove: false,
                check: true,
            },
            events: {
                move: this.onDrop,
            },
        };
    }

    setSide(fen) {
        this.playerColor = this.getTurnColor(fen);
        this.board.set({
            movable: {
                color: this.playerColor,
                dests: this.getLegalMoves(fen),
            },
        });
    }

    setPosition(fen) {
        this.board.set({
            fen: fen,
            turnColor: this.getTurnColor(fen),
            movable: {
                dests: this.getLegalMoves(fen),
            },
        });
    }

    flip() {
        this.board.toggleOrientation();
    }

    clear() {
        this.board.set({
            fen: this.emptyFEN,
        });
    }

    getTurnColor(fen, swap = false) {
        const turn = fen.split(" ")[1];
        const side = turn === "w" ? "white" : "black";
        return swap ? (turn === "w" ? "black" : "white") : side;
    }

    getLegalMoves(fen) {
        const dests = new Map();
        const game = new Chess(fen);
        const moves = game.moves({ verbose: true });
        moves.forEach(move => {
            if (!dests.has(move.from)) {
                dests.set(move.from, []);
            }
            dests.get(move.from).push(move.to);
        });

        return dests;
    }

    isLightSquare(square) {
        const file = square.charCodeAt(0) - "a".charCodeAt(0) + 1;
        const rank = parseInt(square[1]);
        return (file + rank) % 2 === 0;
    }

    colorSquare(square, color) {
        if (square === null || color === null) {
            return;
        }

        const squareElement = document.createElement("square");
        squareElement.className = "highlight";

        const boardRect = this.boardElement.getBoundingClientRect();
        const squareSize = boardRect.width / 8;

        const file = square.charCodeAt(0) - "a".charCodeAt(0);
        const rank = 8 - parseInt(square[1]);

        squareElement.style.transform = `translate(${file * squareSize}px, ${rank * squareSize}px)`;

        squareElement.style.position = "absolute";
        squareElement.style.width = squareSize + "px";
        squareElement.style.height = squareSize + "px";
        squareElement.style.backgroundColor = this.isLightSquare(square) ? color.lightSquare : color.darkSquare;
        squareElement.style.pointerEvents = "none";

        this.boardElement.appendChild(squareElement);
    }

    clearSquaresColors() {
        const squares = document.querySelectorAll("cg-board square.highlight");
        squares.forEach(square => square.remove());
    }
}
