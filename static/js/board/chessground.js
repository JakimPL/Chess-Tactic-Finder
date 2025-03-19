import { Chessground } from "../import/chessground.js";

export default class ChessBoard {
    constructor(elementId, draggable, onDragStart, onDrop, onSnapEnd) {
        this.emptyFEN = "8/8/8/8/8/8/8/8 w - - 0 1";

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
            movable: { enabled: draggable },
            draggable: { showGhost: true },
            events: {
                move: this.onDrop,
                dragStart: this.onDragStart,
                dropNewPiece: this.onDrop,
            },
        };
    }

    setPosition(fen) {
        this.board.set({
            fen: fen,
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

    colorSquare(square, color) {
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
        squareElement.style.backgroundColor = color;
        squareElement.style.pointerEvents = "none";

        this.boardElement.appendChild(squareElement);
    }

    clearSquaresColors() {
        const squares = document.querySelectorAll("cg-board square.highlight");
        squares.forEach(square => square.remove());
    }
}
