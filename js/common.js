function markButton(button) {
    document.getElementById(button).style.backgroundColor = '#b58863'
}

function unmarkButton(button) {
    document.getElementById(button).style.backgroundColor = '#f0d9b5'
}

function delay(callback, time) {
    var time = time == null ? delayTime : time
    wait = true
    action += 1
    var currentAction = action
    setTimeout(() => {
        if (action == currentAction) {
            callback()
        }

        wait = false
        updateStatus()
    }, time)
}
