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

$('#start').on('click', function() {
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
            url: 'analyze',
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
})

$('#reinstall').on('click', function() {
    if (installation) {
        return
    }

    installation = true
    markButton('reinstall')
    $.ajax({
        url: 'reinstall',
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
        url: 'save_configuration',
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
    fetch('configuration.json', {cache: 'no-cache'})
    .then(response => response.json())
    .then(json => {
        configuration = json
        stockfishPath = configuration['paths']['stockfish']
        pgnExtractPath = configuration['paths']['pgn_extract']
        document.getElementById('stockfish').value = stockfishPath
        document.getElementById('pgn_extract').value = pgnExtractPath
    })
}

function toggleInput(value) {
    $('#stockfish').prop('disabled', value)
    $('#pgn_extract').prop('disabled', value)
    $('#reinstall').prop('disabled', value)
    $('#tactic_player').prop('disabled', value)
}

function setProgressBar(message) {
    var progress = 0
    if (message.includes('completed')) {
        progress = 100
    } else if (message.includes(' of ')) {
        const match = message.match(/\d+\sof\s(\d+)/).toString().split(' of ')
        const n = parseInt(match[0])
        const total = parseInt(match[1])
        progress = parseFloat(100 * n) / total
    }

    $('#progress_bar').css('width', progress + '%').attr('aria-valuenow', progress)
    if (message.includes('No analysis')) {
        $('#progress').css('visibility', 'hidden')
    } else {
        $('#progress').css('visibility', 'visible')
    }
}

function getState() {
    $.ajax({
        url: 'analysis_state',
        type: 'GET',
        contentType: "application/json; charset=utf-8",
        success: (data) => {
            $('#analysis_state').html(data)
            toggleInput(false)
            setProgressBar(data)
        },
        error: () => {
            $('#analysis_state').html('Failed to connect to the server.')
            toggleInput(true)
        }
    })
}

loadConfiguration()
getState()
setInterval(getState, 5000)
