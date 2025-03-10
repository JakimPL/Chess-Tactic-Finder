import { markButton, unmarkButton } from "../common.js";

const board = Chessboard("game_board");

let configuration = null;

let installation = false;
let analysis = false;

let stockfishPath = "";
let pgnExtractPath = "";

$("#stockfish").on("change", function () {
    configuration["paths"]["stockfish"] = $(this).val();
    saveConfiguration();
});

$("#pgn_extract").on("change", function () {
    configuration["paths"]["pgn_extract"] = $(this).val();
    saveConfiguration();
});

$("#analyze").on("click", function () {
    run("analyze");
});

$("#review").on("click", function () {
    run("review");
});

function initializeLogContainer() {
    const logContainer = document.getElementById("installation-log");
    logContainer.style.display = "block";
    logContainer.textContent = "";
    return logContainer;
}

function handleEndMessage(eventSource) {
    eventSource.close();
    unmarkButton("reinstall");
    installation = false;
    return {
        text: "Installation complete.\n",
        isError: false,
    };
}

function parseEventData(event, eventSource) {
    if (event.data === "[END]   ") {
        return handleEndMessage(eventSource);
    }
    return {
        text: event.data.substring(9) + "\n",
        isError: event.data.startsWith("[STDERR]"),
    };
}

function appendToLog(logContainer, text, isError) {
    if (isError) {
        const errorSpan = document.createElement("span");
        errorSpan.className = "error-log";
        errorSpan.textContent = text;
        logContainer.appendChild(errorSpan);
    } else {
        logContainer.appendChild(document.createTextNode(text));
    }
    logContainer.scrollTop = logContainer.scrollHeight;
}

function handleInstallationError(eventSource) {
    return function() {
        eventSource.close();
        unmarkButton("reinstall");
        installation = false;
    };
}

$("#reinstall").on("click", function () {
    if (installation) {
        return;
    }

    installation = true;
    markButton("reinstall");

    const logContainer = initializeLogContainer();
    const eventSource = new EventSource("/reinstall");

    eventSource.onmessage = function(event) {
        const { text, isError } = parseEventData(event, eventSource);
        appendToLog(logContainer, text, isError);
    };

    eventSource.onerror = handleInstallationError(eventSource);
});

function saveConfiguration() {
    $.ajax({
        url: "/save_configuration",
        type: "POST",
        data: JSON.stringify(configuration),
        contentType: "application/json; charset=utf-8",
        success: () => {
            console.log("Configuration saved.");
        },
        error: () => {
            console.error("Failed to save configuration.");
        },
    });
}

function loadConfiguration() {
    fetch("/configuration.json", { cache: "no-cache" })
        .then((response) => response.json())
        .then((json) => {
            configuration = json;
            stockfishPath = configuration["paths"]["stockfish"];
            pgnExtractPath = configuration["paths"]["pgn_extract"];
            document.getElementById("stockfish").value = stockfishPath;
            document.getElementById("pgn_extract").value = pgnExtractPath;
        });
}

function setInput(value) {
    $("#stockfish").prop("disabled", !value);
    $("#pgn_extract").prop("disabled", !value);
    $("#reinstall").prop("disabled", !value);
    $("#tactic_player").prop("disabled", !value);
}

function setProgressVisibility(value) {
    $("#progress").css("visibility", value ? "visible" : "hidden");
}

function setProgressBar(message, analyzed, total) {
    const progress = parseFloat(100 * analyzed) / total;
    $("#progress_bar")
        .css("width", progress + "%")
        .attr("aria-valuenow", progress);
}

function clearGameDescription() {
    $("#game_description").html("&nbsp;");
    $("#move").html("&nbsp;");
}

function getState() {
    $.ajax({
        url: "/analysis_state",
        type: "GET",
        contentType: "application/json; charset=utf-8",
        success: (data) => {
            setInput(true);
            if (Object.keys(data).length === 0) {
                $("#analysis_state").html("No analysis in progress.");
                setProgressVisibility(false);
                board.clear();
            } else {
                $("#analysis_state").html(data["text"]);
                $("#game_description").html(data["game_name"]);
                setProgressVisibility(true);
                setProgressBar(data["text"], data["analyzed"], data["total"]);

                if (data["fen"] !== null && data["fen"] !== undefined) {
                    board.position(data["fen"]);
                }

                if (data["last_move"] !== null && data["last_move"] !== undefined && data["evaluation"] !== null) {
                    $("#move").html(
                        `${data["last_move"]}${data["evaluation"]}`,
                    );
                }
            }
        },
        error: () => {
            $("#analysis_state").html("Failed to connect to the server.");
            setProgressVisibility(false);
            setInput(false);
            board.clear();
        },
    });
}

function fetchLayouts() {
    fetch("/endgame/layouts")
        .then(response => response.json())
        .then(availableLayouts => {
            const studyLayoutSelect = document.getElementById("study_layout");
            const options = studyLayoutSelect.options;
            let firstAvailable = null;
            let allLayoutsGenerated = true;

            for (let i = 0; i < options.length; i++) {
                const option = options[i];
                if (availableLayouts.includes(option.value)) {
                    option.disabled = true;
                    option.style.color = "grey";
                    option.visible = false;
                } else {
                    option.disabled = false;
                    option.style.color = "black";
                    option.visible = true;
                    if (firstAvailable === null) {
                        firstAvailable = option.value;
                        allLayoutsGenerated = false;
                    }
                }
            }

            if (firstAvailable) {
                studyLayoutSelect.value = firstAvailable;
                studyLayoutSelect.dispatchEvent(new Event("change"));
            }

            $("#generate_endgames").prop("disabled", allLayoutsGenerated);
            if (allLayoutsGenerated) {
                studyLayoutSelect.value = "";
                $("#generate_endgames").html("All layouts generated!");
            }
        })

        .catch(error => console.error("Error fetching layouts:", error));
}

function run(argument) {
    if (analysis) {
        return;
    }

    const reader = new FileReader();
    const fileElement = document.getElementById("pgn");
    const file = fileElement.files[0];

    if (file === null) {
        alert("No file selected.");
        return;
    }

    reader.readAsText(file);
    reader.onload = function (event) {
        const pgn = event.target.result;
        analysis = true;
        $.ajax({
            url: `/${argument}`,
            type: "POST",
            data: pgn,
            success: () => {
                analysis = false;
            },
            error: () => {
                analysis = false;
            },
        });
    };
}

const generateButton = document.getElementById("generate_endgames");
const layoutSelect = document.getElementById("study_layout");

generateButton.addEventListener("click", async () => {
    clearGameDescription();
    const layout = layoutSelect.value;
    if (layout === "" || layout === null) {
        return;
    }

    const response = await fetch("/endgame/generate", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ layout: layout }),
    });

    if (response.ok) {
        analysis = true;
    } else {
        console.error("Endgame generation failed:", await response.text());
    }
});

document.addEventListener("DOMContentLoaded", function() {
    fetchLayouts();
});

loadConfiguration();
getState();
setInterval(getState, 1000);
