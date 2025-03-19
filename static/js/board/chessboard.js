export class ChessBoard {
    constructor(elementId, draggable, onDragStart, onDrop, onSnapEnd) {
        this.onDragStart = onDragStart;
        this.onDrop = onDrop;
        this.onSnapEnd = onSnapEnd;
        this.board = Chessboard(elementId, this.getConfig(draggable));
    }

    getConfig(draggable = true, fen = "") {
        return {
            draggable: draggable,
            position: fen,
            onDragStart: this.onDragStart,
            onDrop: this.onDrop,
            onSnapEnd: this.onSnapEnd,
        };
    }

    getOrientation() {
        return this.board.orientation();
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
