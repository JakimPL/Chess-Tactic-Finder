board = Chessboard('board')

const $panel = $('#panel')

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
    if (game !== null) {
        backward()
    }
})

$('#forward').on('click', function() {
    if (game !== null) {
        forward()
    }
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

        var chessLink = `https://www.chess.com/analysis?pgn=${pgn}`
        document.getElementById('analyze_chess').href = encodeURI(chessLink)

        var lichessLink = `https://lichess.org/analysis/${fen}`
        document.getElementById('analyze_lichess').href = encodeURI(lichessLink)

        if (favorites[reviewId] == true) {
            markButton('favorite')
        } else {
            unmarkButton('favorite')
        }
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

function startGame(pgn) {
    game = new Game(pgn)
    chess = new Chess(game.fen)
    board = Chessboard('board', {
        position: game.fen
    })
}

function forward() {
    var nextMove = game.forward()
    if (nextMove != null) {
        chess.move(nextMove)
        board.position(chess.fen())
    }
}

function backward() {
    chess.undo()
    game.backward()
    board.position(chess.fen())
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
            tr.style.backgroundColor = '#b58863'
        }

        createTableRowEntry(tr, playSymbol, link, reviewId)
        createTableRowEntry(tr, review.white)
        createTableRowEntry(tr, review.black)
        createTableRowEntry(tr, review.date)
        createTableRowEntry(tr, review.actualResult)
        createTableRowEntry(tr, review.moves.length)
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