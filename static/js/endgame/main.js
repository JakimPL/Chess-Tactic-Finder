import { bindKey, bindKeys } from "../bindings.js";
import Colors from "../colors.js";
import MovesList from "../movesList.js";
import {
    clearSquaresColors,
    colorSquare,
    markButton,
    unmarkButton,
} from "../common.js";

import Game from "./game.js";

const $panel = $("#panel");
const maxMateInValues = {
    KRvK: 16,
    KQvK: 10,
    KPvK: 28,
    KQvKB: 17,
    KQvKN: 21,
    KQvKR: 35,
    KRRvK: 7,
    KBBvK: 19,
    KBNvK: 33,
};

let board = Chessboard("endgame_board");
let game = null;
let player = null;
let moveIndex = null;
let movesList = null;
let hint = null;

let wait = false;
const delayTime = 500;

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
    if (game === null) {
        return;
    }

    const fen = game.chess.fen();
    if (fen !== null && fen !== "") {
        navigator.clipboard.writeText(fen);
        setPanel($panel, "FEN copied to clipboard!");
    }
});

$("#copyPGN").on("click", function () {
    // not implemented yet
});

$("#hint").on("click", function () {
    getHint();
});

function getConfig(fen) {
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
    hint = null;
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

function onDragStart(source, piece) {
    if (game === null) {
        return false;
    }

    const turn = game.getTurn();
    if (game.isOver() || turn !== player) {
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

function goTo() {
    if (!wait && game !== null) {
        setPosition();
    }
}

function updateMoveRating(rating) {
    if (rating !== "") {
        movesList.updateReview(game.currentMove - 1, rating);
        colorSquares();
    }
}

function prepareMateCounter(dtm) {
    const result = game.getResult();
    if (result !== null && result !== undefined) {
        return result;
    }

    if (dtm === null || dtm === undefined || dtm === 0) {
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

function getHint() {
    if (game === null) {
        return;
    }

    if (hint !== null) {
        const source = hint.slice(0, 2);
        const target = hint.slice(2, 4);
        colorSquare(source, Colors.hintColor);
        colorSquare(target, Colors.hintColor);
        return;
    }

    const fen = game.getFEN();
    const data = {
        fen: fen,
        move: "",
        beta: "inf",
    };

    fetch("/endgame/hint", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
    })
        .then((response) => {
            if (!response.ok) {
                throw new Error(
                    "Network error: " + response.statusText,
                );
            }
            return response.json();
        })
        .then((reply) => {
            hint = reply.uci;
            const source = hint.slice(0, 2);
            colorSquare(source, Colors.hintColor);
        })
        .catch((error) => {
            console.error("Error during retrieving a hint:", error);
        });
}

function sendMove(fen, uci) {
    const difficulty = document.getElementById("difficulty").value;
    const beta = parseFloat(difficulty) === 1.0 ? "inf" : difficulty / (1 - difficulty);

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
                    "Network error: " + response.statusText,
                );
            }
            return response.json();
        })
        .then((reply) => {
            game.updateDTZ(reply.previous_dtm);
            setMateCounter(reply.previous_dtm);
            updateMoveRating(reply.previous_rating);

            wait = true;
            setTimeout(() => {
                moveIndex = game.currentMove;
                board.position(reply.fen);
                if (reply.uci !== null) {
                    game.move(reply.uci, reply.current_dtm);
                    setMateCounter(reply.current_dtm);
                    movesList.addMove(reply.uci, reply.san, true);
                    updateMoveRating(reply.current_rating);
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
        white: whiteToPlay === "random" ? null : whiteToPlay === "white",
        bishop_color: bishopColor === "random" ? null : bishopColor === "light",
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
        .then((reply) => {
            const fen = reply.fen;
            console.log("New game started:", fen);
            setTimeout(() => {
                startNewGame(fen, dtm);
                movesList = new MovesList(
                    [],
                    [],
                    game.getTurn() === "b",
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
    board = Chessboard("endgame_board", getConfig(fen));
    game = new Game(fen, dtm);
    player = game.getTurn();
    setMateCounter(dtm);
    unmarkButton("new_study");

    if (player === "b") {
        board.flip();
    }
}

function colorSquares() {
    clearSquaresColors();
    const move = movesList.review[game.currentMove - 1];
    if (move !== null && move !== undefined) {
        const color = movesList.getMoveColor(
            movesList.getMoveType(move.classification),
        );
        colorSquare(move.move.slice(0, 2), color);
        colorSquare(move.move.slice(2, 4), color);
    }
}

bindKeys(backward, forward);
bindKey(72, getHint);

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
document.addEventListener("DOMContentLoaded", function() {
    fetch("/endgame/layouts")
        .then(response => response.json())
        .then(availableLayouts => {
            const studyLayoutSelect = document.getElementById("study_layout");
            const options = studyLayoutSelect.options;
            let hasAvailableOptions = false;
            for (let i = 0; i < options.length; i++) {
                const option = options[i];
                if (!availableLayouts.includes(option.value)) {
                    option.disabled = true;
                    option.style.color = "grey";
                } else {
                    hasAvailableOptions = true;
                }
            }

            if (!hasAvailableOptions) {
                alert("No endgame layouts are available. Please generate them beforehand.");
            }
        })
        .catch(error => console.error("Error fetching layouts:", error));
});
