import ChessBoard from "../board/chessground.js";

import { bindKeys } from "../bindings.js";
import Colors from "../colors.js";
import Link from "../link.js";
import MovesList from "../movesList.js";
import Storage from "../storage.js";
import {
    blockScroll,
    clearTable,
    createTableRowEntry,
    getPath,
    loadFavorites,
    markButton,
    setButton,
    setLinks,
    setPanel,
    unmarkButton,
} from "../common.js";

import Game from "./game.js";

const $panel = $("#panel");

window.loadReview = loadReview;
window.refresh = refresh;

const board = new ChessBoard("game_board", false);
board.setPosition("start");

const emptyImage =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
let image = emptyImage;

let pgn = null;
let fen = null;
let review = null;
let currentReviewId = null;
let movesList = null;

let chess = null;
let game = null;

let reviewsPath = null;
const storage = new Storage();
let reviews = {};
const hashes = {};
let favorites = {};
const accuracies = {};

$("#backward").on("click", function () {
    backward();
});

$("#forward").on("click", function () {
    forward();
});

$("#flip").on("click", function () {
    board.flip();
    setEvaluation();
});

$("#copyFEN").on("click", function () {
    if (chess === null) {
        return;
    }

    if (fen !== null && fen !== "") {
        navigator.clipboard.writeText(chess.fen);
        setPanel($panel, "FEN copied to clipboard!");
    }
});

$("#copyPGN").on("click", function () {
    if (pgn !== null && pgn !== "") {
        navigator.clipboard.writeText(pgn);
        setPanel($panel, "PGN copied to clipboard!");
    }
});

$("#favorite").on("click", function () {
    if (currentReviewId !== null) {
        if (favorites[currentReviewId] === true) {
            favorites[currentReviewId] = false;
            unmarkButton("favorite");
        } else {
            favorites[currentReviewId] = true;
            markButton("favorite");
        }

        storage.set("favorites", favorites);
    }
});

function colorSquares() {
    board.clearSquaresColors();
    const move = review.moves[game.moveIndex];
    if (move !== null && move !== undefined) {
        const moveColor = movesList.getMoveColor(
            movesList.getMoveType(move.classification),
        );
        board.colorSquare(move.move.slice(0, 2), moveColor);
        board.colorSquare(move.move.slice(2, 4), moveColor);
    }
}

function updateNumberOfReviews() {
    if (reviews !== null && reviews !== undefined) {
        const numberOfReviews = Object.keys(reviews).length;
        const numberOfReviewsText = `${numberOfReviews} reviews in total.`;
        $("#number_of_reviews").html(numberOfReviewsText);
    }
}

function updateAccuracyInfo() {
    const whiteAccuracy = (100 * accuracies[currentReviewId][0]).toFixed(2);
    const blackAccuracy = (100 * accuracies[currentReviewId][1]).toFixed(2);
    $("#white_accuracy_value").html(`${whiteAccuracy}%`);
    $("#black_accuracy_value").html(`${blackAccuracy}%`);
    $("#accuracy").css("visibility", "visible");
}

function loadReview(path, reviewId) {
    document.getElementById("evaluation_chart").src = emptyImage;
    setEvaluationBar("0.0", 0);
    fetch(path)
        .then((response) => {
            if (!response.ok) {
                alert("Failed to load a review.");
                throw new Error("Failed to load a review.");
            }

            return response.text();
        })
        .then((text) => {
            currentReviewId = reviewId;
            review = JSON.parse(text);
            pgn = reviews[hashes[reviewId]].pgn;

            startGame();
            setLinks(pgn, fen);
            setButton("favorite", favorites[reviewId] === true);

            movesList = new MovesList(
                game.moves,
                review.moves,
                game.turn === "b",
                goTo,
            );

            updateAccuracyInfo();

            clearTable("engine_lines_table");
            loadChart(path);

            const gameInfo = getGameInfo(review);
            $("#game_info").html(gameInfo);
            window.scrollTo(0, 0);
        });
}

function loadConfiguration() {
    fetch("/configuration.json", { cache: "no-cache" })
        .then((response) => response.json())
        .then((json) => {
            const configuration = json;
            reviewsPath = `/${configuration["paths"]["gathered_reviews"]}`;
            refresh();
        });
}

function loadReviews() {
    fetch(reviewsPath, { cache: "no-cache" })
        .then((response) => response.json())
        .then((json) => {
            reviews = json;

            for (let i = 0; i < reviews.length; i++) {
                const rev = reviews[i];
                hashes[rev.hash] = i;
                accuracies[rev.hash] = calculateAccuracy(rev);
            }

            createReviewsTable();
            updateNumberOfReviews();
        });
}

function loadChart(path) {
    $.ajax({
        url: "/reviewer/get_chart",
        type: "POST",
        data: path,
        contentType: "text/plain; charset=utf-8",
        success: (data) => {
            image = `data:image/png;base64,${data}`;
            document.getElementById("evaluation_chart").src = image;
        },
        error: () => {
            console.error("Unable to load a chart.");
        },
    });
}

function calculateAccuracy(rev) {
    let whiteMoves = 0;
    let blackMoves = 0;
    let whiteAccuracy = 0.0;
    let blackAccuracy = 0.0;
    for (const move of rev.moves) {
        const accuracy = parseFloat(move.classification.accuracy);
        if (move.turn) {
            whiteMoves++;
            whiteAccuracy += accuracy;
        } else {
            blackMoves++;
            blackAccuracy += accuracy;
        }
    }

    return [whiteAccuracy / whiteMoves, blackAccuracy / blackMoves];
}

function getGameInfo(rev) {
    const mainHeaders = rev.headers._tag_roster;
    const secondaryHeaders = rev.headers._others;
    const whitePlayer = mainHeaders.White !== null ? mainHeaders.White : "???";
    const blackPlayer = mainHeaders.Black !== null ? mainHeaders.Black : "???";
    const whiteElo =
        secondaryHeaders.WhiteElo !== null ? secondaryHeaders.WhiteElo : "?";
    const blackElo =
        secondaryHeaders.BlackElo !== null ? secondaryHeaders.BlackElo : "?";
    const white = `<b>${whitePlayer}</b> (${whiteElo})`;
    const black = `<b>${blackPlayer}</b> (${blackElo})`;
    const gameInfo = `${white} vs ${black}, ${mainHeaders.Date} (${mainHeaders.Result})`;
    return gameInfo;
}

function startGame() {
    game = new Game(pgn);
    fen = game.fen;
    chess = new Chess(game.fen);
    board.setPosition(game.fen);
}

function evaluationToString(evaluation) {
    let value = 0.0;
    if (evaluation.includes(".")) {
        value = parseFloat(evaluation).toFixed(2);
    } else {
        value = `M${parseInt(evaluation)}`;
    }

    return value.toString();
}

function setEvaluationBar(value, scale) {
    const orientation = board.getOrientation() === "black";
    scale = orientation ? -scale : scale;
    const height =
        scale === null ? 50 : Math.max(0, Math.min(100, 50 - scale * 50));
    $("#evaluation_bar")
        .css("height", height + "%")
        .attr("aria-valuenow", height);
    if (scale >= 0) {
        $("#evaluation_value").html(value);
        $("#evaluation_bar").html("");
    } else {
        $("#evaluation_bar").html(value);
        $("#evaluation_value").html("");
    }

    document.getElementById("evaluation").style.backgroundColor = orientation
        ? Colors.darkSquareColor
        : Colors.lightSquareColor;
    document.getElementById("evaluation_bar").style.backgroundColor =
        orientation ? Colors.lightSquareColor : Colors.darkSquareColor;
}

function setEngineLines() {
    const index = game.moveIndex + 1;
    const move = review.moves[index];
    if (move === null || move === undefined) {
        return;
    }

    const bestMoves = move["best_moves"];
    clearTable("engine_lines_table");
    const tableObject = document.getElementById("engine_lines_table");
    let bestChoice = false;
    for (const bestMove of bestMoves) {
        const tr = document.createElement("tr");
        createTableRowEntry(tr, bestMove[0]);
        if (bestMove[0] === game.moves[index]) {
            tr.style.backgroundColor = Colors.darkSquareColor;
            bestChoice = true;
        }

        const value = evaluationToString(bestMove[1]);
        createTableRowEntry(tr, value);
        tableObject.appendChild(tr);
    }

    const reviewMove = review.moves[index];
    if (!bestChoice && reviewMove.move !== null && reviewMove.move !== undefined) {
        const tr = document.createElement("tr");
        createTableRowEntry(tr, game.moves[index]);
        createTableRowEntry(tr, evaluationToString(reviewMove.evaluation));
        tr.style.backgroundColor = Colors.darkSquareColor;
        tableObject.appendChild(tr);
    }

    const remainingRows = 5 - bestMoves.length + bestChoice;
    for (let i = 0; i < remainingRows; i++) {
        const tr = document.createElement("tr");
        const td = document.createElement("td");
        td.rowspan = remainingRows;
        td.innerHTML = "&nbsp";
        tr.appendChild(td);
        tableObject.appendChild(tr);
    }
}

function setEvaluation() {
    const reviewedMove = review.moves[game.moveIndex];
    if (reviewedMove !== null && reviewedMove !== undefined) {
        const evaluation = reviewedMove.evaluation;

        let scale = 0;
        let value = 0;
        if (!evaluation.includes(".")) {
            const integer = parseInt(evaluation);
            if (integer === 0) {
                const turn = reviewedMove.turn;
                scale = turn ? 1 : -1;
            } else {
                scale = evaluation > 0 ? 1 : -1;
            }
            value = "M" + Math.abs(evaluation);
        } else {
            const scaledEvaluation = 0.4 * evaluation;
            scale = scaledEvaluation / (1 + Math.abs(scaledEvaluation));
            value = Math.abs(parseFloat(evaluation)).toFixed(1);
        }

        setEvaluationBar(value, scale);
    }
}

function setFEN(previousMoveIndex) {
    fen = game.getFEN();
    movesList.highlightNextMove(previousMoveIndex, game.moveIndex);

    chess.load(fen);
    board.setPosition(fen);

    colorSquares();
    setEvaluation();
    setEngineLines();
    setLinks(pgn, fen);
}

function forward() {
    if (game !== null) {
        const previousMoveIndex = game.moveIndex;
        const nextMove = game.forward();
        if (nextMove !== null && nextMove !== undefined) {
            setFEN(previousMoveIndex);
        }
    }
}

function backward() {
    if (game !== null) {
        const previousMoveIndex = game.moveIndex;
        game.backward();
        setFEN(previousMoveIndex);
    }
}

function goTo(moveIndex) {
    if (game !== null) {
        const previousMoveIndex = game.moveIndex;
        const nextMove = game.goTo(moveIndex);
        if (nextMove !== null && nextMove !== undefined) {
            setFEN(previousMoveIndex);
        }
    }
}

function createReviewsTable() {
    clearTable("reviews_list_table");
    const tableObject = document.getElementById("reviews_list_table");
    for (const rev of reviews) {
        const tr = document.createElement("tr");
        tr.id = `row${rev.hash}`;

        const path = getPath(rev.path);
        const link = new Link(
            `javascript:loadReview('${path}', '${rev.hash}')`,
        );

        const reviewId = `review${rev.hash}`;
        const playSymbol = favorites[rev.hash] === true ? "★" : "▶";

        if (favorites[rev.hash]) {
            tr.style.backgroundColor = Colors.darkSquareColor;
        }

        const whiteAccuracy = (100 * accuracies[rev.hash][0]).toFixed(2);
        const blackAccuracy = (100 * accuracies[rev.hash][1]).toFixed(2);

        createTableRowEntry(tr, playSymbol, link, reviewId);
        createTableRowEntry(tr, rev.white);
        createTableRowEntry(tr, rev.black);
        createTableRowEntry(tr, rev.date);
        createTableRowEntry(tr, rev.actualResult);
        createTableRowEntry(
            tr,
            Math.ceil((!rev.moves[0].turn + rev.moves.length) / 2),
        );
        createTableRowEntry(tr, `${whiteAccuracy}%`);
        createTableRowEntry(tr, `${blackAccuracy}%`);
        tableObject.appendChild(tr);
    }

    sorttable.makeSortable(document.getElementById("games"));
}

function refresh(gather) {
    if (gather) {
        clearTable("reviews_list_table", 8);
    }

    $.ajax({
        url: gather === true ? "/refresh?gather=true" : "/refresh",
        type: "GET",
        success: () => {
            loadReviews();
        },
        error: () => {
            console.error("Unable to refresh reviews.");
            $("#number_of_reviews").html(
                "Unable to refresh reviews. Please refresh the page.",
            );
        },
    });
}

loadConfiguration();
favorites = loadFavorites(storage);
bindKeys(backward, forward);
blockScroll("game_board");
