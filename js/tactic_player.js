board = Chessboard('board')

const $status = $('#status')
const $moveHistory = $('#moveHistory')
const $panel = $('#panel')

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
    }
})

$('#copyPGN').on('click', function() {
    if (fen !== pgn) {
        navigator.clipboard.writeText(pgn)
    }
})

$('.theme').change(function() {
    filterPuzzles(puzzles)
})

$('.options').change(function() {
    filterPuzzles(puzzles)
})

$('#random').on('click', function() {
    loadNextPuzzle()
})

function updateNumberOfPuzzles(puzzles) {
    if (puzzles != null) {
        var numberOfPuzzles = Object.keys(puzzles).length
        var numberOfPuzzlesText = `${numberOfPuzzles} puzzles in total.`
        $('#number_of_puzzles').html(numberOfPuzzlesText)
    }
}

function loadProgress() {
    fetch(progressPath, {cache: 'no-cache'})
    .then(response => response.json())
    .then(json => {
        progress = json

        var [correct, total, rate] = calculateSuccessRate(progress)
        rate = parseFloat(100 * rate).toFixed(2)
        var successRateText = `Success rate: ${correct}/${total} (${rate}%).`
        $('#success_rate').html(successRateText)
    })
}

function loadPuzzles() {
    fetch(puzzlesPath)
    .then(response => response.json())
    .then(json => {
        puzzles = json
        filterPuzzles(json)
    })
}

function getSolvedSymbol(value) {
    if (value == null) {
        return ''
    }

    return value ? '✔' : '✘'
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

    createPuzzleTable(filteredPuzzles)
    updateNumberOfPuzzles(filteredPuzzles)
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
        var tr = document.createElement('tr');

        var path = getPuzzlePath(puzzle)
        var link = `javascript:loadPGN('${path}', '${puzzle.hash}')`
        var solved = getSolvedSymbol(progress[puzzle.hash])
        var puzzleId = `puzzle${puzzle.hash}`

        createPuzzleTableRowEntry(tr, '▶', link)
        createPuzzleTableRowEntry(tr, solved, null, puzzleId)
        createPuzzleTableRowEntry(tr, puzzle.whiteToMove)
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

function updateSolvedStatus(currentPuzzleId, value) {
    var statusSymbol = getSolvedSymbol(value)
    var $element = $('#puzzle' + currentPuzzleId)
    if ($element != null && progress[currentPuzzleId] == null) {
        $element.html(statusSymbol)
    }
}

panelTextCallback = setPanel
statusTextCallback = (text) => {$status.html(text)}
moveHistoryTextCallback = (text) => {$moveHistory.html(text)}
loadNextPuzzleCallback = loadNextPuzzle
progressCallback = updateSolvedStatus
refreshCallback = refresh
loadPuzzlesCallback = loadPuzzles
loadProgressCallback = loadProgress

refresh()
