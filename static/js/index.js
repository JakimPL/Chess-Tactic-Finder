var board = Chessboard('game_board')

var configuration = null

var installation = false
var analysis = false

var stockfishPath = ''
var pgnExtractPath = ''

$('#stockfish').on('change', function() {
    configuration['paths']['stockfish'] = $(this).val()
    saveConfiguration(configuration)
})

$('#pgn_extract').on('change', function() {
    configuration['paths']['pgn_extract'] = $(this).val()
    saveConfiguration(configuration)
})

$('#analyze').on('click', function() {
    run('analyze')
})

$('#review').on('click', function() {
    run('review')
})

$('#reinstall').on('click', function() {
    if (installation) {
        return
    }

    installation = true
    markButton('reinstall')
    $.ajax({
        url: '/reinstall',
        type: 'GET',
        success: () => {
            alert('Tactic Finder reinstalled.')
            unmarkButton('reinstall')
            installation = false
        },
        error: () => {
            alert('Failed to reinstall a Tactic Finder.')
            unmarkButton('reinstall')
            installation = false
        }
    })
})

function saveConfiguration(configuration) {
    $.ajax({
        url: '/save_configuration',
        type: 'POST',
        data: JSON.stringify(configuration),
        contentType: "application/json; charset=utf-8",
        success: () => {
            console.log('Configuration saved.')
        },
        error: () => {
            console.error('Failed to save configuration.')
        }
    })
}

function loadConfiguration() {
    fetch('/configuration.json', {cache: 'no-cache'})
    .then(response => response.json())
    .then(json => {
        configuration = json
        stockfishPath = configuration['paths']['stockfish']
        pgnExtractPath = configuration['paths']['pgn_extract']
        document.getElementById('stockfish').value = stockfishPath
        document.getElementById('pgn_extract').value = pgnExtractPath
    })
}

function setInput(value) {
    $('#stockfish').prop('disabled', !value)
    $('#pgn_extract').prop('disabled', !value)
    $('#reinstall').prop('disabled', !value)
    $('#tactic_player').prop('disabled', !value)
}

function setProgressVisibility(value) {
    $('#progress').css('visibility', value ? 'visible' : 'hidden')
}

function setProgressBar(message, analyzed, total) {
    var progress = parseFloat(100 * analyzed) / total
    $('#progress_bar').css('width', progress + '%').attr('aria-valuenow', progress)
}

function getState() {
    $.ajax({
        url: '/analysis_state',
        type: 'GET',
        contentType: "application/json; charset=utf-8",
        success: (data) => {
            setInput(true)
            if (Object.keys(data).length === 0) {
                $('#analysis_state').html('No analysis in progress.')
                setProgressVisibility(false)
                board.clear()
            } else {
                $('#analysis_state').html(data['text'])
                $('#game_description').html(data['game_name'])
                setProgressVisibility(true)
                setProgressBar(data['text'], data['analyzed'], data['total'])

                if (data['fen'] != null) {
                    board.position(data['fen'])
                }

                if (data['last_move'] != null && data['evaluation'] != null) {
                    $('#move').html(`${data['last_move']}${data['evaluation']}`)
                }
            }
        },
        error: () => {
            $('#analysis_state').html('Failed to connect to the server.')
            setProgressVisibility(false)
            setInput(false)
            board.clear()
        }
    })
}

function run(argument) {
    if (analysis) {
        return
    }

    var reader = new FileReader()
    var fileElement = document.getElementById('pgn')
    var file = fileElement.files[0]

    if (file == null) {
        alert('No file selected.')
        return
    }

    reader.readAsText(file)
    reader.onload = function(event) {
        var pgn = event.target.result
        analysis = true
        $.ajax({
            url: argument,
            type: 'POST',
            data: pgn,
            success: () => {
                analysis = false
            },
            error: () => {
                analysis = false
            }
        })
    }
}

loadConfiguration()
getState()
setInterval(getState, 1000)
