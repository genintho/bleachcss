export default class MasterFile {
    id = null;

    constructor(id) {
        this.id = id;
    }

    toJSON() {
        return {
            id: this.id,
        };
    }
}
