import Selector from "./lib/Selector";
import MasterFile from "./lib/MasterFile";

const _selectors: Map<string, Selector> = new Map();

function _getOrCreate(selector: string): Selector {
    if (!_selectors.has(selector)) {
        const cls = new Selector(selector);
        _selectors.set(selector, cls);
    }
    return _selectors.get(selector);
}

export function linkSelector(selector: string, masterFile: MasterFile) {
    const instance = _getOrCreate(selector);
    instance.linkToFile(masterFile);
}

export function selectorSeen(selector: string) {
    const instance = _getOrCreate(selector);
    instance.markAsSeen();
}

export function unlinkSelector(selector: string, masterFile: MasterFile) {
    const instance = _getOrCreate(selector);
    instance.unlinkToFile(masterFile);
}

export function getSelectorsOfMaster(master: MasterFile): Array<Selector> {
    const r: Array<Selector> = [];
    _selectors.forEach((s) => {
        if (s.isLinkToFile(master)) {
            r.push(s);
        }
    });
    return r;
}

export function getRemovable() {
    // get selector with not seen in a while
}

/**
 * Use for saving state into a file / build some stats
 */
export function getState() {
    return Array.from(_selectors);
}

export function restoreFromState() {}
