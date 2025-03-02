class MovesList {
    constructor(moves, review, first_move, callback) {
        this.element = 'moves_list_table'
        this.moves = moves
        this.review = review
        this.first_move = first_move
        this.callback = callback
    }

    addMove(move, highlight = false) {
        this.moves.push(move)

        const index = this.moves.length - 1
        if (index % 2 == 0) {
            this.addLine(index)
        }

        this.renderMove(move, index)
        if (highlight) {
            this.highlightNextMove(index - 1, index)
        }
    }

    getMoves() {
        return this.moves;
    }

    getMoveSymbol(move, turn) {
        if (move == null) {
            return ''
        }

        var piece = move.charAt(0)
        var symbol = move
        var figurine = true
        switch (piece) {
            case 'K': symbol = turn ? '♔' : '♚'; break
            case 'Q': symbol = turn ? '♕' : '♛'; break
            case 'R': symbol = turn ? '♖' : '♜'; break
            case 'B': symbol = turn ? '♗' : '♝'; break
            case 'N': symbol = turn ? '♘' : '♞'; break
            default: symbol = '⠀'; figurine = false; break
        }

        symbol += move.slice(figurine)
        return symbol
    }

    getMoveType(moveClassification) {
        if (moveClassification == null) {
            return ''
        }

        var moveType = moveClassification.type
        switch (moveType) {
            case 'brilliant': return '!!';
            case 'great': return '!';
            case 'best': return '★';
            case 'inaccuracy': return '?!';
            case 'mistake': return '?';
            case 'miss': return '×';
            case 'blunder': return '??';
            default: return '';
        }
    }

    getMoveColor(moveType) {
        switch (moveType) {
            case '!!': return brilliantMoveColor;
            case '!': return greatMoveColor;
            case '★': return bestMoveColor;
            case '?!': return inaccuracyColor;
            case '?': return mistakeColor;
            case '×': return missColor;
            case '??': return blunderColor;
            default: return null;
        }
    }

    getMoveColorForRow(moveType, evenRow) {
        const moveColor = this.getMoveColor(moveType);
        return moveColor == null ? null : evenRow ? moveColor.lightSquare : moveColor.darkSquare;
    }

    addLine(index) {
        const tableObject = document.getElementById(this.element);
        const tr = document.createElement('tr');
        tr.id = `row${Math.floor(index / 2)}`;
        tableObject.appendChild(tr);
        const evenRow = Math.floor(index / 2) % 2 === 0;
        const rowClass = `row_${evenRow ? 'even' : 'odd'}`;

        const moveId = Math.floor(index / 2) + 1;
        createTableRowEntry(tr, `${moveId}.`, null, `move${moveId}`, rowClass);
        createTableRowEntry(tr, '', null, `half_move${index}`, rowClass);
        createTableRowEntry(tr, '', null, `half_move${index}c`, rowClass);
        createTableRowEntry(tr, '', null, `half_move${index + 1}`, rowClass);
        createTableRowEntry(tr, '', null, `half_move${index + 1}c`, rowClass);
        createTableRowEntry(tr, '', null, `half_move${index}d`, rowClass);
        createTableRowEntry(tr, '', null, `half_move${index + 1}d`, rowClass);
    }

    renderMove(move, index) {
        const tableObject = document.getElementById(this.element);
        const tr = tableObject.lastChild;
        const turn = index % 2 === 0;
        const evenRow = Math.floor(index / 2) % 2 === 0;
        const rowClass = `row_${evenRow ? 'even' : 'odd'}`;

        const moveClassification = this.review[index] != null ? this.review[index].classification : null;
        const moveType = this.getMoveType(moveClassification);
        const moveDescription = moveClassification != null ? moveClassification.description : '';
        const moveColor = this.getMoveColorForRow(moveType, evenRow);
        const moveSymbol = this.getMoveSymbol(move, turn);
        const moveLink = new Link(null, () => { this.callback(index); });

        setTableRowEntry(`half_move${index}`, moveSymbol, moveLink, null, moveColor);
        setTableRowEntry(`half_move${index}c`, moveType, moveLink, null, moveColor);
        setTableRowEntry(`half_move${index}d`, moveDescription);
    }

    render() {
        clearTable(this.element);
        for (let i = 0; i < this.moves.length; i++) {
            if (i % 2 === 0) {
                this.addLine(i);
            }
            this.renderMove(this.moves[i], i);
        }
    }

    highlightMove(index, color) {
        var moveElement = document.getElementById(`half_move${index}`)
        var moveTypeElement = document.getElementById(`half_move${index}c`)
        if (moveElement != null) {
            var $moveElement = $(moveElement)
            const backgroundColor = color == null ? null : $moveElement.hasClass('row_odd') ? color.darkSquare : color.lightSquare
            moveElement.style.backgroundColor = backgroundColor
            moveTypeElement.style.backgroundColor = backgroundColor
                if (backgroundColor == darkSquareColor) {
                moveElement.style.color = 'white'
                moveTypeElement.style.color = 'white'
            } else {
                moveElement.style.color = null
                moveTypeElement.style.color = null
            }
        }
    }

    highlightNextMove(previousMoveIndex, currentMoveIndex) {
        var move = this.review[previousMoveIndex]
        var moveType = move != null ? this.getMoveType(move.classification) : null
        var moveColor = this.getMoveColor(moveType)
        this.highlightMove(previousMoveIndex, moveColor)

        move = this.review[currentMoveIndex]
        this.highlightMove(currentMoveIndex, highlightColor)
    }
}