class Storage {
    set(key, value) {
        localStorage.setItem(key, JSON.stringify(value))
    }

    get(key) {
        var item = {}
        if (key in localStorage) {
            item = JSON.parse(localStorage.getItem(key))
        } else {
            localStorage.setItem(key, JSON.stringify(item))
        }

        return item
    }
}