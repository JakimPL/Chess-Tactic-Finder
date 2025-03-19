import { Chessground } from "../import/chessground.js";

export default class ChessBoard {
    constructor(elementId, draggable, onDragStart, onDrop, onSnapEnd) {
        this.emptyFEN = "8/8/8/8/8/8/8/8 w - - 0 1";

        this.playerColor = null;
        this.highlightedSquares = [];

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
                events: {
                    after: this.onSnapEnd,
                },
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

    getOrientation() {
        return this.board.state.orientation;
    }

    setSide(fen, swap = false) {
        this.playerColor = this.getTurnColor(fen, swap);
        this.board.set({
            movable: {
                color: this.playerColor,
                dests: this.getLegalMoves(fen),
            },
        });
    }

    setPosition(fen) {
        const [gameOver, dests] = this.getGameStatus(fen);
        this.board.set({
            fen: fen,
            turnColor: !gameOver ? this.getTurnColor(fen) : null,
            movable: {
                enabled: !gameOver,
                dests: dests,
            },
        });

        this.highlightSquares();
    }

    flip() {
        this.board.toggleOrientation();
    }

    clear() {
        this.highlightedSquares = [];
        this.board.set({
            fen: this.emptyFEN,
        });
    }

    getTurnColor(fen, swap = false) {
        const turn = fen.split(" ")[1];
        const side = turn === "w" ? "white" : "black";
        return swap ? (turn === "w" ? "black" : "white") : side;
    }

    getGameStatus(fen) {
        const game = new Chess(fen);
        const gameOver = game.game_over();
        const dests = this.getLegalMoves(fen);
        return [gameOver, dests];
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

        this.highlightedSquares.push([square, color]);
        this.highlightSquares();
    }

    highlightSquare(square, color) {
        const squareElement = document.createElement("square");
        squareElement.className = "highlight";

        const boardRect = this.boardElement.getBoundingClientRect();
        const squareSize = boardRect.width / 8;

        const backgroundColor = this.isLightSquare(square) ? color.lightSquare : color.darkSquare;
        const file = square.charCodeAt(0) - "a".charCodeAt(0);
        const rank = 8 - parseInt(square[1]);

        squareElement.style.transform = `translate(${file * squareSize}px, ${rank * squareSize}px)`;
        squareElement.style.position = "absolute";
        squareElement.style.width = squareSize + "px";
        squareElement.style.height = squareSize + "px";
        squareElement.style.backgroundColor = backgroundColor;
        squareElement.style.pointerEvents = "none";
        this.boardElement.appendChild(squareElement);
    }

    highlightSquares() {
        for (const [square, color] of this.highlightedSquares) {
            this.highlightSquare(square, color);
        }
    }

    clearSquaresColors() {
        this.highlightedSquares = [];
        const squares = document.querySelectorAll("cg-board square.highlight");
        squares.forEach(square => square.remove());
    }
}
