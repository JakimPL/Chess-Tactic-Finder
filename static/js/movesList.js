class MovesList {
    constructor(moves, review, firstMove, callback) {
        this.element = "moves_list_table";
        this.moves = moves;
        this.review = review;
        this.firstMove = firstMove ? 1 : 0;
        this.callback = callback;
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
        if (j % 2 == 0) {
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
        if (move == null) {
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
        if (moveClassification == null) {
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
                return brilliantMoveColor;
            case "!":
                return greatMoveColor;
            case "★":
                return bestMoveColor;
            case "?!":
                return inaccuracyColor;
            case "?":
                return mistakeColor;
            case "×":
                return missColor;
            case "??":
                return blunderColor;
            case "⮕":
                return forcedColor;
            default:
                return null;
        }
    }

    getMoveColorForRow(moveType, evenRow) {
        const moveColor = this.getMoveColor(moveType);
        return moveColor == null
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
            console.log("");
            setTableRowEntry(`half_move0`, "", null, null, null);
            setTableRowEntry(`half_move0c`, "", null, null, null);
            setTableRowEntry(`half_move0d`, "");
            return;
        }

        const j = index + this.firstMove;
        const move = this.moves[index];
        const tableObject = document.getElementById(this.element);
        const tr = tableObject.lastChild;
        const turn = j % 2 === 0;
        const evenRow = Math.floor(j / 2) % 2 === 0;
        const rowClass = `row_${evenRow ? "even" : "odd"}`;

        const moveClassification =
            this.review[index] != null
                ? this.review[index].classification
                : null;
        const moveType = this.getMoveType(moveClassification);
        const moveDescription =
            moveClassification != null ? moveClassification.description : "";
        const moveColor = this.getMoveColorForRow(moveType, evenRow);
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
        if (moveElement != null) {
            const $moveElement = $(moveElement);
            const backgroundColor =
                color == null
                    ? null
                    : $moveElement.hasClass("row_odd")
                      ? color.darkSquare
                      : color.lightSquare;
            moveElement.style.backgroundColor = backgroundColor;
            moveTypeElement.style.backgroundColor = backgroundColor;
            if (backgroundColor == darkSquareColor) {
                moveElement.style.color = "white";
                moveTypeElement.style.color = "white";
            } else {
                moveElement.style.color = null;
                moveTypeElement.style.color = null;
            }
        }
    }

    highlightNextMove(previousMoveIndex, currentMoveIndex) {
        let move = this.review[previousMoveIndex];
        const moveType =
            move != null ? this.getMoveType(move.classification) : null;
        const moveColor = this.getMoveColor(moveType);
        this.highlightMove(previousMoveIndex, moveColor);

        move = this.review[currentMoveIndex];
        this.highlightMove(currentMoveIndex, highlightColor);
    }

    updateReview(index, moveType = "", moveDescription = "") {
        this.review[index].classification.type = moveType;
        this.review[index].classification.description = moveDescription;
        this.renderMove(index);
    }

    truncate(index) {
        this.moves = movesList.moves.slice(0, index);
        this.review = movesList.review.slice(0, index);
    }
}
