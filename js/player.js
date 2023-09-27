board = Chessboard('board')

const $status = $('#status')
const $moveHistory = $('#moveHistory')
const $panel = $('#panel')

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
    setPanel()
    reset()
})

$('#hint').on('click', function() {
    if (tactic !== null) {
        if (!tactic.solved && tactic.nextMove != null) {
            move = game.move(tactic.nextMove)
            game.undo()
            setPanel('Hint: ' + getFullPieceName(move.piece))
            delay(() => {setPanel()})
        }
    }
})

$('#solution').on('click', function() {
    if (tactic !== null) {
        if (!tactic.solved && tactic.nextMove != null) {
            setPanel('Hint: ' + tactic.nextMove)
            delay(() => {setPanel()})
        }
    }
})

$('#copyFEN').on('click', function() {
    if (fen !== null) {
        navigator.clipboard.writeText(fen)
        setPanel('FEN copied to clipboard!')
    }
})

$('#copyPGN').on('click', function() {
    if (pgn !== null) {
        navigator.clipboard.writeText(pgn)
        setPanel('PGN copied to clipboard!')
    }
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
        progress = {}
        localStorage.setItem('progress', JSON.stringify(progress))
        updateSolvedStates()
        updateSuccessRate()
    }
})

$('#progressExport').on('click', function(event) {
    event.preventDefault()
    var element = document.createElement('a')
    if (useLocalStorage) {
        var data = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(progress))
    } else {
        var data = progressPath
    }

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

function readProgress(file) {
    var reader = new FileReader()
    reader.readAsText(file)
    reader.onload = function(event) {
        var data = JSON.parse(event.target.result)
        if (data != null) {
            try {
                progress = data
                localStorage.setItem('progress', JSON.stringify(progress))
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
    var [correct, total, rate] = calculateSuccessRate(progress)
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
    for (const hash in progress) {
        var value = progress[hash]
        var index = hashes[hash]
        if (index in puzzles) {
            var moves = puzzles[index].moves
            updateSolvedStatus(hash, value, moves)
        }
    }
}

function saveLocalConfiguration() {
    localConfiguration = {
        'theme': {
            'checkmate': $('#checkmate').prop('checked'),
            'mating_net': $('#mating_net').prop('checked'),
            'material_advantage': $('#material_advantage').prop('checked'),
            'repetition': $('#repetition').prop('checked'),
            'stalemate': $('#stalemate').prop('checked'),
        },
        'options': {
            'unsolved': $('#unsolved').prop('checked'),
            'min_moves': $('#min_moves').prop('value'),
            'max_moves': $('#max_moves').prop('value'),
            'min_hardness': $('#min_hardness').prop('value'),
            'max_hardness': $('#max_hardness').prop('value'),
        }
    }

    localStorage.setItem('configuration', JSON.stringify(localConfiguration))
}

function loadLocalConfiguration() {
    var localStorageConfiguration = JSON.parse(localStorage.getItem('configuration'))
    if (localStorageConfiguration != null) {
        localConfiguration = localStorageConfiguration
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
        progressPath = configuration['paths']['progress']
        puzzlesPath = configuration['paths']['gathered_puzzles']
        hardEvaluation = !configuration['tactic_player']['count_moves_instead_of_puzzles']
        useLocalStorage = configuration['tactic_player']['use_local_storage']
        refresh()
    })
}

function loadProgress() {
    if (useLocalStorage) {
        if ('progress' in localStorage) {
            progress = JSON.parse(localStorage.getItem('progress'))
        } else {
            progress = {}
            localStorage.setItem('progress', JSON.stringify(progress))
        }

        progressLoaded.resolve()
    } else {
        fetch(progressPath, {cache: 'no-cache'})
        .then(response => response.json())
        .then(json => {
            progress = json
            progressLoaded.resolve()
        })
    }
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
            && (!onlyUnsolved || !(puzzle.hash in progress))
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

function clearPuzzleTable() {
    const node = document.getElementById('puzzleList')
    while (node.firstChild) {
        node.removeChild(node.lastChild)
    }
}

function createPuzzleTableRowEntry(tr, text, link, id) {
    var td = document.createElement('td')
    if (id != null) {
        td.id = id
    }

    var textNode = document.createTextNode(text)
    if (link != null) {
        var a = document.createElement('a')
        a.href = link
        a.appendChild(textNode)
        td.appendChild(a)
    } else {
        td.appendChild(textNode)
    }

    tr.appendChild(td)
}

function createPuzzleTable(puzzles) {
    clearPuzzleTable()
    const tableObject = document.getElementById('puzzleList')
    for (const puzzle of puzzles) {
        var tr = document.createElement('tr')
        tr.id = `row${puzzle.hash}`

        var path = getPuzzlePath(puzzle)
        var link = `javascript:loadPGN('${path}', '${puzzle.hash}')`
        var solved = getSolvedSymbol(progress[puzzle.hash], puzzle.moves)
        var puzzleId = `puzzle${puzzle.hash}`

        createPuzzleTableRowEntry(tr, '▶', link)
        createPuzzleTableRowEntry(tr, solved, null, puzzleId)
        createPuzzleTableRowEntry(tr, puzzle.whiteToMove ? '◉' : '○')
        createPuzzleTableRowEntry(tr, puzzle.white)
        createPuzzleTableRowEntry(tr, puzzle.black)
        createPuzzleTableRowEntry(tr, puzzle.date)
        createPuzzleTableRowEntry(tr, puzzle.puzzleType)
        createPuzzleTableRowEntry(tr, puzzle.moves)
        createPuzzleTableRowEntry(tr, puzzle.hardness.toFixed(2))
        createPuzzleTableRowEntry(tr, puzzle.initialEvaluation)
        tableObject.appendChild(tr)
    }

    sorttable.makeSortable(document.getElementById('puzzles'))
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

panelTextCallback = setPanel
statusTextCallback = (text) => {$status.html(text)}
moveHistoryTextCallback = (text) => {$moveHistory.html(text)}
progressCallback = updateSolvedStatus
loadPuzzlesCallback = loadPuzzles
loadProgressCallback = loadProgress
updateSuccessRateCallback = updateSuccessRate
filterPuzzlesCallback = filterPuzzles

beforeLoadCallback = () => {markButton('random')}
afterLoadCallback = () => {
    unmarkButton('random')
    var chessLink = `https://www.chess.com/analysis?pgn=${pgn}`
    document.getElementById('analyze_chess').href = encodeURI(chessLink)

    var lichessLink = `https://lichess.com/analysis/${fen}`
    document.getElementById('analyze_lichess').href = encodeURI(lichessLink)
}

hideFirstMove = document.getElementById('hide_first_move').checked
keepPlaying = document.getElementById('keep_playing').checked
markButton('random')

configuration = loadConfiguration()
loadLocalConfiguration()
