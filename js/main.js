var puzzlesPath = 'puzzles.json'
var progressPath = 'progress.json'

var puzzles = null
var progress = {}

var path = null
var board = null
var tactic = null
var game = null

var pgn = null
var fen = null

var currentPuzzleId = -1

var action = 0
var wait = false
var delayTime = 750

var panelTextCallback = null
var statusTextCallback = null
var moveHistoryText = null

function delay(callback) {
    wait = true
    action += 1
    var currentAction = action
    setTimeout(() => {
        if (action == currentAction) {
            callback()
        }

        wait = false
        updateStatus()
    }, delayTime);
}

function loadPGN(path, puzzleId) {
    currentPuzzleId = puzzleId
    fetch(path)
    .then(response => response.text())
    .then(text => {
        pgn = text
        reset()
    })
}

function getFullPieceName(piece) {
    piece = piece.toLowerCase()
    switch (piece) {
        case 'p':
            return 'Pawn'
        case 'n':
            return 'Knight'
        case 'b':
            return 'Bishop'
        case 'r':
            return 'Rook'
        case 'q':
            return 'Queen'
        case 'k':
            return 'King'
    }
}

function makeMove(move) {
	if (move !== null) {
		move = game.move(move)
		board.position(game.fen())
	}
}

function getMoves(game) {
    moves = game.moves({verbose: true})
    return game.pgn().split(/\d+\./).slice(1).join('')
}

function getConfig(tactic) {
    return {
        draggable: true,
        position: tactic.fen,
        onDragStart: onDragStart,
        onDrop: onDrop,
        onSnapEnd: onSnapEnd
    }
}

function onDragStart(source, piece, position, orientation) {
	if (wait || tactic.solved || game.game_over()) return false

	if ((game.turn() === 'w' && piece.search(/^b/) !== -1) ||
		(game.turn() === 'b' && piece.search(/^w/) !== -1)) {
		return false
	}
}

function onSnapEnd() {
	board.position(game.fen())
}

function reset() {
    tactic = new Tactic(pgn)
    game = new Chess(tactic.fen)
    board = Chessboard('myBoard', getConfig(tactic))
    fen = game.fen()

    if (game.turn() == 'w') {
        board.flip()
    }

    panelTextCallback()
    updateStatus()
    delay(() => {
        makeMove(tactic.firstMove)
    })
}

function onDrop(source, target) {
	var move = game.move({
		from: source,
		to: target,
		promotion: 'q'
	})

	if (wait || move === null) {
		return 'snapback'
	} else {
		nextMove = tactic.nextMove
		if (nextMove != move.san) {
			panelTextCallback('Incorrect move!')
			delay(() => {
				game.undo()
				board.position(game.fen())
				panelTextCallback()
			})
		}
		else {
			move = tactic.getNextMove()
			if (move !== null) {
				delay(() => {
                    makeMove(move)
                    tactic.getNextMove()
                })
			}
		}
	}

	updateStatus()
}

function checkIfSolved() {
    if (tactic.solved) {
        panelTextCallback('Puzzle solved!')
        save(currentPuzzleId)
    }
}

function updateStatus() {
	var statusText = ''

	var moveColor = 'White'
	if (game.turn() === 'b') {
		moveColor = 'Black'
	}

	if (game.in_checkmate()) {
		statusText = 'Game over, ' + moveColor + ' is checkmated.'
	} else if (game.in_draw()) {
		statusText = 'Game over, drawn position'
	} else {
		statusText = moveColor + ' to move'
	}

    statusTextCallback(statusText)
    moveHistoryText = getMoves(game)
    checkIfSolved()
}
