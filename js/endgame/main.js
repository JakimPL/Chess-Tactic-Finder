board = Chessboard('endgame_board')

var game = null
var fen = null
var player = null
var dtz = 6
var movesList = null
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

    var fen = game.chess.fen()
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
}

function onDrop(source, target) {
    document.getElementsByTagName('body')[0].style.overflow = 'scroll'
    var uci = source + target
    var fen = game.getFEN()
    var isLastMove = game.isLastMove()
    var move = game.move(uci)

	if (move === null) {
		return 'snapback'
	} else {
        if (!isLastMove) {
            movesList.moves = movesList.moves.slice(0, game.currentMove - 1)
            movesList.render()
        }
        moveIndex = game.currentMove
        movesList.addMove(move.san, true)
        sendMove(fen, uci)
	}
}

function onDragStart(source, piece, position, orientation) {
	if (game == null) {
	    return false
	}

    var turn = game.getTurn()
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
    var previousMoveIndex = moveIndex
    if (game !== null && game.forward()) {
        moveIndex = game.currentMove - 1
        movesList.highlightNextMove(previousMoveIndex, moveIndex)
        setPosition()
    }
}

function backward() {
    var previousMoveIndex = moveIndex
    if (game !== null && game.backward()) {
        moveIndex = game.currentMove - 1
        movesList.highlightNextMove(previousMoveIndex, moveIndex)
        setPosition()
    }
}

function goTo(moveIndex) {
    if (game !== null) {
        // not implemented
    }
}

function prepareMateCounter(dtz) {
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

function requestNewGame() {
    const data = {
        dtz: dtz,
        white: true
    }

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
        startNewGame()
        movesList = new MovesList([], {}, game.turn == 'b', () => {})
    })
    .catch((error) => {
        console.error('Error starting new game:', error)
    })
}

function sendMove(fen, uci) {
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
        setTimeout(() => {
            moveIndex = game.currentMove
            board.position(data.fen)
            if (data.uci != null) {
                game.move(data.uci)
                setMateCounter(data.dtz)
                movesList.addMove(data.san, true)
            }
	    }, delayTime)
    })
    .catch((error) => {
        console.error('Error making move:', error)
    })
}

function startNewGame() {
    board = Chessboard('endgame_board', getConfig())
    game = new Game(fen)
    player = game.getTurn()
    setMateCounter(dtz)

    if (player == 'b') {
        board.flip()
    }
}

requestNewGame()
bindKeys(backward, forward)
