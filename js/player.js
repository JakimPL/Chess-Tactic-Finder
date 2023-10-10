board = Chessboard('board')

const $status = $('#status')
const $moveHistory = $('#moveHistory')
const $panel = $('#panel')

var storage = new Storage()
var localConfiguration = {}
var progressLoaded = $.Deferred()
var puzzlesLoaded = $.Deferred()
var actionId = 0

$.when(progressLoaded, puzzlesLoaded).done(function() {
    updateSuccessRate()
    updateSolvedStates()
    loadNextPuzzle()
})

$('#hide_first_move').on('click', function() {
    hideFirstMove = document.getElementById('hide_first_move').checked
})

$('#keep_playing').on('click', function() {
    keepPlaying = document.getElementById('keep_playing').checked
})

$('#backward').on('click', function() {
    if (tactic !== null) {
        backward()
    }
})

$('#forward').on('click', function() {
    if (tactic !== null) {
        forward()
    }
})

$('#refresh').on('click', function() {
    refresh()
})

$('#reset').on('click', function() {
    setPanel($panel)
    reset()
})

$('#hint').on('click', function() {
    if (tactic !== null) {
        if (!tactic.solved && tactic.nextMove != null) {
            move = game.move(tactic.nextMove)
            game.undo()
            setPanel($panel, 'Hint: ' + getFullPieceName(move.piece))
            delay(() => {setPanel($panel)})
        }
    }
})

$('#solution').on('click', function() {
    if (tactic !== null) {
        if (!tactic.solved && tactic.nextMove != null) {
            setPanel($panel, 'Hint: ' + tactic.nextMove)
            delay(() => {setPanel($panel)})
        }
    }
})

$('#copyFEN').on('click', function() {
    if (game == null) {
        return
    }

    var fen = game.fen()
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

$('#previous').on('click', function() {
    if (puzzlesHistory == null) {
        return
    }

    var historyElement = puzzlesHistory.previous()
    loadHistoryElement(historyElement)
})

$('#next').on('click', function() {
    if (puzzlesHistory == null) {
        return
    }

    var historyElement = puzzlesHistory.next()
    if (historyElement == null) {
        loadNextPuzzle()
    } else {
        loadHistoryElement(historyElement)
    }
})

$('#favorite').on('click', function() {
    if (currentPuzzleId !== null) {
        if (favorites[currentPuzzleId] == true) {
            favorites[currentPuzzleId] = false
            unmarkButton('favorite')
        } else {
            favorites[currentPuzzleId] = true
            markButton('favorite')
        }

        storage.set('favorites', favorites)
    }
})

$('.board_settings').change(function() {
    saveLocalConfiguration()
})

$('.theme').change(function() {
    filterPuzzles(puzzles)
    saveLocalConfiguration()
})

$('.options').change(function() {
    filterPuzzles(puzzles)
    saveLocalConfiguration()
})

$('#random').on('click', function() {
    markButton('random')
    delay(loadNextPuzzle, 50)
})

$('#progressClear').on('click', function(event) {
    if (confirm('Are you sure you want to clear the progress? This cannot be undone.')) {
        progress.clear()
        updateSolvedStates()
        updateSuccessRate()
    }
})

$('#progressExport').on('click', function(event) {
    event.preventDefault()
    var element = document.createElement('a')
    data = progress.link()

    element.setAttribute('href', data)
    element.setAttribute('download', 'progress.json')
    element.click()
})

$('#progressImport').on('click', function(event) {
    var fileElement = document.getElementById('file')
    var file = fileElement.files[0]
    if (file == null) {
        alert('No progress file selected.')
        return
    }
    if (confirm('Are you sure you want to overwrite the progress? This cannot be undone.')) {
        readProgress(file)
    }
})

function loadHistoryElement(historyElement) {
    if (historyElement != null) {
        var previousPath = historyElement[0]
        var previousPuzzleId = historyElement[1]
        loadPGN(previousPath, previousPuzzleId, false)
    }
}

function readProgress(file) {
    var reader = new FileReader()
    reader.readAsText(file)
    reader.onload = function(event) {
        var data = JSON.parse(event.target.result)
        if (data != null) {
            try {
                progress.update(data)
                updateSolvedStates()
                updateSuccessRate()
                alert('Progress imported successfully.')
            } catch (error) {
                console.error(error)
            }
        }
    }
}

function updateNumberOfPuzzles(puzzles) {
    if (puzzles != null) {
        var numberOfPuzzles = Object.keys(puzzles).length
        var numberOfPuzzlesText = `${numberOfPuzzles} puzzles in total.`
        $('#number_of_puzzles').html(numberOfPuzzlesText)
    }
}

function updateSuccessRate() {
    var [correct, total, rate] = calculateSuccessRate()
    rate = parseFloat(100 * rate).toFixed(2)
    var successRateText = `Success rate: ${correct}/${total} (${rate}%).`
    $('#success_rate').html(successRateText)
}

function updateSolvedStatus(hash, value, moves) {
    var statusSymbol = getSolvedSymbol(value, moves)
    var puzzleId = `puzzle${hash}`
    var element = document.getElementById(puzzleId)
    if (element != null && value != null) {
        element.innerHTML = statusSymbol
        element.style.color = value >= moves ? 'green' : 'red'
        element.style.fontWeight = 'bold'
    }
}

function updateSolvedStates() {
    for (const hash in progress.container) {
        var value = progress.get(hash)
        var index = hashes[hash]
        if (index in puzzles) {
            var moves = puzzles[index].moves
            updateSolvedStatus(hash, value, moves)
        }
    }
}

function saveLocalConfiguration() {
    localConfiguration = {
        'board_settings': {
            'hide_first_move': $('#hide_first_move').prop('checked'),
            'keep_playing': $('#keep_playing').prop('checked')
        },
        'theme': {
            'checkmate': $('#checkmate').prop('checked'),
            'mating_net': $('#mating_net').prop('checked'),
            'material_advantage': $('#material_advantage').prop('checked'),
            'insufficient_material': $('#insufficient_material').prop('checked'),
            'repetition': $('#repetition').prop('checked'),
            'stalemate': $('#stalemate').prop('checked')
        },
        'options': {
            'unsolved': $('#unsolved').prop('checked'),
            'min_moves': $('#min_moves').prop('value'),
            'max_moves': $('#max_moves').prop('value'),
            'min_hardness': $('#min_hardness').prop('value'),
            'max_hardness': $('#max_hardness').prop('value')
        }
    }

    storage.set('configuration', localConfiguration)
}

function loadLocalConfiguration() {
    var localStorageConfiguration = storage.get('configuration')
    if (localStorageConfiguration != null) {
        localConfiguration = localStorageConfiguration
        for (const element of $('.board_settings')) {
            element.checked = localConfiguration['board_settings'][element.id]
        }

        for (const element of $('.theme')) {
            element.checked = localConfiguration['theme'][element.id]
        }

        for (const element of $('.options')) {
            element.checked = localConfiguration['options'][element.id]
            element.value = localConfiguration['options'][element.id]
        }
    }
}

function loadConfiguration() {
    fetch('configuration.json', {cache: 'no-cache'})
    .then(response => response.json())
    .then(json => {
        configuration = json
        progress.path = configuration['paths']['progress']
        puzzlesPath = configuration['paths']['gathered_puzzles']
        hardEvaluation = !configuration['tactic_player']['count_moves_instead_of_puzzles']
        refresh()
    })
}

function loadPuzzles() {
    fetch(puzzlesPath, {cache: 'no-cache'})
    .then(response => response.json())
    .then(json => {
        puzzles = json
        filterPuzzles(puzzles)

        for (var i = 0; i < puzzles.length; i++) {
            var puzzle = puzzles[i]
            hashes[puzzle.hash] = i
        }

        puzzlesLoaded.resolve()
        createPuzzleTable(puzzles)
        refreshPuzzleTable(filteredPuzzles)
    })
}

function getSolvedSymbol(value, moves) {
    if (value == null) {
        return ''
    }

    return `${value}/${moves}`
    // return value >= moves ? '✔' : '✘'
}

function gatherPuzzleTypes() {
    var puzzleTypes = []
    for (const element of $('.theme')) {
        if (element.checked) {
            var theme = element.id.replace('_', ' ')
            puzzleTypes.push(theme)
        }
    }

    return puzzleTypes
}

function filterPuzzles(puzzles) {
    if (puzzles == null) {
        return undefined
    }

    filteredPuzzles = []

    var puzzleTypes = gatherPuzzleTypes()
    var onlyUnsolved = document.getElementById('unsolved').checked
    var minMoves = $('#min_moves').val()
    var maxMoves = $('#max_moves').val()
    var minHardness = parseFloat($('#min_hardness').val())
    var maxHardness = parseFloat($('#max_hardness').val())

    for (const puzzle of puzzles) {
        var hardness = parseFloat(puzzle.hardness)
        if (
            puzzleTypes.includes(puzzle.puzzleType)
            && (!onlyUnsolved || !(puzzle.hash in progress.container))
            && puzzle.moves >= minMoves
            && puzzle.moves <= maxMoves
            && hardness >= minHardness
            && hardness <= maxHardness
        ) {
            filteredPuzzles.push(puzzle)
        }
    }

    refreshPuzzleTable(filteredPuzzles)
    updateNumberOfPuzzles(filteredPuzzles)
    updateSolvedStates()
}

function createPuzzleTable(puzzles) {
    clearTable('games_list_table')
    const tableObject = document.getElementById('games_list_table')
    for (const puzzle of puzzles) {
        var tr = document.createElement('tr')
        tr.id = `row${puzzle.hash}`

        var path = getPath(puzzle.path)
        var link = `javascript:loadPGN('${path}', '${puzzle.hash}')`
        var solved = getSolvedSymbol(progress.get(puzzle.hash), puzzle.moves)
        var puzzleId = `puzzle${puzzle.hash}`
        var playSymbol = favorites[puzzle.hash] == true ? '★' : '▶'

        if (favorites[puzzle.hash]) {
            tr.style.backgroundColor = '#b58863'
        }

        createTableRowEntry(tr, playSymbol, link)
        createTableRowEntry(tr, solved, null, puzzleId)
        createTableRowEntry(tr, puzzle.whiteToMove ? '◉' : '○')
        createTableRowEntry(tr, puzzle.white)
        createTableRowEntry(tr, puzzle.black)
        createTableRowEntry(tr, puzzle.date)
        createTableRowEntry(tr, puzzle.puzzleType)
        createTableRowEntry(tr, puzzle.moves)
        createTableRowEntry(tr, puzzle.hardness.toFixed(2))
        createTableRowEntry(tr, puzzle.initialEvaluation)
        tableObject.appendChild(tr)
    }

    sorttable.makeSortable(document.getElementById('games'))
}

async function refreshPuzzleTable(filteredPuzzles) {
    if (puzzles == null || progress == null || hashes == null) {
        return
    }

    actionId += 1
    var currentActionId = actionId
    for (const hash of Object.keys(hashes)) {
        $(`#row${hash}`).hide()
    }

    for (const puzzle of filteredPuzzles) {
        setTimeout(() => {
            if (currentActionId == actionId) {
                $(`#row${puzzle.hash}`).show()
            }
        }, 1)
    }
}

panelTextCallback = (text) => {setPanel($panel, text)}
statusTextCallback = (text) => {$status.html(text)}
moveHistoryTextCallback = (text) => {$moveHistory.html(text)}
loadPuzzlesCallback = loadPuzzles
filterPuzzlesCallback = filterPuzzles

beforeLoadCallback = () => {markButton('random')}
afterLoadCallback = (puzzleId) => {
    unmarkButton('random')
    setLinks(tactic.pgn, tactic.fen)
    setButton('favorite', favorites[puzzleId] == true)
}

progress = new Progress(
    () => {
        progressLoaded.resolve()
        updateSuccessRate()
    }, (key, value, moves) => {
        updateSolvedStatus(key, value, moves)
        updateSuccessRate()
    }
)

configuration = loadConfiguration()
loadLocalConfiguration()
loadFavorites()

hideFirstMove = document.getElementById('hide_first_move').checked
keepPlaying = document.getElementById('keep_playing').checked
markButton('random')
