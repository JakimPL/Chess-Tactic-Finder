export class ChessBoard {
    constructor(elementId, onDragStart, onDrop, onSnapEnd) {
        this.onDragStart = onDragStart;
        this.onDrop = onDrop;
        this.onSnapEnd = onSnapEnd;
        this.board = Chessboard(elementId, this.getConfig());
    }

    getConfig(fen = "") {
        return {
            draggable: true,
            position: fen,
            onDragStart: this.onDragStart,
            onDrop: this.onDrop,
            onSnapEnd: this.onSnapEnd,
        };
    }

    setPosition(fen) {
        this.board.position(fen);
    }

    flip() {
        this.board.flip();
    }

    clear() {
        this.board.clear();
    }
}


export function colorSquare(square, color) {
    if (square === null || color === null) {
        return;
    }

    const $square = $(`.square-${square}`);

    let background = color.lightSquare;
    if ($square.hasClass("black-3c85d")) {
        background = color.darkSquare;
    }

    $square.css("background", background);
}

export function clearSquaresColors() {
    $(".square-55d63").css("background", "");
}
