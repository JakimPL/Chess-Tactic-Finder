var puzzlesPath = 'puzzles.json'
var progressPath = 'progress.json'

var puzzles = null
var filteredPuzzles = null
var progress = {}

var path = null
var board = null
var tactic = null
var player = null
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
var loadNextPuzzleCallback = null
var progressCallback = null
var refreshCallback = null
var loadPuzzlesCallback = null
var loadProgressCallback = null

var hideFirstMove = true
var keepPlaying = true

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

function getPuzzlePath(puzzle) {
    return puzzle.path.replace(/[\\/]+/g, '/').replace(/^([a-zA-Z]+:|\.\/)/, '')
}

function loadNextPuzzle() {
    filterPuzzles(puzzles)
    if (filteredPuzzles == null) {
        return
    } else if (!filteredPuzzles.length) {
        return
    }

    var puzzle = filteredPuzzles[(Math.floor(Math.random() * (filteredPuzzles.length)))]
    var path = getPuzzlePath(puzzle)
    loadPGN(path, puzzle.hash)
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

function calculateSuccessRate(progress) {
    var correct = 0
    var total = 0
    for (const [hash, success] of Object.entries(progress)) {
        total += 1
        if (success) {
            correct += 1
        }
    }

    return [correct, total, total > 0 ? correct / total : 0.0]
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

function makeMove(move, instant) {
    animation = instant == null || instant
	if (move !== null) {
		move = game.move(move)
		board.position(game.fen(), !instant)
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
	if (wait || tactic.solved || game.game_over() || game.turn() != player) return false

	if ((game.turn() === 'w' && piece.search(/^b/) !== -1) ||
		(game.turn() === 'b' && piece.search(/^w/) !== -1)) {
		return false
	}
}

function onSnapEnd() {
	board.position(game.fen())
}

function forward() {
    game.move(tactic.nextMove)
    tactic.forward()
    board.position(game.fen())
    updateStatus()
}

function backward() {
    game.undo()
    tactic.backward()
    board.position(game.fen())
    updateStatus()
}

function setPanel(text) {
    if (text == null) {
        $panel.html('&nbsp')
    } else {
        $panel.html(text)
    }
}

function reset() {
    player = null
    tactic = new Tactic(pgn)
    game = new Chess(tactic.fen)
    board = Chessboard('board', getConfig(tactic))
    fen = game.fen()

    if (game.turn() == 'w') {
        board.flip()
    }

    if (hideFirstMove) {
        makeMove(tactic.firstMove, true)
        player = game.turn()
    } else {
        delay(() => {
            makeMove(tactic.firstMove)
            player = game.turn()
        })
    }

    panelTextCallback()
    updateStatus()
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
            save(currentPuzzleId, false)
			delay(() => {
				game.undo()
				board.position(game.fen())
				panelTextCallback()
			})
		}
		else {
			move = tactic.forward()
			if (move !== null) {
				delay(() => {
                    makeMove(move)
                    tactic.forward()
                })
			}
		}
	}

	updateStatus()
}

function checkIfSolved() {
    if (tactic == null) {
        return
    }

    if (tactic.solved) {
        panelTextCallback('Puzzle solved!')
        save(currentPuzzleId, true)
        if (keepPlaying) {
            tactic = null
            delay(loadNextPuzzleCallback)
        }
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

function save(hash, value) {
    $.ajax({
        url: `save/${hash}/${value}`,
        contentType: 'text/plain',
        dataType: 'text',
        type: 'GET',
        success: (data) => {
            if (data != 'None') {
                progressCallback(hash, value)
                progress[hash] = data == 'True'
            }

            refreshCallback()
        },
        error: () => {
            console.error('Invalid response from server')
            refreshCallback()
        }
    })
}

function refresh() {
    $.ajax({
        url: 'refresh',
        type: 'GET',
        success: () => {
            loadPuzzlesCallback()
            loadProgressCallback()
        },
        error: () => {
            console.error('Unable to refresh puzzles')
        }
    })
}
