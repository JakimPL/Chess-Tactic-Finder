board = Chessboard('game_board', 'start')

const $panel = $('#panel')

var emptyImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='
var image = emptyImage

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

$('#favorite').on('click', function() {
    if (currentReviewId !== null) {
        if (favorites[currentReviewId] == true) {
            favorites[currentReviewId] = false
            unmarkButton('favorite')
        } else {
            favorites[currentReviewId] = true
            markButton('favorite')
        }

        storage.set('favorites', favorites)
    }
})

function updateNumberOfReviews(reviews) {
    if (reviews != null) {
        var numberOfReviews = Object.keys(reviews).length
        var numberOfReviewsText = `${numberOfReviews} reviews in total.`
        $('#number_of_reviews').html(numberOfReviewsText)
    }
}

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

        clearTable('engine_lines_table')
        loadChart(path)

        var gameInfo = getGameInfo(review)
        $('#game_info').html(gameInfo)
        window.scrollTo(0, 0);
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
        updateNumberOfReviews(reviews)
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

function evaluationToString(evaluation) {
    var value = 0.0
    if (evaluation.includes('.')) {
        value = parseFloat(evaluation).toFixed(2)
    } else {
        value = `M${parseInt(evaluation)}`
    }

    return value.toString()
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

function setEngineLines() {
    const index = game.moveIndex + 1
    const move = review.moves[index]
    if (move == null) {
        return
    }

    const bestMoves = move['best_moves']
    clearTable('engine_lines_table')
    const tableObject = document.getElementById('engine_lines_table')
    bestChoice = false
    for (const bestMove of bestMoves) {
        var tr = document.createElement('tr')
        createTableRowEntry(tr, bestMove[0])
        if (bestMove[0] == game.moves[index]) {
            tr.style.backgroundColor = darkSquareColor
            bestChoice = true
        }

        var value = evaluationToString(bestMove[1])
        createTableRowEntry(tr, value)
        tableObject.appendChild(tr)
    }

    const reviewMove = review.moves[index]
    if (!bestChoice && reviewMove.move != null) {
        var tr = document.createElement('tr')
        createTableRowEntry(tr, game.moves[index])
        createTableRowEntry(tr, evaluationToString(reviewMove.evaluation))
        tr.style.backgroundColor = darkSquareColor
        tableObject.appendChild(tr)
    }

    const remainingRows = 5 - bestMoves.length + bestChoice
    for (var i = 0; i < remainingRows; i++) {
        var tr = document.createElement('tr')
        var td = document.createElement('td')
        td.rowspan = remainingRows
        td.innerHTML = '&nbsp'
        tr.appendChild(td)
        tableObject.appendChild(tr)
    }
}

function setEvaluation() {
    var reviewedMove = review.moves[game.moveIndex]
    if (reviewedMove != null) {
        const evaluation = reviewedMove.evaluation

        var scale = 0
        var value = 0
        if (!evaluation.includes('.')){
            const integer = parseInt(evaluation)
            if (integer == 0) {
                const turn = reviewedMove.turn
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

    var move = review.moves[previousMoveIndex]
    var moveType = move != null ? getMoveType(move.classification) : null
    var moveColor = getMoveColor(moveType)

    clearSquaresColors()
    highlightMove(previousMoveIndex, moveColor)

    chess.load(fen)
    board.position(fen)

    move = review.moves[game.moveIndex]
    highlightMove(game.moveIndex, highlightColor)
    if (move != null) {
        moveColor = getMoveColor(getMoveType(move.classification))
        colorSquare(move.move.slice(0, 2), moveColor)
        colorSquare(move.move.slice(2, 4), moveColor)
    }

    setEvaluation()
    setEngineLines()
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

function highlightMove(moveIndex, color) {
    var moveElement = document.getElementById(`half_move${moveIndex}`)
    if (moveElement != null) {
        var $moveElement = $(moveElement)
        const backgroundColor = color == null ? null : $moveElement.hasClass('row_odd') ? color.darkSquare : color.lightSquare
        moveElement.style.backgroundColor = backgroundColor
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

function getMoveType(moveClassification) {
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

function getMoveColor(moveType) {
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

function displayMoves(moves) {
    clearTable('moves_list_table')
    const tableObject = document.getElementById('moves_list_table')
    const black = game.turn == 'b'
    const movesReview = review.moves
    for (var i = 0; i < moves.length; i += 2) {
        const index = i - black
        const turn = index % 2 == 0
        const evenRow = index % 4 == 0
        const rowClass = `row_${evenRow ? 'even' : 'odd'}`

        const halfMoveIndex = `half_move${index}`
        const halfNextMoveIndex = `half_move${index + 1}`

        const moveClassification = movesReview[i] != null ? movesReview[i].classification : null
        const nextMoveClassification = (i + 1 < movesReview.length) ? movesReview[i + 1].classification : null

        const moveType = getMoveType(moveClassification)
        const nextMoveType = getMoveType(nextMoveClassification)

        const moveDescription = moveClassification != null ? moveClassification.description : ''
        const nextMoveDescription = nextMoveClassification != null ? nextMoveClassification.description : ''

        var moveColor = getMoveColor(moveType)
        moveColor = moveColor == null ? null : moveColor
        moveColor = moveColor == null ? null : evenRow ? moveColor.lightSquare : moveColor.darkSquare

        var nextMoveColor = getMoveColor(nextMoveType)
        nextMoveColor = nextMoveColor == null ? null : nextMoveColor
        nextMoveColor = nextMoveColor == null ? null : evenRow ? nextMoveColor.lightSquare : nextMoveColor.darkSquare

        var move = index >= 0 ? getMoveSymbol(moves[index], turn) + moveType : '...'
        var nextMove = getMoveSymbol(moves[index + 1], !turn) + nextMoveType

        var tr = document.createElement('tr')
        tr.id = `row${i}`

        var moveLink = new Link(null, () => {goTo(index)})
        var nextMoveLink = new Link(null, () => {goTo(index + 1)})

        var moveId = i / 2 + 1
        createTableRowEntry(tr, `${moveId}.`, null, `move${moveId}`)
        createTableRowEntry(tr, move, moveLink, halfMoveIndex, rowClass, moveColor)
        createTableRowEntry(tr, nextMove, nextMoveLink, halfNextMoveIndex, rowClass, nextMoveColor)
        createTableRowEntry(tr, moveDescription)
        createTableRowEntry(tr, nextMoveDescription)
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
        var link = new Link(`javascript:loadReview('${path}', '${review.hash}')`)

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
        createTableRowEntry(tr, 'N/A')
        createTableRowEntry(tr, 'N/A')
        tableObject.appendChild(tr)
    }

    sorttable.makeSortable(document.getElementById('games'))
}

function refresh(gather) {
    $.ajax({
        url: gather == true ? 'refresh?gather=true' : 'refresh',
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

