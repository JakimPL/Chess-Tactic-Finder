class History {
    constructor() {
        this.currentItem = -1
        this.history = []
    }

    clear() {
        constructor()
    }

    add(item) {
        this.history.push(item)
        this.currentItem = this.history.length - 1
    }

    get() {
        return this.history.at(this.currentItem)
    }

    previous() {
        if (this.history.length <= 1 || this.currentItem <= 0) {
            return null
        }

        this.currentItem--
        return this.get()
    }

    current() {
        if (this.history.length == 0 || this.currentItem >= this.history.length) {
            return null
        }

        return this.get()
    }

    next() {
        if (this.history.length <= 1 || this.currentItem >= this.history.length - 1) {
            return null
        }

        this.currentItem++
        return this.get()
    }
}