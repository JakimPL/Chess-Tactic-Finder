export default class Progress {
    constructor(storage, afterLoad, afterSave) {
        this.path = "";
        this.container = {};

        this.storage = storage;
        this.afterLoad = afterLoad;
        this.afterSave = afterSave;
    }

    clear() {
        this.container = {};
        this.storage.set("progress", this.container);
    }

    update(data) {
        this.container = data;
        this.storage.set("progress", this.container);
    }

    get(key) {
        return this.container[key];
    }

    set(key, value) {
        this.container[key] = value;
        this.storage.set("progress", this.container);
    }

    saveItem(key, value, moves) {
        if (!(key in this.container)) {
            this.set(key, value);
            this.afterSave(key, value, moves);
        }
    }

    load() {
        this.container = this.storage.get("progress");
        this.afterLoad();
    }

    link() {
        return (
            "data:text/json;charset=utf-8," +
            encodeURIComponent(JSON.stringify(this.container))
        );
    }
}
