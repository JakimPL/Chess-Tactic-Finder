const keyCallbacks = new Map();

function updateOnKeyDown() {
    document.onkeydown = function checkKey(event) {
        event = event || window.event;
        const key = event.keyCode;

        if (keyCallbacks.has(key)) {
            keyCallbacks.get(key).forEach(cb => cb());
        }
    };
}

export function bindKey(keyCode, callback) {
    if (!keyCallbacks.has(keyCode)) {
        keyCallbacks.set(keyCode, []);
    }
    keyCallbacks.get(keyCode).push(callback);
    updateOnKeyDown();
}

export function unbindKey(keyCode, callback) {
    if (keyCallbacks.has(keyCode)) {
        const callbacks = keyCallbacks.get(keyCode);
        const index = callbacks.indexOf(callback);
        if (index > -1) {
            callbacks.splice(index, 1);
        }
        if (callbacks.length === 0) {
            keyCallbacks.delete(keyCode);
        }
    }
}

export function bindKeys(backward, forward) {
    bindKey(39, forward);
    bindKey(37, backward);
}
