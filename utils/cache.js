class Cache {
    constructor() {
        if (!Cache.instance) {
            this.cache = new Map();
            Cache.instance = this;
        }
        return Cache.instance;
    }

    set(key, value) {
        this.cache.set(key, value);
    }

    get(key) {
        return this.cache.get(key);
    }

    del(keys) {
        for (const key of keys) {
            this.cache.delete(key);
        }
    }

    size() { 
        return this.cache.size
    }

    getAll() {
        return this.cache;
    }
}

module.exports = new Cache();