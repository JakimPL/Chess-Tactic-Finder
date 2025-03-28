import Colors from "./colors.js";

export function getPath(path) {
    return "/" + path.replace(/[\\/]+/g, "/").replace(/^([a-zA-Z]+:|\.\/)/, "");
}

export function getFullPieceName(piece) {
    piece = piece.toLowerCase();
    switch (piece) {
    case "p":
        return "Pawn";
    case "n":
        return "Knight";
    case "b":
        return "Bishop";
    case "r":
        return "Rook";
    case "q":
        return "Queen";
    case "k":
        return "King";
    }
}

export function markButton(button) {
    document.getElementById(button).style.backgroundColor =
        Colors.darkSquareColor;
}

export function unmarkButton(button) {
    document.getElementById(button).style.backgroundColor =
        Colors.lightSquareColor;
}

export function setButton(buttonId, value) {
    if (value) {
        markButton(buttonId);
    } else {
        unmarkButton(buttonId);
    }
}

export function setLinks(pgn, fen) {
    const chessLink = `https://www.chess.com/analysis?pgn=${pgn}`;
    document.getElementById("analyze_chess").href = encodeURI(chessLink);

    const lichessLink = `https://lichess.org/analysis/${fen}`;
    document.getElementById("analyze_lichess").href = encodeURI(lichessLink);
}

export function setPanel(element, text) {
    if (text === null || text === undefined || text === "") {
        element.html("&nbsp");
    } else {
        element.html(text);
    }
}

export function removeChildren(element) {
    while (element.firstChild) {
        element.removeChild(element.lastChild);
    }
}

export function clearTable(table, loading) {
    const node = document.getElementById(table);
    removeChildren(node);

    if (loading !== undefined) {
        const tr = document.createElement("tr");
        const td = document.createElement("td");
        td.colSpan = loading;
        td.innerHTML = "loading...";
        tr.appendChild(td);
        node.appendChild(tr);
    }
}

export function setTableRowEntry(tdId, text, link, rowClass, backgroundColor) {
    let td;
    if (typeof tdId === "string") {
        td = document.getElementById(tdId);
    } else {
        td = tdId;
    }

    td.innerHTML = "";
    const textNode = document.createTextNode(text);
    if (link !== null && link !== undefined) {
        const a = document.createElement("a");
        if (link.code !== null) {
            a.onclick = link.code;
            a.style.cursor = "pointer";
        }
        if (link.link !== null) {
            a.href = link.link;
        }
        a.appendChild(textNode);
        td.appendChild(a);
    } else {
        td.appendChild(textNode);
    }

    if (backgroundColor !== null) {
        td.style.backgroundColor = backgroundColor;
    }

    if (rowClass !== null) {
        td.classList.add(rowClass);
    }
}

export function createTableRowEntry(
    tr,
    text,
    link,
    id,
    rowClass,
    backgroundColor,
) {
    const td = document.createElement("td");
    if (id !== null) {
        td.id = id;
    }

    setTableRowEntry(td, text, link, rowClass, backgroundColor);
    tr.appendChild(td);
    return td;
}

export function loadFavorites(storage) {
    return storage.get("favorites");
}

export function fetchLayoutsDefinitions() {
    return fetch("/endgame/layouts_definitions")
        .then(response => response.json())
        .then(definitions => {
            const layouts = definitions.layouts;
            const ranges = definitions.ranges;
            const layoutSelect = document.getElementById("study_layout");
            removeChildren(layoutSelect);
            for (const [description, value] of Object.entries(layouts)) {
                const option = document.createElement("option");
                option.value = value;
                option.text = description;
                layoutSelect.appendChild(option);
            }

            return [layouts, ranges];
        })
        .catch(error => console.error("Error fetching layouts definitions:", error));
}

export function getPieceSymbol(symbol, white = true) {
    switch (symbol) {
    case "K":
        return white ? "♔" : "♚";
    case "Q":
        return white ? "♕" : "♛";
    case "R":
        return white ? "♖" : "♜";
    case "B":
        return white ? "♗" : "♝";
    case "N":
        return white ? "♘" : "♞";
    case "P":
        return white ? "♙" : "♟";
    default:
        return " ";
    }
}

export function getPiecesSymbol(pieces, white) {
    return pieces.split("").map(piece => getPieceSymbol(piece, white)).join("");
}

export function blockScroll(boardId) {
    jQuery(`#${boardId}`).on("scroll touchmove touchend touchstart contextmenu", function(e){
        e.preventDefault();
    });
}
