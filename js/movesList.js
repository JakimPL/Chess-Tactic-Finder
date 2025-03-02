class MovesList {
    constructor(moves, review, first_move, callback) {
        this.element = 'moves_list_table'
        this.moves = moves
        this.review = review
        this.first_move = first_move
        this.callback = callback
    }

    addMove(move) {
        this.moves.push(move)
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

    render() {
        clearTable(this.element)
        const tableObject = document.getElementById(this.element)
        const black = this.first_move
        for (var i = 0; i < this.moves.length; i += 2) {
            const index = i - black
            const turn = index % 2 == 0
            const evenRow = index % 4 == 0
            const rowClass = `row_${evenRow ? 'even' : 'odd'}`

            const halfMoveIndex = `half_move${index}`
            const halfNextMoveIndex = `half_move${index + 1}`

            const moveClassification = this.review[i] != null ? this.review[i].classification : null
            const nextMoveClassification = (i + 1 < this.review.length) ? this.review[i + 1].classification : null

            const moveType = this.getMoveType(moveClassification)
            const nextMoveType = this.getMoveType(nextMoveClassification)

            const moveDescription = moveClassification != null ? moveClassification.description : ''
            const nextMoveDescription = nextMoveClassification != null ? nextMoveClassification.description : ''

            var moveColor = this.getMoveColor(moveType)
            moveColor = moveColor == null ? null : moveColor
            moveColor = moveColor == null ? null : evenRow ? moveColor.lightSquare : moveColor.darkSquare

            var nextMoveColor = this.getMoveColor(nextMoveType)
            nextMoveColor = nextMoveColor == null ? null : nextMoveColor
            nextMoveColor = nextMoveColor == null ? null : evenRow ? nextMoveColor.lightSquare : nextMoveColor.darkSquare

            var move = index >= 0 ? this.getMoveSymbol(this.moves[index], turn) : '...'
            var nextMove = this.getMoveSymbol(this.moves[index + 1], !turn)

            var tr = document.createElement('tr')
            tr.id = `row${i}`

            var moveLink = new Link(null, () => {this.callback(index)})
            var nextMoveLink = new Link(null, () => {this.callback(index + 1)})

            var moveId = i / 2 + 1
            createTableRowEntry(tr, `${moveId}.`, null, `move${moveId}`)
            createTableRowEntry(tr, move, moveLink, halfMoveIndex, rowClass, moveColor)
            createTableRowEntry(tr, moveType, moveLink, `${halfMoveIndex}c`, rowClass, moveColor)
            createTableRowEntry(tr, nextMove, nextMoveLink, halfNextMoveIndex, rowClass, nextMoveColor)
            createTableRowEntry(tr, nextMoveType, nextMoveLink, `${halfNextMoveIndex}c`, rowClass, nextMoveColor)
            createTableRowEntry(tr, moveDescription)
            createTableRowEntry(tr, nextMoveDescription)
            tableObject.appendChild(tr)
        }
    }

    highlightMove(moveIndex, color) {
        var moveElement = document.getElementById(`half_move${moveIndex}`)
        var moveTypeElement = document.getElementById(`half_move${moveIndex}c`)
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