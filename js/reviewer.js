board = Chessboard('game_board', 'start')

const $panel = $('#panel')

var emptyImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='

var pgn = null
var fen = null
var review = null
var currentReviewId = null

var chess = null
var game = null

var storage = new Storage()
var localConfiguration = {}
var reviews = {}
var hashes = {}
var favorites = {}

$('#backward').on('click', function() {
    backward()
})

$('#forward').on('click', function() {
    forward()
})

$('#flip').on('click', function() {
    board.flip()
    setEvaluation()
})

$('#copyFEN').on('click', function() {
    if (chess == null) {
        return
    }

    var fen = chess.fen()
    if (fen != null && fen != '') {
        navigator.clipboard.writeText(fen)
        setPanel($panel, 'FEN copied to clipboard!')
    }
})

$('#copyPGN').on('click', function() {
    if (pgn != null && pgn != '') {
        navigator.clipboard.writeText(pgn)
        setPanel($panel, 'PGN copied to clipboard!')
    }
})

function loadReview(path, reviewId) {
    document.getElementById('evaluation_chart').src = emptyImage
    setEvaluationBar('0.0', 0)
    fetch(path)
    .then(response => {
        if (!response.ok) {
            alert('Failed to load a review.')
            throw new Error('Failed to load a review.')
        }

        return response.text()
    }).
    then(text => {
        currentReviewId = reviewId
        review = JSON.parse(text)
        pgn = reviews[hashes[reviewId]].pgn

        startGame(pgn)
        setLinks(pgn, fen)
        setButton('favorite', favorites[reviewId] == true)
        displayMoves(game.moves, review)

        setEvaluation()
        loadChart(path)

        var gameInfo = getGameInfo(review)
        $('#game_info').html(gameInfo)
    })
}

function loadConfiguration() {
    fetch('configuration.json', {cache: 'no-cache'})
    .then(response => response.json())
    .then(json => {
        configuration = json
        reviewsPath = configuration['paths']['gathered_reviews']
        refresh()
    })
}

function loadReviews() {
    fetch(reviewsPath, {cache: 'no-cache'})
    .then(response => response.json())
    .then(json => {
        reviews = json

        for (var i = 0; i < reviews.length; i++) {
            var review = reviews[i]
            hashes[review.hash] = i
        }

        createReviewsTable(reviews)
    })
}

function loadChart(path) {
$.ajax({
        url: 'get_chart',
        type: 'POST',
        data: path,
        contentType: 'text/plain; charset=utf-8',
        success: (data) => {
            image = `data:image/png;base64,${data}`
            document.getElementById('evaluation_chart').src = image
        },
        error: () => {
            console.error('Unable to load a chart.')
        }
    })
}

function getGameInfo(review) {
    const mainHeaders = review.headers._tag_roster
    const secondaryHeaders = review.headers._others
    const whitePlayer = mainHeaders.White != null ? mainHeaders.White : '???'
    const blackPlayer = mainHeaders.Black != null ? mainHeaders.Black : '???'
    const whiteElo = secondaryHeaders.WhiteElo != null ? secondaryHeaders.WhiteElo : '?'
    const blackElo = secondaryHeaders.BlackElo != null ? secondaryHeaders.BlackElo : '?'
    const white = `<b>${whitePlayer}</b> (${whiteElo})`
    const black = `<b>${blackPlayer}</b> (${blackElo})`
    var gameInfo = `${white} vs ${black}, ${mainHeaders.Date} (${mainHeaders.Result})`
    return gameInfo
}

function startGame(pgn) {
    game = new Game(pgn)
    fen = game.fen
    chess = new Chess(game.fen)
    board = Chessboard('game_board', {
        position: game.fen
    })
}

function setEvaluationBar(value, scale) {
    const orientation = board.orientation() == 'black'
    scale = orientation ? -scale : scale
    var height = scale == null ? 50 : Math.max(0, Math.min(100, 50 - scale * 50))
    $('#evaluation_bar').css('height', height + '%').attr('aria-valuenow', height)
    if (scale >= 0) {
        $('#evaluation_value').html(value)
        $('#evaluation_bar').html('')
    } else {
        $('#evaluation_bar').html(value)
        $('#evaluation_value').html('')
    }

    document.getElementById('evaluation').style.backgroundColor = orientation ? darkSquareColor : lightSquareColor
    document.getElementById('evaluation_bar').style.backgroundColor = orientation ? lightSquareColor : darkSquareColor
}

function setEvaluation() {
    var reviewedMove = review['moves'][game.moveIndex]
    if (reviewedMove != null) {
        const evaluation = reviewedMove['evaluation']

        var scale = 0
        var value = 0
        if (!evaluation.includes('.')){
            const integer = parseInt(evaluation)
            if (integer == 0) {
                const turn = reviewedMove['turn']
                scale = turn ? 1 : -1
            } else {
                scale = evaluation > 0 ? 1 : -1
            }
            value = 'M' + Math.abs(evaluation)
        } else {
            const scaledEvaluation = 0.4 * evaluation
            scale = scaledEvaluation / (1 + Math.abs(scaledEvaluation))
            value = Math.abs(parseFloat(evaluation)).toFixed(1)
        }

        setEvaluationBar(value, scale)
    }
}

function setFEN(previousMoveIndex) {
    var fen = game.getFEN()
    highlightMove(previousMoveIndex, getMoveColor(getMoveType(review['moves'][previousMoveIndex])))
    chess.load(fen)
    board.position(fen)
    highlightMove(game.moveIndex, darkSquareColor)
    setEvaluation()
}

function forward() {
    if (game !== null) {
        var previousMoveIndex = game.moveIndex
        var nextMove = game.forward()
        if (nextMove != null) {
            highlightMove(previousMoveIndex, getMoveColor(getMoveType(review['moves'][previousMoveIndex])))
            chess.move(nextMove)
            board.position(chess.fen())
            highlightMove(game.moveIndex, darkSquareColor)
            setEvaluation()
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

function highlightMove(moveIndex, color) {
    var move = document.getElementById(`half_move${moveIndex}`)
    if (move != null) {
        move.style.backgroundColor = color
    }
}

function getMoveSymbol(move, turn) {
    if (move == null) {
        return ''
    }

    var piece = move.charAt(0)
    var symbol = move
    switch (piece) {
        case 'K': symbol = turn ? '♔' : '♚'; break
        case 'Q': symbol = turn ? '♕' : '♛'; break
        case 'R': symbol = turn ? '♖' : '♜'; break
        case 'B': symbol = turn ? '♗' : '♝'; break
        case 'N': symbol = turn ? '♘' : '♞'; break
    }

    if (move != symbol) {
        symbol += move.slice(1)
    }

    return symbol
}

function getMoveType(moveReview) {
    if (moveReview == null) {
        return ''
    }

    if (moveReview['classification'] == null) {
        return ''
    }

    var moveType = moveReview['classification']['type']
    switch (moveType) {
        case 'brilliant': return '!!';
        case 'great': return '!';
        case 'inaccuracy': return '?!';
        case 'mistake': return '?';
        case 'blunder': return '??';
        default: return '';
    }
}

function getMoveColor(moveType) {
    switch (moveType) {
        case '!!': return '#1baca6';
        case '!': return '#5c8bb0';
        case '?!': return '#f0c15c';
        case '?': return '#e58f2a';
        case '??': return '#ca3431';
        default: return null;
    }
}

function displayMoves(moves) {
    clearTable('moves_list_table')
    const tableObject = document.getElementById('moves_list_table')
    const black = game.turn == 'b'
    const movesReview = review['moves']
    for (var i = 0; i < moves.length; i += 2) {
        var index = i - black
        var turn = index % 2 == 0

        var moveType = getMoveType(movesReview[i])
        var nextMoveType = getMoveType(movesReview[i + 1])

        var move = index >= 0 ? getMoveSymbol(moves[index], turn) + moveType : '...'
        var nextMove = getMoveSymbol(moves[index + 1], !turn, movesReview[i + 1]) + getMoveType(movesReview[i + 1])

        var tr = document.createElement('tr')
        tr.id = `row${i}`

        var moveId = i / 2 + 1
        createTableRowEntry(tr, moveId, null, `move${moveId}`)
        createTableRowEntry(tr, move, `javascript:goTo(${index})`, `half_move${index}`, getMoveColor(moveType))
        createTableRowEntry(tr, nextMove, `javascript:goTo(${index + 1})`, `half_move${index + 1}`, getMoveColor(nextMoveType))
        tableObject.appendChild(tr)
    }
}

function createReviewsTable(reviews) {
    clearTable('reviews_list_table')
    const tableObject = document.getElementById('reviews_list_table')
    for (const review of reviews) {
        var tr = document.createElement('tr')
        tr.id = `row${review.hash}`

        var path = getPath(review.path)
        var link = `javascript:loadReview('${path}', '${review.hash}')`
        var reviewId = `review${review.hash}`
        var playSymbol = favorites[review.hash] == true ? '★' : '▶'

        if (favorites[review.hash]) {
            tr.style.backgroundColor = darkSquareColor
        }

        createTableRowEntry(tr, playSymbol, link, reviewId)
        createTableRowEntry(tr, review.white)
        createTableRowEntry(tr, review.black)
        createTableRowEntry(tr, review.date)
        createTableRowEntry(tr, review.actualResult)
        createTableRowEntry(tr, Math.ceil((!review.moves[0].turn + review.moves.length) / 2))
        createTableRowEntry(tr, '100%')
        createTableRowEntry(tr, '100%')
        tableObject.appendChild(tr)
    }

    sorttable.makeSortable(document.getElementById('games'))
}

function refresh() {
    $.ajax({
        url: 'refresh',
        type: 'GET',
        success: () => {
            loadReviews()
        },
        error: () => {
            console.error('Unable to refresh reviews.')
            $('#number_of_reviews').html('Unable to refresh reviews. Please refresh the page.')
        }
    })
}

loadConfiguration()
loadFavorites()

document.onkeydown = function checkKey(event) {
    event = event || window.event;

    if (event.keyCode == '37') {
        backward()
    } else if (event.keyCode == '39') {
        forward()
    }
}

