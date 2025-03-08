board = Chessboard("endgame_board");

const $panel = $("#panel");
const maxMateInValues = {
    KRvK: 16,
    KQvK: 10,
    KPvK: 28,
    KRRvK: 7,
    KBBvK: 19,
    KBNvK: 33,
};

let game = null;
let player = null;
let movesList = null;

let wait = false;
const delayTime = 500;

let moveIndex = null;

$("#backward").on("click", function () {
    backward();
});

$("#forward").on("click", function () {
    forward();
});

$("#flip").on("click", function () {
    board.flip();
});

$("#copyFEN").on("click", function () {
    if (game == null) {
        return;
    }

    const fen = game.chess.fen();
    if (fen != null && fen != "") {
        navigator.clipboard.writeText(fen);
        setPanel($panel, "FEN copied to clipboard!");
    }
});

$("#copyPGN").on("click", function () {
    // not implemented yet
});

function getConfig() {
    return {
        draggable: true,
        position: fen,
        onDragStart: onDragStart,
        onDrop: onDrop,
        onSnapEnd: onSnapEnd,
    };
}

function setPosition() {
    board.position(game.getFEN());
    setMateCounter(game.getDTZ());
    colorSquares();
}

function onDrop(source, target) {
    document.getElementsByTagName("body")[0].style.overflow = "scroll";
    const uci = source + target;
    const fen = game.getFEN();
    const isLastMove = game.isLastMove();
    const move = game.move(uci);

    if (move === null) {
        return "snapback";
    } else {
        if (!isLastMove) {
            movesList.truncate(game.currentMove - 1);
            movesList.render();
        }
        moveIndex = game.currentMove;
        movesList.addMove(uci, move.san, true);
        sendMove(fen, uci);
    }
}

function onDragStart(source, piece, position, orientation) {
    if (game == null) {
        return false;
    }

    const turn = game.getTurn();
    if (game.isOver() || turn != player) {
        return false;
    }

    if (
        (turn === "w" && piece.search(/^b/) !== -1) ||
        (turn === "b" && piece.search(/^w/) !== -1)
    ) {
        return false;
    }

    document.getElementsByTagName("body")[0].style.overflow = "hidden";
}

function onSnapEnd() {
    setPosition();
}

function forward() {
    const previousMoveIndex = moveIndex;
    if (!wait && game !== null && game.forward()) {
        moveIndex = game.currentMove - 1;
        movesList.highlightNextMove(previousMoveIndex, moveIndex);
        setPosition();
    }
}

function backward() {
    const previousMoveIndex = moveIndex;
    if (!wait && game !== null && game.backward()) {
        moveIndex = game.currentMove - 1;
        movesList.highlightNextMove(previousMoveIndex, moveIndex);
        setPosition();
    }
}

function goTo(moveIndex) {
    if (!wait && game !== null) {
        // not implemented
        setPosition();
    }
}

function updateMoveRating(rating) {
    if (rating != "") {
        movesList.updateReview(game.currentMove - 1, rating);
        colorSquares();
    }
}

function prepareMateCounter(dtm) {
    const result = game.getResult();
    if (result != null) {
        return result;
    }

    if (dtm === null || dtm === undefined || dtm == 0) {
        return "-";
    }

    const sign = dtm < 0 ? "-" : "";
    const movesToMate = Math.ceil((Math.abs(dtm) + 1) / 2);
    return `${sign}M${movesToMate}`;
}

function setMateCounter(dtm) {
    const mateCounter = prepareMateCounter(dtm);
    document.getElementById("mate_counter").innerText = mateCounter;
}

function sendMove(fen, uci) {
    const difficulty = document.getElementById("difficulty").value;
    const beta = difficulty == 1.0 ? "inf" : difficulty / (1 - difficulty);

    clearSquaresColors();
    const data = {
        fen: fen,
        move: uci,
        beta: beta,
    };

    fetch("/endgame/move", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
    })
        .then((response) => {
            if (!response.ok) {
                throw new Error(
                    "Network response was not ok " + response.statusText,
                );
            }
            return response.json();
        })
        .then((data) => {
            game.updateDTZ(data.previous_dtm);
            setMateCounter(data.previous_dtm);
            updateMoveRating(data.previous_rating);

            wait = true;
            setTimeout(() => {
                moveIndex = game.currentMove;
                board.position(data.fen);
                if (data.uci != null) {
                    game.move(data.uci, data.current_dtm);
                    setMateCounter(data.current_dtm);
                    movesList.addMove(data.uci, data.san, true);
                    updateMoveRating(data.current_rating);
                }
                wait = false;
            }, delayTime);
        })
        .catch((error) => {
            console.error("Error making move:", error);
            wait = false;
        });
}

function requestNewGame() {
    const mateIn = document.getElementById("mate_in").value;
    const dtm = mateIn * 2 - 1;
    const whiteToPlay = document.getElementById("side").value;
    const bishopColor = document.getElementById("bishop_color").value;
    const layout = document.getElementById("study_layout").value;

    const data = {
        layout: layout,
        dtm: dtm,
        white: whiteToPlay == "random" ? null : whiteToPlay == "white",
        bishop_color: bishopColor == "random" ? null : bishopColor == "light",
    };

    markButton("new_study");
    fetch("/endgame/start", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
    })
        .then((response) => {
            if (!response.ok) {
                unmarkButton("new_study");
                throw new Error(response.statusText);
            }
            return response.json();
        })
        .then((data) => {
            fen = data.fen;
            console.log("New game started:", fen);
            setTimeout(() => {
                startNewGame(fen, dtm);
                movesList = new MovesList(
                    [],
                    [],
                    game.getTurn() == "b",
                    () => {},
                );
            }, 50);
        })
        .catch((error) => {
            console.error("Error starting new game:", error);
            alert(
                `Endgame positions for ${layout} are not generated yet. Please generate them first.`,
            );
            markButton("new_study");
        });
}

function startNewGame(fen, dtm) {
    board = Chessboard("endgame_board", getConfig());
    game = new Game(fen, dtm);
    player = game.getTurn();
    setMateCounter(dtm);
    unmarkButton("new_study");

    if (player == "b") {
        board.flip();
    }
}

function colorSquares() {
    clearSquaresColors();
    const move = movesList.review[game.currentMove - 1];
    if (move != null) {
        const color = movesList.getMoveColor(
            movesList.getMoveType(move.classification),
        );
        colorSquare(move.move.slice(0, 2), color);
        colorSquare(move.move.slice(2, 4), color);
    }
}

requestNewGame();
bindKeys(backward, forward);
document.getElementById("new_study").addEventListener("click", requestNewGame);
document.getElementById("study_layout").addEventListener("change", function () {
    const layout = this.value;
    const maxMateIn = maxMateInValues[layout];
    const mateInInput = document.getElementById("mate_in");

    mateInInput.max = maxMateIn;

    if (parseInt(mateInInput.value) > maxMateIn) {
        mateInInput.value = maxMateIn;
    }

    const bishopColorRow =
        document.getElementById("bishop_color").parentElement.parentElement;
    if (layout === "KBNvK") {
        bishopColorRow.style.display = "";
    } else {
        bishopColorRow.style.display = "none";
    }
});

document.getElementById("study_layout").dispatchEvent(new Event("change"));
