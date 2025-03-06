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

function clearTable(table, loading) {
    const node = document.getElementById(table)
    while (node.firstChild) {
        node.removeChild(node.lastChild)
    }

    if (loading != null) {
        var tr = document.createElement('tr')
        var td = document.createElement('td')
        td.colSpan = loading
        td.innerHTML = 'loading...'
        tr.appendChild(td)
        node.appendChild(tr)
    }
}

function setTableRowEntry(tdId, text, link, rowClass, backgroundColor) {
    let td;
    if (typeof tdId === 'string') {
        td = document.getElementById(tdId);
    } else {
        td = tdId;
    }

    td.innerHTML = ''
    var textNode = document.createTextNode(text);
    if (link != null) {
        var a = document.createElement('a');
        if (link.code != null) {
            a.onclick = link.code;
            a.style.cursor = 'pointer';
        }
        if (link.link != null) {
            a.href = link.link;
        }
        a.appendChild(textNode);
        td.appendChild(a);
    } else {
        td.appendChild(textNode);
    }

    if (backgroundColor != null) {
        td.style.backgroundColor = backgroundColor;
    }

    if (rowClass != null) {
        td.classList.add(rowClass);
    }
}

function createTableRowEntry(tr, text, link, id, rowClass, backgroundColor) {
    var td = document.createElement('td')
    if (id != null) {
        td.id = id
    }

    setTableRowEntry(td, text, link, rowClass, backgroundColor);
    tr.appendChild(td)
    return td
}

function loadFavorites() {
    favorites = storage.get('favorites')
}

function colorSquare(square, color) {
    if (square == null || color == null) {
        return
    }

    var $square = $(`.square-${square}`)

    var background = color.lightSquare
    if ($square.hasClass('black-3c85d')) {
        background = color.darkSquare
    }

    $square.css('background', background)
}

function clearSquaresColors () {
    $('.square-55d63').css('background', '')
}

function bindKeys(backward, forward) {
    document.onkeydown = function checkKey(event) {
        event = event || window.event;

        if (event.keyCode == '37') {
            backward()
        } else if (event.keyCode == '39') {
            forward()
        }
    }
}
