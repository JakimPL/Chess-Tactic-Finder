class Storage {
    set(key, value) {
        localStorage.setItem(key, JSON.stringify(value))
    }

    get(key) {
        var item = {}
        if (key in localStorage) {
            var element = localStorage.getItem(key)
            try {
                item = JSON.parse(element)
            }
            catch (error) {
                console.error(error)
            }
        } else {
            localStorage.setItem(key, JSON.stringify(item))
        }

        return item
    }
}
