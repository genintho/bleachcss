import MasterFile from "./MasterFile";

export default class Selector {
    id: string;
    seenAt = null;
    _foundInFile = new Set();

    constructor(id: string) {
        this.id = id;
    }

    markAsSeen() {
        this.seenAt = new Date().getTime();
    }

    isLinkToFile(masterFile: MasterFile) {
        return this._foundInFile.has(masterFile.id);
    }

    linkToFile(masterFile: MasterFile) {
        this._foundInFile.add(masterFile.id);
    }

    unlinkToFile(masterFile: MasterFile) {
        this._foundInFile.delete(masterFile.id);
    }

    hasLinks() {
        return this._foundInFile.size > 0;
    }

    toJSON() {
        return {
            id: this.id,
            seenAt: this.seenAt,
            linkedMasterFiles: Array.from(this._foundInFile),
        };
    }
}
