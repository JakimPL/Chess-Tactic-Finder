export default class Storage {
    set(key, value) {
        localStorage.setItem(key, JSON.stringify(value));
    }

    get(key) {
        let item = {};
        if (key in localStorage) {
            const element = localStorage.getItem(key);
            try {
                item = JSON.parse(element);
            } catch (error) {
                console.error(error);
            }
        } else {
            localStorage.setItem(key, JSON.stringify(item));
        }

        return item;
    }
}
