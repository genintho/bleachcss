import * as DB from "./db";

export default async function insertSelectors(
    logger,
    appID: number,
    cssFileIdToSelectors: Map<number, string[]>,
    markAsSeen: boolean
): Promise<void> {
    for (let row of cssFileIdToSelectors) {
        const cssFileID = row[0];
        const selectorsStr = row[1];

        // Get the selector in the DB for this file, left join the join table
        let selectors = await _getExistingSelectors(
            appID,
            cssFileID,
            selectorsStr
        );
        logger.debug("Existing selector", selectors);

        // Insert missing elements
        await _insertMissingSelector(
            logger,
            appID,
            cssFileID,
            selectorsStr,
            selectors,
            markAsSeen
        );

        // Update in the join table row not updated in > 24 h
        if (markAsSeen) {
            await _updateUsage(logger, appID, selectors);
        }

        // INSERT in the JOIN table elements missing
        await _completeMapping(appID, cssFileID, selectors);
    }
}

async function _completeMapping(
    appID: number,
    cssFileID: number,
    selectors: Map<string, CSSSelector>
) {
    const selectorToMap: number[] = [];
    selectors.forEach(selector => {
        // The query is returning the application id only if the left join is matching
        if (!selector.application_id) {
            selectorToMap.push(selector.id);
        }
    });
    if (selectorToMap.length) {
        await DB.insertNewSelectorMapping(appID, cssFileID, selectorToMap);
    }
}

function _getExistingSelectors(appID, cssFileID, selectors: string[]) {
    return new Promise<Map<string, CSSSelector>>(async (resolve, reject) => {
        const foundSelectors = await DB.getSelectorByName(
            appID,
            cssFileID,
            selectors
        );
        const res = new Map();
        foundSelectors.forEach(row => {
            res.set(row.selector, row);
        });

        resolve(res);
    });
}

async function _insertMissingSelector(
    logger,
    appID,
    cssFileID,
    selectorsStr,
    selectors,
    markAsSeen
) {
    const missing = _findMissing(selectorsStr, selectors);
    logger.debug("Missing selectors", missing);

    if (missing.length) {
        // Insert in the selector table
        await DB.insertNewSelectors(appID, cssFileID, missing, markAsSeen);
    }
}

function _findMissing(
    selectorsStr: string[],
    selectorsRow: Map<string, CSSSelector>
): string[] {
    const missingSelectors: string[] = [];

    selectorsStr.forEach(selector => {
        if (!selectorsRow.has(selector)) {
            missingSelectors.push(selector);
        }
    });

    return missingSelectors;
}

async function _updateUsage(
    logger,
    appID: number,
    selectors: Map<string, CSSSelector>
) {
    const selectorToUpdate: number[] = [];
    const lowLimit = Date.now() - 24 * 3600 * 1000;
    selectors.forEach(selector => {
        if (new Date(selector.updated_at).getTime() < lowLimit) {
            selectorToUpdate.push(selector.id);
        }
    });
    logger.debug("IDs of selectors to update", selectorToUpdate);
    if (selectorToUpdate.length) {
        await DB.updateSelectorSeen(appID, selectorToUpdate);
    }
}
