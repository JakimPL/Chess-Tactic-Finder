board = Chessboard('endgame_board')

const $panel = $('#panel')

var game = null
var player = null
var movesList = null

var delay = false
var delayTime = 500

var moveIndex = null

$('#backward').on('click', function() {
    backward()
})

$('#forward').on('click', function() {
    forward()
})

$('#flip').on('click', function() {
    board.flip()
})

$('#copyFEN').on('click', function() {
    if (game == null) {
        return
    }

    const fen = game.chess.fen()
    if (fen != null && fen != '') {
        navigator.clipboard.writeText(fen)
        setPanel($panel, 'FEN copied to clipboard!')
    }
})

$('#copyPGN').on('click', function() {
    // not implemented yet
})

function getConfig() {
    return {
        draggable: true,
        position: fen,
        onDragStart: onDragStart,
        onDrop: onDrop,
        onSnapEnd: onSnapEnd
    }
}

function setPosition() {
    board.position(game.getFEN())
    setMateCounter(game.getDTZ())
    colorSquares()
}

function onDrop(source, target) {
    document.getElementsByTagName('body')[0].style.overflow = 'scroll'
    const uci = source + target
    const fen = game.getFEN()
    const isLastMove = game.isLastMove()
    const move = game.move(uci)

	if (move === null) {
		return 'snapback'
	} else {
        if (!isLastMove) {
            movesList.truncate(game.currentMove - 1)
            movesList.render()
        }
        moveIndex = game.currentMove
        movesList.addMove(uci, move.san, true)
        sendMove(fen, uci)
	}
}

function onDragStart(source, piece, position, orientation) {
	if (game == null) {
	    return false
	}

    const turn = game.getTurn()
	if (game.isOver() || turn != player) {
	    return false
	}

	if ((turn === 'w' && piece.search(/^b/) !== -1) ||
		(turn === 'b' && piece.search(/^w/) !== -1)) {
		return false
	}

	document.getElementsByTagName('body')[0].style.overflow = 'hidden'
}

function onSnapEnd() {
	setPosition()
}

function forward() {
    const previousMoveIndex = moveIndex
    if (!delay && game !== null && game.forward()) {
        moveIndex = game.currentMove - 1
        movesList.highlightNextMove(previousMoveIndex, moveIndex)
        setPosition()
    }
}

function backward() {
    const previousMoveIndex = moveIndex
    if (!delay && game !== null && game.backward()) {
        moveIndex = game.currentMove - 1
        movesList.highlightNextMove(previousMoveIndex, moveIndex)
        setPosition()
    }
}

function goTo(moveIndex) {
    if (!delay && game !== null) {
        // not implemented
        setPosition()
    }
}

function updateMoveRating(rating) {
    if (rating != '') {
        movesList.updateReview(game.currentMove - 1, rating)
        colorSquares()
    }
}

function prepareMateCounter(dtz) {
    var result = game.getResult()
    if (result != null) {
        return result
    }

    if (dtz === null || dtz === undefined) {
        return ''
    }

    const sign = dtz < 0 ? '-' : ''
    const movesToMate = Math.ceil((Math.abs(dtz) + 1) / 2)
    return `${sign}M${movesToMate}`
}

function setMateCounter(dtz) {
    const mateCounter = prepareMateCounter(dtz)
    document.getElementById('mate_counter').innerText = mateCounter
}

function sendMove(fen, uci) {
    clearSquaresColors()
    const data = {
        fen: fen,
        move: uci
    }

    fetch('/endgame/move', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok ' + response.statusText)
        }
        return response.json()
    })
    .then(data => {
        game.updateDTZ(data.previous_dtz)
        setMateCounter(data.previous_dtz)
        updateMoveRating(data.previous_rating)

        delay = true
        setTimeout(() => {
            moveIndex = game.currentMove
            board.position(data.fen)
            if (data.uci != null) {
                game.move(data.uci, data.current_dtz)
                setMateCounter(data.current_dtz)
                movesList.addMove(data.uci, data.san, true)
                updateMoveRating(data.current_rating)
            }
            delay = false
	    }, delayTime)
    })
    .catch((error) => {
        console.error('Error making move:', error)
        delay = false
    })
}

function requestNewGame() {
    const mateIn = document.getElementById('mate_in').value;
    const dtz = mateIn == 1 ? 1 : (mateIn - 1) * 2;
    const whiteToPlay = document.getElementById('side').value;
    const bishopColor = document.getElementById('bishop_color').value;

    const data = {
        dtz: dtz,
        white: whiteToPlay == 'random' ? null : whiteToPlay == 'white',
        bishop_color: bishopColor == 'random' ? null : bishopColor == 'light'
    }

    markButton('new_study')
    fetch('/endgame/start', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok ' + response.statusText)
        }
        return response.json()
    })
    .then(data => {
        fen = data.fen
        console.log('New game started:', fen)
        setTimeout(() => {
            startNewGame(fen, dtz)
            movesList = new MovesList([], [], game.turn == 'b', () => {})
            movesList.render()
        }, 50)
    })
    .catch((error) => {
        console.error('Error starting new game:', error)
    })
}

function startNewGame(fen, dtz) {
    board = Chessboard('endgame_board', getConfig())
    game = new Game(fen, dtz)
    player = game.getTurn()
    setMateCounter(dtz)
    unmarkButton('new_study')

    if (player == 'b') {
        board.flip()
    }
}

function colorSquares() {
    clearSquaresColors()
    const move = movesList.review[game.currentMove - 1]
    if (move != null) {
        const color = movesList.getMoveColor(movesList.getMoveType(move.classification))
        colorSquare(move.move.slice(0, 2), color)
        colorSquare(move.move.slice(2, 4), color)
    }
}

requestNewGame()
bindKeys(backward, forward)
document.getElementById('new_study').addEventListener('click', requestNewGame);
