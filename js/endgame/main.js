board = Chessboard('endgame_board')

var game = null
var fen = null
var player = null

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
    	var move = game.move({
		from: source,
		to: target,
		promotion: 'q'
	})

	if (move === null) {
		return 'snapback'
	} else {
		// request next move
	}
}

function onDragStart(source, piece, position, orientation) {
	if (game == null) {
	    return false
	}

    turn = game.getTurn()
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

function requestNewGame() {
    const data = {
        dtz: 20,
        white: true,
        bishop_color: true
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
        return response.json();
    })
    .then(data => {
        fen = data.fen
        console.log('New game started:', fen);
        startNewGame()
    })
    .catch((error) => {
        console.error('Error starting new game:', error);
    });
}

function startNewGame() {
    board = Chessboard('endgame_board', getConfig())
    game = new Game(fen)
    player = game.getTurn()

    if (player == 'b') {
        board.flip()
    }
}

requestNewGame();
