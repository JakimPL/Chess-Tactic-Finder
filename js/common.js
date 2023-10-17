var lightSquareColor = '#f0d9b5'
var darkSquareColor = '#b58863'

var brilliantMoveColor = '#1baca6'
var greatMoveColor = '#5c8bb0'
var bestMoveColor = '#95bb4a'
var inaccuracyColor = '#e8a825'
var mistakeColor = '#e87a25'
var missColor = '#ee6b55'
var blunderColor = '#ca3431'

function getPath(path) {
    return path.replace(/[\\/]+/g, '/').replace(/^([a-zA-Z]+:|\.\/)/, '')
}

function markButton(button) {
    document.getElementById(button).style.backgroundColor = darkSquareColor
}

function unmarkButton(button) {
    document.getElementById(button).style.backgroundColor = lightSquareColor
}

function delay(callback, time) {
    var time = time == null ? delayTime : time
    wait = true
    action += 1
    var currentAction = action
    setTimeout(() => {
        if (action == currentAction) {
            callback()
        }

        wait = false
        updateStatus()
    }, time)
}

function setButton(buttonId, value) {
    if (value) {
        markButton(buttonId)
    } else {
        unmarkButton(buttonId)
    }
}

function setLinks(pgn, fen) {
    var chessLink = `https://www.chess.com/analysis?pgn=${pgn}`
    document.getElementById('analyze_chess').href = encodeURI(chessLink)

    var lichessLink = `https://lichess.org/analysis/${fen}`
    document.getElementById('analyze_lichess').href = encodeURI(lichessLink)
}

function setPanel(element, text) {
    if (text == null || text == '') {
        element.html('&nbsp')
    } else {
        element.html(text)
    }
}

function clearTable(table) {
    const node = document.getElementById(table)
    while (node.firstChild) {
        node.removeChild(node.lastChild)
    }
}

function createTableRowEntry(tr, text, link, id, backgroundColor) {
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

    if (backgroundColor != null) {
        td.style.backgroundColor = backgroundColor
    }

    tr.appendChild(td)
    return td
}

function loadFavorites() {
    favorites = storage.get('favorites')
}

function colorSquare(square, color) {
    var $square = $(`.square-${square}`)

    var background = color
    if ($square.hasClass('black-3c85d')) {
        background = color
    }

    $square.css('background', background)
}

function clearSquaresColors () {
    $('.square-55d63').css('background', '')
}
