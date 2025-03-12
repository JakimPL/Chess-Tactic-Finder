import { bindKey } from "../bindings.js";
import Colors from "../colors.js";
import Link from "../link.js";
import Storage from "../storage.js";
import {
    clearSquaresColors,
    clearTable,
    colorSquare,
    createTableRowEntry,
    getFullPieceName,
    getPath,
    loadFavorites,
    markButton,
    setButton,
    setLinks,
    setPanel,
    unmarkButton,
} from "../common.js";

import History from "./history.js";
import Progress from "./progress.js";
import Tactic from "./tactic.js";

let board = Chessboard("game_board");

window.loadPGN = loadPGN;
window.refresh = refresh;

const $status = $("#status");
const $panel = $("#panel");

const storage = new Storage();
let localConfiguration = {};
const progressLoaded = $.Deferred();
const puzzlesLoaded = $.Deferred();
let actionId = 0;

let puzzles = null;
let puzzlesPath = null;
let filteredPuzzles = null;
let favorites = {};
const hashes = {};
const puzzlesHistory = new History();

let tactic = null;
let player = null;
let game = null;
let pgn = null;
let currentPuzzleId = null;

let action = 0;
let wait = false;
const delayTime = 1000;

let configuration = null;
let progress = null;

let panelTextCallback = null;
let statusTextCallback = null;
let loadPuzzlesCallback = null;
const filterPuzzlesCallback = null;

let beforeLoadCallback = null;
let afterLoadCallback = null;

let hideFirstMove = true;
let keepPlaying = true;
let hardEvaluation = true;

function delay(callback, time) {
    time = time === null || time === undefined ? delayTime : time;
    wait = true;
    action += 1;
    const currentAction = action;
    setTimeout(() => {
        if (action === currentAction) {
            callback();
        }

        wait = false;
        updateStatus();
    }, time);
}

function loadNextPuzzle() {
    filterPuzzles();
    if (filteredPuzzles === null) {
        return;
    } else if (!filteredPuzzles.length) {
        return;
    }

    const puzzle =
        filteredPuzzles[Math.floor(Math.random() * filteredPuzzles.length)];
    const path = getPath(puzzle.path);
    loadPGN(path, puzzle.hash);
}

function loadPGN(path, puzzleId, addToHistory) {
    beforeLoadCallback();
    currentPuzzleId = puzzleId;
    fetch(path)
        .then((response) => {
            if (!response.ok) {
                alert("Failed to load a puzzle.");
                throw new Error("Failed to load a puzzle.");
            }

            return response.text();
        })
        .then((text) => {
            pgn = text;
            reset();
            afterLoadCallback(puzzleId);

            if (addToHistory !== false) {
                puzzlesHistory.add([path, puzzleId]);
            }
        });
}

function calculateSuccessRate() {
    if (puzzles === null || progress.container === null || hashes === null) {
        return [0, 0, 0.0];
    }

    let correct = 0;
    let total = 0;
    for (const [hash, correctMoves] of Object.entries(progress.container)) {
        const puzzle = puzzles[hashes[hash]];
        if (puzzle !== null && puzzle !== undefined) {
            if (hardEvaluation) {
                total += 1;
                if (correctMoves >= puzzle.moves) {
                    correct += 1;
                }
            } else {
                total += puzzle.moves;
                correct += correctMoves;
            }
        }
    }

    return [correct, total, total > 0 ? correct / total : 0.0];
}

function makeMove(move, instant) {
    if (move !== null && move !== undefined) {
        move = game.move(move);
        board.position(game.fen(), !instant);
        clearSquaresColors();
    }
}

function getMoves() {
    moves = game.moves({ verbose: true });
    return game.pgn().split(/\d+\./).slice(1).join("");
}

function getConfig() {
    return {
        draggable: true,
        position: tactic.baseFEN,
        onDragStart: onDragStart,
        onDrop: onDrop,
        onSnapEnd: onSnapEnd,
    };
}

function onDrop(source, target) {
    document.getElementsByTagName("body")[0].style.overflow = "scroll";
    let move = game.move({
        from: source,
        to: target,
        promotion: "q",
    });

    if (wait || move === null) {
        return "snapback";
    } else {
        clearSquaresColors();
        const nextMove = tactic.nextMove;
        if (nextMove !== move.san) {
            panelTextCallback("Incorrect move!");
            save(currentPuzzleId, tactic.moveIndex - 1);
            delay(() => {
                game.undo();
                board.position(game.fen());
                panelTextCallback();
            });
        } else {
            move = tactic.forward();
            if (move !== null && move !== undefined) {
                delay(() => {
                    makeMove(move);
                    tactic.forward();
                });
            }
        }
    }

    updateStatus();
}

function onDragStart(source, piece) {
    if (tactic === null || game === null) {
        return false;
    }

    if (wait || tactic.solved || game.game_over() || game.turn() !== player) {
        return false;
    }

    if (
        (game.turn() === "w" && piece.search(/^b/) !== -1) ||
        (game.turn() === "b" && piece.search(/^w/) !== -1)
    ) {
        return false;
    }

    document.getElementsByTagName("body")[0].style.overflow = "hidden";
}

function onSnapEnd() {
    board.position(game.fen());
}

function forward() {
    clearSquaresColors();
    game.move(tactic.nextMove);
    tactic.forward();
    board.position(game.fen());
    updateStatus();
}

function backward() {
    clearSquaresColors();
    game.undo();
    tactic.backward();
    board.position(game.fen());
    updateStatus();
}

function reset() {
    player = null;
    tactic = new Tactic(pgn);
    game = new Chess(tactic.baseFEN);
    board = Chessboard("game_board", getConfig());
    clearSquaresColors();

    if (game.turn() === "w") {
        board.flip();
    }

    if (hideFirstMove) {
        makeMove(tactic.firstMove, true);
        player = game.turn();
    } else {
        delay(() => {
            makeMove(tactic.firstMove);
            player = game.turn();
        });
    }

    panelTextCallback();
    updateStatus();
}

function checkIfSolved() {
    if (tactic === null) {
        return;
    }

    if (tactic.solved) {
        panelTextCallback("Puzzle solved!");
        save(currentPuzzleId, tactic.moveIndex);
        tactic = null;
        if (keepPlaying) {
            delay(loadNextPuzzle);
        } else {
            delay(() => {
                filterPuzzles();
            }, 500);
        }
    }
}

function updateStatus() {
    if (game === null) {
        return;
    }

    let statusText = game.turn() === "b" ? "◉ " : "○ ";
    const moveColor = game.turn() === "b" ? "Black" : "White";
    if (game.in_checkmate()) {
        statusText += "Game over, " + moveColor + " is checkmated.";
    } else if (game.in_draw()) {
        statusText += "Game over, drawn position";
    } else {
        statusText += moveColor + " to move";
    }

    statusTextCallback(statusText);
    checkIfSolved();
}

function getMovesCount(number) {
    return 1 + Math.floor((number - 1) / 2);
}

function save(hash, value) {
    const targetValue = getMovesCount(value);
    const moves = Math.floor(tactic.moves.length / 2);
    progress.saveItem(hash, targetValue, moves);
}

function refresh(gather) {
    if (gather) {
        clearTable("games_list_table", 10);
    }

    $.ajax({
        url: gather === true ? "/refresh?gather=true" : "/refresh",
        type: "GET",
        success: () => {
            loadPuzzlesCallback();
            progress.load();
        },
        error: () => {
            console.error("Unable to refresh puzzles.");
            $("#number_of_puzzles").html(
                "Unable to refresh puzzles. Please refresh the page.",
            );
        },
    });
}

$.when(progressLoaded, puzzlesLoaded).done(function () {
    updateSuccessRate();
    updateSolvedStates();
    loadNextPuzzle();
});

$("#hide_first_move").on("click", function () {
    hideFirstMove = document.getElementById("hide_first_move").checked;
});

$("#keep_playing").on("click", function () {
    keepPlaying = document.getElementById("keep_playing").checked;
});

$("#backward").on("click", function () {
    if (tactic !== null) {
        backward();
    }
});

$("#forward").on("click", function () {
    if (tactic !== null) {
        forward();
    }
});

$("#refresh").on("click", function () {
    refresh();
});

$("#reset").on("click", function () {
    setPanel($panel);
    reset();
});

$("#hint").on("click", function () {
    getHint();
});

$("#solution").on("click", function () {
    getSolution();
});

$("#copyFEN").on("click", function () {
    if (game === null) {
        return;
    }

    const fen = game.fen();
    if (fen !== null && fen !== "") {
        navigator.clipboard.writeText(fen);
        setPanel($panel, "FEN copied to clipboard!");
    }
});

$("#copyPGN").on("click", function () {
    if (pgn !== null && pgn !== "") {
        navigator.clipboard.writeText(pgn);
        setPanel($panel, "PGN copied to clipboard!");
    }
});

$("#previous").on("click", function () {
    if (puzzlesHistory === null) {
        return;
    }

    const historyElement = puzzlesHistory.previous();
    loadHistoryElement(historyElement);
});

$("#next").on("click", function () {
    if (puzzlesHistory === null) {
        return;
    }

    const historyElement = puzzlesHistory.next();
    if (historyElement === null) {
        loadNextPuzzle();
    } else {
        loadHistoryElement(historyElement);
    }
});

$("#favorite").on("click", function () {
    if (currentPuzzleId !== null) {
        if (favorites[currentPuzzleId] === true) {
            favorites[currentPuzzleId] = false;
            unmarkButton("favorite");
        } else {
            favorites[currentPuzzleId] = true;
            markButton("favorite");
        }

        storage.set("favorites", favorites);
    }
});

$(".board_settings").change(function () {
    saveLocalConfiguration();
});

$(".theme").change(function () {
    filterPuzzles();
    saveLocalConfiguration();
});

$(".options").change(function () {
    filterPuzzles();
    saveLocalConfiguration();
});

$("#random").on("click", function () {
    markButton("random");
    delay(loadNextPuzzle, 50);
});

$("#progressClear").on("click", function () {
    if (
        confirm(
            "Are you sure you want to clear the progress? This cannot be undone.",
        )
    ) {
        progress.clear();
        updateSolvedStates();
        updateSuccessRate();
    }
});

$("#progressExport").on("click", function (event) {
    event.preventDefault();
    const element = document.createElement("a");
    data = progress.link();

    element.setAttribute("href", data);
    element.setAttribute("download", "progress.json");
    element.click();
});

$("#progressImport").on("click", function () {
    const fileElement = document.getElementById("file");
    const file = fileElement.files[0];
    if (file === null) {
        alert("No progress file selected.");
        return;
    }
    if (
        confirm(
            "Are you sure you want to overwrite the progress? This cannot be undone.",
        )
    ) {
        readProgress(file);
    }
});

function getHint() {
    if (tactic === null) {
        return;
    }

    if (!tactic.solved && tactic.nextMove !== null) {
        const san = sanToUci(tactic.nextMove);
        const source = san.slice(0, 2);
        colorSquare(source, Colors.hintColor);

        const move = game.move(tactic.nextMove);
        game.undo();
        setPanel($panel, "Hint: " + getFullPieceName(move.piece));
        delay(() => {
            setPanel($panel);
        });
    }
}

function getSolution() {
    if (tactic === null) {
        return;
    }

    if (!tactic.solved && tactic.nextMove !== null) {
        const san = sanToUci(tactic.nextMove);
        const source = san.slice(0, 2);
        const target = san.slice(2, 4);
        colorSquare(source, Colors.hintColor);
        colorSquare(target, Colors.hintColor);
        setPanel($panel, "Hint: " + tactic.nextMove);
        delay(() => {
            setPanel($panel);
        });
    }
}

function sanToUci(san) {
    const tempGame = new Chess(game.fen());
    const move = tempGame.move(san);
    return move ? `${move.from}${move.to}` : null;
}

function loadHistoryElement(historyElement) {
    if (historyElement !== null) {
        const previousPath = historyElement[0];
        const previousPuzzleId = historyElement[1];
        loadPGN(previousPath, previousPuzzleId, false);
    }
}

function readProgress(file) {
    const reader = new FileReader();
    reader.readAsText(file);
    reader.onload = function (event) {
        const data = JSON.parse(event.target.result);
        if (data !== null) {
            try {
                progress.update(data);
                updateSolvedStates();
                updateSuccessRate();
                alert("Progress imported successfully.");
            } catch (error) {
                console.error(error);
            }
        }
    };
}

function updateNumberOfPuzzles() {
    if (puzzles !== null) {
        const numberOfPuzzles = Object.keys(puzzles).length;
        const numberOfPuzzlesText = `${numberOfPuzzles} puzzles in total.`;
        $("#number_of_puzzles").html(numberOfPuzzlesText);
    }
}

function updateSuccessRate() {
    const [correct, total, r] = calculateSuccessRate();
    const rate = parseFloat(100 * r).toFixed(2);
    const successRateText = `Success rate: ${correct}/${total} (${rate}%).`;
    $("#success_rate").html(successRateText);
}

function updateSolvedStatus(hash, value, moves) {
    const statusSymbol = getSolvedSymbol(value, moves);
    const puzzleId = `puzzle${hash}`;
    const element = document.getElementById(puzzleId);
    if (element !== null && value !== null) {
        element.innerHTML = statusSymbol;
        element.style.color = value >= moves ? "green" : "red";
        element.style.fontWeight = "bold";
    }
}

function updateSolvedStates() {
    for (const hash in progress.container) {
        const value = progress.get(hash);
        const index = hashes[hash];
        if (index in puzzles) {
            const moves = puzzles[index].moves;
            updateSolvedStatus(hash, value, moves);
        }
    }
}

function saveLocalConfiguration() {
    localConfiguration = {
        board_settings: {
            hide_first_move: $("#hide_first_move").prop("checked"),
            keep_playing: $("#keep_playing").prop("checked"),
        },
        theme: {
            checkmate: $("#checkmate").prop("checked"),
            mating_net: $("#mating_net").prop("checked"),
            material_advantage: $("#material_advantage").prop("checked"),
            insufficient_material: $("#insufficient_material").prop("checked"),
            repetition: $("#repetition").prop("checked"),
            stalemate: $("#stalemate").prop("checked"),
        },
        options: {
            unsolved: $("#unsolved").prop("checked"),
            min_moves: $("#min_moves").prop("value"),
            max_moves: $("#max_moves").prop("value"),
            min_hardness: $("#min_hardness").prop("value"),
            max_hardness: $("#max_hardness").prop("value"),
        },
    };

    storage.set("configuration", localConfiguration);
}

function loadLocalConfiguration() {
    const localStorageConfiguration = storage.get("configuration");
    if (localStorageConfiguration !== null) {
        localConfiguration = localStorageConfiguration;
        for (const element of $(".board_settings")) {
            element.checked = localConfiguration["board_settings"][element.id];
        }

        for (const element of $(".theme")) {
            element.checked = localConfiguration["theme"][element.id];
        }

        for (const element of $(".options")) {
            element.checked = localConfiguration["options"][element.id];
            element.value = localConfiguration["options"][element.id];
        }
    }
}

function loadConfiguration() {
    fetch("/configuration.json", { cache: "no-cache" })
        .then((response) => response.json())
        .then((json) => {
            configuration = json;
            progress.path = `/${configuration["paths"]["progress"]}`;
            puzzlesPath = `/${configuration["paths"]["gathered_puzzles"]}`;
            hardEvaluation =
                !configuration["tactic_player"][
                    "count_moves_instead_of_puzzles"
                ];
            refresh();
        });
}

function loadPuzzles() {
    fetch(puzzlesPath, { cache: "no-cache" })
        .then((response) => response.json())
        .then((json) => {
            puzzles = json;
            filterPuzzles();

            for (let i = 0; i < puzzles.length; i++) {
                const puzzle = puzzles[i];
                hashes[puzzle.hash] = i;
            }

            puzzlesLoaded.resolve();
            createPuzzleTable();
            refreshPuzzleTable();
        });
}

function getSolvedSymbol(value, moves) {
    if (value === null || value === undefined) {
        return "";
    }

    return `${value}/${moves}`;
    // return value >= moves ? '✔' : '✘'
}

function gatherPuzzleTypes() {
    const puzzleTypes = [];
    for (const element of $(".theme")) {
        if (element.checked) {
            const theme = element.id.replace("_", " ");
            puzzleTypes.push(theme);
        }
    }

    return puzzleTypes;
}

function filterPuzzles() {
    if (puzzles === null) {
        return undefined;
    }

    filteredPuzzles = [];

    const puzzleTypes = gatherPuzzleTypes();
    const onlyUnsolved = document.getElementById("unsolved").checked;
    const minMoves = $("#min_moves").val();
    const maxMoves = $("#max_moves").val();
    const minHardness = parseFloat($("#min_hardness").val());
    const maxHardness = parseFloat($("#max_hardness").val());

    for (const puzzle of puzzles) {
        const hardness = parseFloat(puzzle.hardness);
        if (
            puzzleTypes.includes(puzzle.puzzleType) &&
            (!onlyUnsolved || !(puzzle.hash in progress.container)) &&
            puzzle.moves >= minMoves &&
            puzzle.moves <= maxMoves &&
            hardness >= minHardness &&
            hardness <= maxHardness
        ) {
            filteredPuzzles.push(puzzle);
        }
    }

    refreshPuzzleTable();
    updateNumberOfPuzzles();
    updateSolvedStates();
}

function createPuzzleTable() {
    clearTable("games_list_table");
    const tableObject = document.getElementById("games_list_table");
    for (const puzzle of puzzles) {
        const tr = document.createElement("tr");
        tr.id = `row${puzzle.hash}`;

        const path = getPath(puzzle.path);
        const link = new Link(
            `javascript:loadPGN('${path}', '${puzzle.hash}')`,
        );
        const solved = getSolvedSymbol(progress.get(puzzle.hash), puzzle.moves);
        const puzzleId = `puzzle${puzzle.hash}`;
        const playSymbol = favorites[puzzle.hash] === true ? "★" : "▶";

        if (favorites[puzzle.hash]) {
            tr.style.backgroundColor = Colors.darkSquareColor;
        }

        createTableRowEntry(tr, playSymbol, link);
        createTableRowEntry(tr, solved, null, puzzleId);
        createTableRowEntry(tr, puzzle.whiteToMove ? "◉" : "○");
        createTableRowEntry(tr, puzzle.white);
        createTableRowEntry(tr, puzzle.black);
        createTableRowEntry(tr, puzzle.date);
        createTableRowEntry(tr, puzzle.puzzleType);
        createTableRowEntry(tr, puzzle.moves);
        createTableRowEntry(tr, puzzle.hardness.toFixed(2));
        createTableRowEntry(tr, puzzle.initialEvaluation);
        tableObject.appendChild(tr);
    }

    sorttable.makeSortable(document.getElementById("games"));
}

async function refreshPuzzleTable() {
    if (puzzles === null || progress === null || hashes === null) {
        return;
    }

    actionId += 1;
    const currentActionId = actionId;
    for (const hash of Object.keys(hashes)) {
        $(`#row${hash}`).hide();
    }

    for (const puzzle of filteredPuzzles) {
        setTimeout(() => {
            if (currentActionId === actionId) {
                $(`#row${puzzle.hash}`).show();
            }
        }, 1);
    }
}

panelTextCallback = (text) => {
    setPanel($panel, text);
};
statusTextCallback = (text) => {
    $status.html(text);
};
loadPuzzlesCallback = loadPuzzles;

beforeLoadCallback = () => {
    markButton("random");
};
afterLoadCallback = (puzzleId) => {
    unmarkButton("random");
    setLinks(tactic.pgn, tactic.fen);
    setButton("favorite", favorites[puzzleId] === true);
};

progress = new Progress(
    storage,
    () => {
        progressLoaded.resolve();
        updateSuccessRate();
    },
    (key, value, moves) => {
        updateSolvedStatus(key, value, moves);
        updateSuccessRate();
    },
);

configuration = loadConfiguration();
loadLocalConfiguration();
favorites = loadFavorites(storage);

hideFirstMove = document.getElementById("hide_first_move").checked;
keepPlaying = document.getElementById("keep_playing").checked;
markButton("random");

bindKey(72, getHint);
bindKey(83, getSolution);
