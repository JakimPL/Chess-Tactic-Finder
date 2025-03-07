board = Chessboard("game_board");

const $status = $("#status");
const $panel = $("#panel");

const storage = new Storage();
let localConfiguration = {};
const progressLoaded = $.Deferred();
const puzzlesLoaded = $.Deferred();
let actionId = 0;

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
    if (tactic !== null) {
        if (!tactic.solved && tactic.nextMove != null) {
            move = game.move(tactic.nextMove);
            game.undo();
            setPanel($panel, "Hint: " + getFullPieceName(move.piece));
            delay(() => {
                setPanel($panel);
            });
        }
    }
});

$("#solution").on("click", function () {
    if (tactic !== null) {
        if (!tactic.solved && tactic.nextMove != null) {
            setPanel($panel, "Hint: " + tactic.nextMove);
            delay(() => {
                setPanel($panel);
            });
        }
    }
});

$("#copyFEN").on("click", function () {
    if (game == null) {
        return;
    }

    const fen = game.fen();
    if (fen != null && fen != "") {
        navigator.clipboard.writeText(fen);
        setPanel($panel, "FEN copied to clipboard!");
    }
});

$("#copyPGN").on("click", function () {
    if (pgn != null && pgn != "") {
        navigator.clipboard.writeText(pgn);
        setPanel($panel, "PGN copied to clipboard!");
    }
});

$("#previous").on("click", function () {
    if (puzzlesHistory == null) {
        return;
    }

    const historyElement = puzzlesHistory.previous();
    loadHistoryElement(historyElement);
});

$("#next").on("click", function () {
    if (puzzlesHistory == null) {
        return;
    }

    const historyElement = puzzlesHistory.next();
    if (historyElement == null) {
        loadNextPuzzle();
    } else {
        loadHistoryElement(historyElement);
    }
});

$("#favorite").on("click", function () {
    if (currentPuzzleId !== null) {
        if (favorites[currentPuzzleId] == true) {
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
    filterPuzzles(puzzles);
    saveLocalConfiguration();
});

$(".options").change(function () {
    filterPuzzles(puzzles);
    saveLocalConfiguration();
});

$("#random").on("click", function () {
    markButton("random");
    delay(loadNextPuzzle, 50);
});

$("#progressClear").on("click", function (event) {
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

$("#progressImport").on("click", function (event) {
    const fileElement = document.getElementById("file");
    const file = fileElement.files[0];
    if (file == null) {
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

function loadHistoryElement(historyElement) {
    if (historyElement != null) {
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
        if (data != null) {
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

function updateNumberOfPuzzles(puzzles) {
    if (puzzles != null) {
        const numberOfPuzzles = Object.keys(puzzles).length;
        const numberOfPuzzlesText = `${numberOfPuzzles} puzzles in total.`;
        $("#number_of_puzzles").html(numberOfPuzzlesText);
    }
}

function updateSuccessRate() {
    let [correct, total, rate] = calculateSuccessRate();
    rate = parseFloat(100 * rate).toFixed(2);
    const successRateText = `Success rate: ${correct}/${total} (${rate}%).`;
    $("#success_rate").html(successRateText);
}

function updateSolvedStatus(hash, value, moves) {
    const statusSymbol = getSolvedSymbol(value, moves);
    const puzzleId = `puzzle${hash}`;
    const element = document.getElementById(puzzleId);
    if (element != null && value != null) {
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
    if (localStorageConfiguration != null) {
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
            filterPuzzles(puzzles);

            for (let i = 0; i < puzzles.length; i++) {
                const puzzle = puzzles[i];
                hashes[puzzle.hash] = i;
            }

            puzzlesLoaded.resolve();
            createPuzzleTable(puzzles);
            refreshPuzzleTable(filteredPuzzles);
        });
}

function getSolvedSymbol(value, moves) {
    if (value == null) {
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

function filterPuzzles(puzzles) {
    if (puzzles == null) {
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

    refreshPuzzleTable(filteredPuzzles);
    updateNumberOfPuzzles(filteredPuzzles);
    updateSolvedStates();
}

function createPuzzleTable(puzzles) {
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
        const playSymbol = favorites[puzzle.hash] == true ? "★" : "▶";

        if (favorites[puzzle.hash]) {
            tr.style.backgroundColor = darkSquareColor;
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

async function refreshPuzzleTable(filteredPuzzles) {
    if (puzzles == null || progress == null || hashes == null) {
        return;
    }

    actionId += 1;
    const currentActionId = actionId;
    for (const hash of Object.keys(hashes)) {
        $(`#row${hash}`).hide();
    }

    for (const puzzle of filteredPuzzles) {
        setTimeout(() => {
            if (currentActionId == actionId) {
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
filterPuzzlesCallback = filterPuzzles;

beforeLoadCallback = () => {
    markButton("random");
};
afterLoadCallback = (puzzleId) => {
    unmarkButton("random");
    setLinks(tactic.pgn, tactic.fen);
    setButton("favorite", favorites[puzzleId] == true);
};

progress = new Progress(
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
loadFavorites();

hideFirstMove = document.getElementById("hide_first_move").checked;
keepPlaying = document.getElementById("keep_playing").checked;
markButton("random");
