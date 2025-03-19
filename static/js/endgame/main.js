import ChessBoard from "../board/chessground.js";

import { bindKey, bindKeys } from "../bindings.js";
import Colors from "../colors.js";
import MovesList from "../movesList.js";
import {
    blockScroll,
    fetchLayoutsDefinitions,
    getPiecesSymbol,
    markButton,
    removeChildren,
    setLinks,
    setPanel,
    unmarkButton,
} from "../common.js";

import Game from "./game.js";

const $panel = $("#panel");

const board = new ChessBoard("endgame_board", true, onDragStart, onDrop, onSnapEnd, onPremoveSet, onPremoveUnset);

let game = null;
let player = null;
let moveIndex = null;
let movesList = null;
let hint = null;
let counterValue = "-";

let premove = null;
const premoveDelay = 50;

let layouts = null;
let layoutRanges = null;

let requestWait = false;
let wait = false;
const delayTime = 500;
const newGameDelayTime = 1000;

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

    const fen = game.getFEN();
    if (fen !== null && fen !== "") {
        navigator.clipboard.writeText(fen);
        setPanel($panel, "FEN copied to clipboard!");
    }
});

$("#copyPGN").on("click", function () {
    const pgn = game.getPGN();
    if (pgn !== null && pgn !== "") {
        navigator.clipboard.writeText(pgn);
        setPanel($panel, "PGN copied to clipboard!");
    }
});

$("#hint").on("click", function () {
    getHint();
});

function setPosition() {
    const dtz = game.getDTZ();
    const fen = game.getFEN();
    const pgn = game.getPGN();

    board.setPosition(fen);
    setMateCounter(dtz);
    colorSquares();
    hint = null;

    setLinks(pgn, fen);
}

function onDrop(source, target) {
    document.getElementsByTagName("body")[0].style.overflow = "scroll";
    let uci = source + target;
    const fen = game.getFEN();
    const isLastMove = game.isLastMove();
    const move = game.move(uci);

    if (move === null) {
        return "snapback";
    } else {
        if (move.promotion !== undefined) {
            uci += move.promotion;
        }
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

function onPremoveSet(source, target) {
    board.colorSquare(source, Colors.forcedColor);
    board.colorSquare(target, Colors.forcedColor);
    premove = [source, target];
}

function onPremoveUnset() {
    premove = null;
}

function updateMove(reply) {
    game.updateDTZ(reply.previous_dtm);
    setMateCounter(reply.previous_dtm);
    updateMoveRating(reply.previous_rating);

    wait = true;
    setTimeout(() => {
        moveIndex = game.currentMove;
        board.setPosition(reply.fen);
        if (reply.uci !== null) {
            makeOpponentMove(reply);
        }
        wait = false;
    }, delayTime);
}

function makeOpponentMove(reply) {
    game.move(reply.uci, reply.current_dtm);
    setMateCounter(reply.current_dtm);
    movesList.addMove(reply.uci, reply.san, true);
    updateMoveRating(reply.current_rating);
    setPosition();
    setTimeout(tryPremove, premoveDelay);
}

function tryPremove() {
    if (premove !== null) {
        const [source, target] = premove;
        onDrop(source, target);
        setPosition();
        premove = null;
    }
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

function goTo(index) {
    const previousMoveIndex = moveIndex;
    if (!wait && game !== null && game.goTo(index + 1)) {
        moveIndex = game.currentMove - 1;
        movesList.highlightNextMove(previousMoveIndex, moveIndex);
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
    if (game === null || dtm === null || dtm === undefined || dtm === 0) {
        return ["-", true];
    }

    const result = game.getResult();
    if (result !== null && result !== undefined) {
        return [result, true];
    }

    const sign = dtm < 0 ? "-" : "";
    const movesToMate = Math.ceil((Math.abs(dtm) + 1) / 2);
    return [`${sign}M${movesToMate}`, false];
}

function setMateCounter(dtm) {
    const hideCounter = document.getElementById("hide_counter").checked;
    const mateCounter = document.getElementById("mate_counter");

    let gameOver;
    [counterValue, gameOver] = prepareMateCounter(dtm);
    if (hideCounter && !gameOver) {
        mateCounter.innerText = "*";
    } else {
        mateCounter.innerText = counterValue;
    }
}

function getHint() {
    if (game === null) {
        return;
    }

    if (hint !== null) {
        const source = hint.slice(0, 2);
        const target = hint.slice(2, 4);
        board.colorSquare(source, Colors.hintColor);
        board.colorSquare(target, Colors.hintColor);
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
            board.colorSquare(source, Colors.hintColor);
        })
        .catch((error) => {
            console.error("Error during retrieving a hint:", error);
        });
}

function sendMove(fen, uci) {
    const playerWon = (
        (game.getResult() === "1-0" && game.startingSide === "w")
        || (game.getResult() === "0-1" && game.startingSide === "b")
    );

    if (playerWon) {
        const keepPlaying = document.getElementById("keep_playing").checked;
        if (keepPlaying) {
            setTimeout(() => {
                wait = false;
                requestWait = false;
                requestNewGame();
            }, newGameDelayTime);
        }
    }

    const difficulty = document.getElementById("difficulty").value;
    const beta = parseFloat(difficulty) === 1.0 ? "inf" : difficulty / (1 - difficulty);

    board.clearSquaresColors();
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
            updateMove(reply);
        })
        .catch((error) => {
            console.error("Error making move:", error);
            wait = false;
        });
}

function requestNewGame() {
    if (wait || requestWait) {
        return;
    }

    const distanceToMate = document.getElementById("distance_to_mate_or_zeroing").checked;
    const mateIn = document.getElementById("mate_in").value;
    const counter = 2 * mateIn - 1;
    const whiteToPlay = document.getElementById("side").value;
    const bishopColor = document.getElementById("bishop_color").value;
    const layout = document.getElementById("study_layout").value;
    const side = document.getElementById("pieces").value;

    const data = {
        layout: layout,
        dtm: distanceToMate ? counter : null,
        dtz: distanceToMate ? null : counter,
        white: whiteToPlay === "random" ? null : whiteToPlay === "white",
        bishop_color: bishopColor === "random" ? null : bishopColor === "light",
        side_pieces: side,
    };

    requestWait = true;
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
                requestWait = false;
                throw new Error(response.statusText);
            }
            return response.json();
        })
        .then((reply) => {
            const fen = reply.fen;
            const disableReview = document.getElementById("hide_review").checked;
            setTimeout(() => {
                startNewGame(fen, reply.dtm);
                movesList = new MovesList(
                    [],
                    [],
                    game.getTurn() === "b",
                    goTo,
                    disableReview,
                );
            }, 50);
        })
        .catch((error) => {
            console.error("Error starting new game:", error);
            alert(
                "Endgame positions for selected criteria have been not found. Please change the settings.",
            );
            unmarkButton("new_study");
            requestWait = false;
        });
}

function startNewGame(fen, dtm) {
    game = new Game(fen, dtm);
    player = game.getTurn();
    setMateCounter(dtm);
    unmarkButton("new_study");
    requestWait = false;

    board.setPosition(fen);
    board.clearSquaresColors();
    board.setSide(fen);

    const turn = game.getTurn() === "w" ? "white" : "black";
    if (turn !== board.getOrientation()) {
        board.flip();
    }
}

function colorSquares() {
    board.clearSquaresColors();
    if (document.getElementById("hide_review").checked) {
        return;
    }

    const move = movesList.review[game.currentMove - 1];
    if (move !== null && move !== undefined) {
        const color = movesList.getMoveColor(
            movesList.getMoveType(move.classification),
        );
        board.colorSquare(move.move.slice(0, 2), color);
        board.colorSquare(move.move.slice(2, 4), color);
    }
}

function fetchLayouts() {
    return fetch("/endgame/layouts")
        .then(response => response.json())
        .then(availableLayouts => {
            const studyLayoutSelect = document.getElementById("study_layout");
            const options = studyLayoutSelect.options;
            let firstAvailable = null;
            let hasAvailableOptions = false;
            for (let i = 0; i < options.length; i++) {
                const option = options[i];
                if (!availableLayouts.includes(option.value)) {
                    option.disabled = true;
                    option.style.color = "grey";
                } else {
                    hasAvailableOptions = true;
                    if (firstAvailable === null) {
                        firstAvailable = option.value;
                    }
                }
            }

            if (!hasAvailableOptions) {
                alert("No endgame layouts are available. Check the database connection or generate layouts if not present.");
            } else if (firstAvailable) {
                studyLayoutSelect.value = firstAvailable;
                studyLayoutSelect.dispatchEvent(new Event("change"));
                if (document.getElementById("keep_playing").checked) {
                    requestNewGame();
                }
            }

            return firstAvailable;
        })
        .catch(error => console.error("Error fetching layouts:", error));
}

function updatePiecesSelect(ranges, replace = false) {
    const piecesSelect = document.getElementById("pieces");
    if (!replace) {
        removeChildren(piecesSelect);
    }

    if (ranges === undefined) {
        return;
    }

    let firstAvailable = null;
    const white = document.getElementById("side").value !== "black";
    const entries = Object.entries(ranges);
    for (let i = 0; i < entries.length; i++) {
        const [pieces, range] = entries[i];
        const description = getPiecesSymbol(pieces, white);

        if (replace && i < piecesSelect.options.length) {
            piecesSelect.options[i].value = pieces;
            piecesSelect.options[i].text = description;
        } else {
            const option = document.createElement("option");
            option.value = pieces;
            option.text = description;
            piecesSelect.appendChild(option);
        }

        if (!firstAvailable) {
            firstAvailable = pieces;
        }
    }

    return firstAvailable;
}

function updateStudyLayout(value) {
    if (value === null || layoutRanges === null) {
        return;
    }

    const layout = value;
    const ranges = layoutRanges[layout];
    const firstAvailable = updatePiecesSelect(ranges);
    updateCounter(firstAvailable);
    updateBishopColor(layout);
}

function updateBishopColor(layout) {
    const bishopColorRow =
        document.getElementById("bishop_color").parentElement.parentElement;
    if (layout === "KBNvK") {
        bishopColorRow.style.display = "";
    } else {
        bishopColorRow.style.display = "none";
    }
}

function updateCounter(value) {
    if (value === null || layoutRanges === null) {
        return;
    }

    const layout = document.getElementById("study_layout").value;
    const pieces = value;
    const ranges = layoutRanges[layout][pieces];
    if (ranges === undefined) {
        return;
    }

    let minValue = null;
    let maxValue = null;
    const distanceToMate = document.getElementById("distance_to_mate_or_zeroing").checked;
    if (distanceToMate) {
        minValue = ranges["min_dtm"];
        maxValue = ranges["max_dtm"];
    } else {
        minValue = ranges["min_dtz"];
        maxValue = ranges["max_dtz"];
    }

    minValue = Math.floor(minValue / 2) + 1;
    maxValue = Math.floor(maxValue / 2) + 1;

    const counter = document.getElementById("mate_in");
    counter.min = minValue;
    counter.max = maxValue;
    if (counter.value > maxValue) {
        counter.value = maxValue;
    } else if (counter.value < minValue) {
        counter.value = minValue;
    }
}

function updateDistanceToMateOrZeroing(checked) {
    const mateInLabel = document.getElementById("mate_in_label");
    const pieces = document.getElementById("pieces").value;
    mateInLabel.textContent = checked ? "Mate in:" : "Zero in:";
    updateCounter(pieces);
}

bindKeys(backward, forward);
bindKey(72, getHint);

document.getElementById("new_study").addEventListener("click", requestNewGame);
document.getElementById("study_layout").addEventListener("change", function () {
    updateStudyLayout(this.value);
});
document.getElementById("pieces").addEventListener("change", function () {
    updateCounter(this.value);
});
document.getElementById("distance_to_mate_or_zeroing").addEventListener("change", function() {
    updateDistanceToMateOrZeroing(this.checked);
});
document.getElementById("side").addEventListener("change", function() {
    const layout = document.getElementById("study_layout").value;
    const ranges = layoutRanges[layout];
    updatePiecesSelect(ranges, true);
});
document.getElementById("hide_counter").addEventListener("change", function() {
    setMateCounter(game.getDTZ());
});
document.getElementById("hide_review").addEventListener("change", function() {
    movesList.hideReview(this.checked);
});

document.getElementById("study_layout").dispatchEvent(new Event("change"));
document.addEventListener("DOMContentLoaded", function() {
    fetchLayoutsDefinitions().then(([layoutsData, rangesData]) => {
        layouts = layoutsData;
        layoutRanges = rangesData;
    });
    fetchLayouts().then(firstAvailable => {
        updateStudyLayout(firstAvailable);
    });
    const distanceToMateOrZeroing = document.getElementById("distance_to_mate_or_zeroing");
    updateDistanceToMateOrZeroing(distanceToMateOrZeroing.checked);
    setMateCounter();
});

document.getElementById("study_layout").addEventListener("keydown", function(e) {
    if (e.which === 37 || e.which === 39) {
        e.preventDefault();
    }
});
blockScroll("endgame_board");
