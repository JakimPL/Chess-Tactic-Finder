class Progress {
    constructor(afterLoad, afterSave) {
        this.path = ''
        this.container = {}

        this.afterLoad = afterLoad
        this.afterSave = afterSave
    }

    clear() {
        this.container = {}
        storage.set('progress', progress.container)
    }

    update(data) {
        this.container = data
        storage.set('progress', progress.container)
    }

    get(key) {
        return this.container[key]
    }

    set(key, value) {
        this.container[key] = value
        storage.set('progress', progress.container)
    }

    saveItem(key, value, moves) {
        if (!(key in progress.container)) {
            this.set(key, value)
            this.afterSave(key, value, moves)
        }
    }

    load() {
        this.container = storage.get('progress')
        this.afterLoad()
    }

    link() {
        return 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(this.container))
    }
}
