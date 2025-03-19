export class ChessGround {
    constructor(elementId, config, onDragStart, onDrop, onSnapEnd) {
        this.onDragStart = onDragStart;
        this.onDrop = onDrop;
        this.onSnapEnd = onSnapEnd;
    }

    setPosition(fen) {
    }

    flip() {
    }

    clear() {
    }

    setOnDrop() {
    }
}

export function colorSquare(square, color) {
    const squareElement = document.createElement("square");
    squareElement.className = "highlight";

    const boardElement = document.querySelector("cg-board");
    const boardRect = boardElement.getBoundingClientRect();
    const squareSize = boardRect.width / 8;

    const file = square.charCodeAt(0) - "a".charCodeAt(0);
    const rank = 8 - parseInt(squareId[1]);

    squareElement.style.transform = `translate(${file * squareSize}px, ${rank * squareSize}px)`;

    squareElement.style.position = "absolute";
    squareElement.style.width = squareSize + "px";
    squareElement.style.height = squareSize + "px";
    squareElement.style.backgroundColor = color;
    squareElement.style.pointerEvents = "none";

    boardElement.appendChild(square);
}

export function clearSquaresColors() {
    const squares = document.querySelectorAll("cg-board square.highlight");
    squares.forEach(square => square.remove());
}
