board = Chessboard('endgame_board')

var game = null
var fen = null
var player = null
var dtz = 30
var movesList = null
var delayTime = 500

function getConfig() {
    return {
        draggable: true,
        position: fen,
        onDragStart: onDragStart,
        onDrop: onDrop,
        onSnapEnd: onSnapEnd
    }
}

function onDrop(source, target) {
    document.getElementsByTagName('body')[0].style.overflow = 'scroll'
    var uci = source + target
    var move = game.move(uci)

	if (move === null) {
		return 'snapback'
	} else {
	    movesList.addMove(move.san, true)
		sendMove(uci)
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
	board.position(game.getFEN())
}

function forward() {
    if (game !== null) {
        var previousMoveIndex = game.moveIndex
        var nextMove = game.forward()
        if (nextMove != null) {
            setFEN(previousMoveIndex)
        }
    }
}

function backward() {
    if (game !== null) {
        var previousMoveIndex = game.moveIndex
        game.backward()
        setFEN(previousMoveIndex)
    }
}

function goTo(moveIndex) {
    if (game !== null) {
        var previousMoveIndex = game.moveIndex
        var nextMove = game.goTo(moveIndex)
        if (nextMove != null) {
            setFEN(previousMoveIndex)
        }
    }
}

function prepareMateCounter(dtz) {
    if (dtz === null || dtz === undefined) {
        return '';
    }
    const sign = dtz < 0 ? '-' : '';
    const movesToMate = Math.ceil((Math.abs(dtz) + 1) / 2);
    return `#${sign}${movesToMate}`;
}

function setMateCounter(dtz) {
    const mateCounter = prepareMateCounter(dtz);
    document.getElementById('mate_counter').innerText = mateCounter;
}

function requestNewGame() {
    const data = {
        dtz: dtz,
        white: true
    };

    fetch('/endgame/start', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok ' + response.statusText);
        }
        return response.json()
    })
    .then(data => {
        fen = data.fen
        console.log('New game started:', fen);
        startNewGame()
        movesList = new MovesList([], {}, game.turn == 'b', () => {})
    })
    .catch((error) => {
        console.error('Error starting new game:', error)
    });
}

function sendMove(uci) {
    const data = {
        move: uci
    };

    fetch('/endgame/move', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok ' + response.statusText);
        }
        return response.json();
    })
    .then(data => {
        setTimeout(() => {
            board.position(data.fen)
            game.move(data.uci)
            setMateCounter(data.dtz)
            movesList.addMove(data.san, true)
	    }, delayTime)
    })
    .catch((error) => {
        console.error('Error making move:', error)
    });
}

function startNewGame() {
    board = Chessboard('endgame_board', getConfig())
    game = new Game(fen)
    player = game.getTurn()
    setMateCounter(dtz);

    if (player == 'b') {
        board.flip()
    }
}

requestNewGame();
