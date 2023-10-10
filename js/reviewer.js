$('#copyFEN').on('click', function() {
    if (game == null) {
        return
    }

    var fen = game.fen()
    if (fen != null && fen != '') {
        navigator.clipboard.writeText(fen)
        setPanel('FEN copied to clipboard!')
    }
})

$('#copyPGN').on('click', function() {
    if (pgn != null && pgn != '') {
        navigator.clipboard.writeText(pgn)
        setPanel('PGN copied to clipboard!')
    }
})

function loadConfiguration() {
    fetch('configuration.json', {cache: 'no-cache'})
    .then(response => response.json())
    .then(json => {
        configuration = json
        puzzlesPath = configuration['paths']['gathered_reviews']
        refresh()
    })
}

board = Chessboard('board')
