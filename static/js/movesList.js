import Colors from "./colors.js";
import Link from "./link.js";
import { createTableRowEntry, setTableRowEntry, clearTable } from "./common.js";

export default class MovesList {
    constructor(moves, review, firstMove, callback, reviewDisabled = false) {
        this.element = "moves_list_table";
        this.moves = moves;
        this.review = review;
        this.firstMove = firstMove ? 1 : 0;
        this.callback = callback;
        this.reviewDisabled = reviewDisabled;
        this.render();
    }

    addMove(uci, san, highlight = false, moveType = "", moveDescription = "") {
        this.moves.push(san);
        this.review.push({
            move: uci,
            classification: { type: moveType, description: moveDescription },
        });

        const index = this.moves.length - 1;
        const j = index + this.firstMove;
        if (j % 2 === 0) {
            this.addLine(j);
        }

        this.renderMove(index);
        if (highlight) {
            this.highlightNextMove(index - 1, index);
        }
    }

    getMoves() {
        return this.moves;
    }

    getMoveSymbol(move, turn) {
        if (move === null || move === undefined) {
            return "";
        }

        const piece = move.charAt(0);
        let symbol = move;
        let figurine = true;
        switch (piece) {
        case "K":
            symbol = turn ? "♔" : "♚";
            break;
        case "Q":
            symbol = turn ? "♕" : "♛";
            break;
        case "R":
            symbol = turn ? "♖" : "♜";
            break;
        case "B":
            symbol = turn ? "♗" : "♝";
            break;
        case "N":
            symbol = turn ? "♘" : "♞";
            break;
        default:
            symbol = "⠀";
            figurine = false;
            break;
        }

        symbol += move.slice(figurine);
        return symbol;
    }

    getMoveType(moveClassification) {
        if (moveClassification === null || moveClassification === undefined) {
            return "";
        }

        const moveType = moveClassification.type;
        switch (moveType) {
        case "brilliant":
            return "!!";
        case "great":
            return "!";
        case "best":
            return "★";
        case "inaccuracy":
            return "?!";
        case "mistake":
            return "?";
        case "miss":
            return "×";
        case "blunder":
            return "??";
        case "forced":
            return "⮕";
        default:
            return "";
        }
    }

    getMoveColor(moveType) {
        switch (moveType) {
        case "!!":
            return Colors.brilliantMoveColor;
        case "!":
            return Colors.greatMoveColor;
        case "★":
            return Colors.bestMoveColor;
        case "?!":
            return Colors.inaccuracyColor;
        case "?":
            return Colors.mistakeColor;
        case "×":
            return Colors.missColor;
        case "??":
            return Colors.blunderColor;
        case "⮕":
            return Colors.forcedColor;
        default:
            return null;
        }
    }

    getMoveColorForRow(moveType, evenRow) {
        const moveColor = this.getMoveColor(moveType);
        return moveColor === null || moveColor === undefined
            ? null
            : evenRow
                ? moveColor.lightSquare
                : moveColor.darkSquare;
    }

    addLine(index) {
        const tableObject = document.getElementById(this.element);
        const tr = document.createElement("tr");
        tr.id = `row${Math.floor(index / 2)}`;
        tableObject.appendChild(tr);
        const evenRow = Math.floor(index / 2) % 2 === 0;
        const rowClass = `row_${evenRow ? "even" : "odd"}`;
        const j = index + this.firstMove;

        const moveId = Math.floor(j / 2) + 1;
        createTableRowEntry(tr, `${moveId}.`, null, `move${moveId}`, rowClass);
        createTableRowEntry(tr, "", null, `half_move${index}`, rowClass);
        createTableRowEntry(tr, "", null, `half_move${index}c`, rowClass);
        createTableRowEntry(tr, "", null, `half_move${index + 1}`, rowClass);
        createTableRowEntry(tr, "", null, `half_move${index + 1}c`, rowClass);
        createTableRowEntry(tr, "", null, `half_move${index}d`, rowClass);
        createTableRowEntry(tr, "", null, `half_move${index + 1}d`, rowClass);
    }

    renderMove(index) {
        if (index < 0) {
            setTableRowEntry("half_move0", "", null, null, null);
            setTableRowEntry("half_move0c", "", null, null, null);
            setTableRowEntry("half_move0d", "");
            return;
        }

        const j = index + this.firstMove;
        const move = this.moves[index];
        const turn = j % 2 === 0;
        const evenRow = Math.floor(j / 2) % 2 === 0;

        let moveClassification = null;
        let moveColor = null;
        let moveType = "";
        let moveDescription = "";
        if (!this.reviewDisabled) {
            moveClassification = (
                this.review[index] !== null && this.review[index] !== undefined
                    ? this.review[index].classification
                    : null);
            moveType = this.getMoveType(moveClassification);
            moveDescription =
            moveClassification !== null && moveClassification !== undefined
                ? moveClassification.description
                : "";
            moveColor = this.getMoveColorForRow(moveType, evenRow);
        }

        const moveSymbol = this.getMoveSymbol(move, turn);
        const moveLink = new Link(null, () => {
            this.callback(index);
        });

        setTableRowEntry(
            `half_move${j}`,
            moveSymbol,
            moveLink,
            null,
            moveColor,
        );
        setTableRowEntry(`half_move${j}c`, moveType, moveLink, null, moveColor);
        setTableRowEntry(`half_move${j}d`, moveDescription);
    }

    render() {
        clearTable(this.element);
        if (this.firstMove === 1) {
            this.addLine(0);
            this.renderMove(-1);
        }
        for (let i = 0; i < this.moves.length; i++) {
            const j = i + this.firstMove;
            if (j % 2 === 0) {
                this.addLine(j);
            }
            this.renderMove(i);
        }
    }

    highlightMove(index, color) {
        const j = index + this.firstMove;
        const moveElement = document.getElementById(`half_move${j}`);
        const moveTypeElement = document.getElementById(`half_move${j}c`);
        if (moveElement !== null && moveElement !== undefined) {
            const $moveElement = $(moveElement);
            const backgroundColor =
                color === null || color === undefined
                    ? null
                    : $moveElement.hasClass("row_odd")
                        ? color.darkSquare
                        : color.lightSquare;
            moveElement.style.backgroundColor = backgroundColor;
            moveTypeElement.style.backgroundColor = backgroundColor;
            if (backgroundColor === Colors.darkSquareColor) {
                moveElement.style.color = "white";
                moveTypeElement.style.color = "white";
            } else {
                moveElement.style.color = null;
                moveTypeElement.style.color = null;
            }
        }
    }

    highlightNextMove(previousMoveIndex, currentMoveIndex) {
        let move = !this.reviewDisabled ? this.review[previousMoveIndex] : null;
        const moveType =
            move !== null && move !== undefined
                ? this.getMoveType(move.classification)
                : null;
        const moveColor = this.getMoveColor(moveType);
        this.highlightMove(previousMoveIndex, moveColor);

        move = this.review[currentMoveIndex];
        this.highlightMove(currentMoveIndex, Colors.highlightColor);
    }

    updateReview(index, moveType = "", moveDescription = "") {
        this.review[index].classification.type = moveType;
        this.review[index].classification.description = moveDescription;
        this.renderMove(index);
    }

    truncate(index) {
        this.moves = this.moves.slice(0, index);
        this.review = this.review.slice(0, index);
    }

    hideReview(disable) {
        this.reviewDisabled = disable;
        this.render();
    }
}
