/**
 * This job is processing a new "CSS FIle Variation".
 * When a new version of this file is detected, we fetch the file, insert all the selectors it contains, if they are
 * not already created
 */
import * as _ from "lodash";
import * as DB from "../../lib/db";
import * as Download from "../../lib/Download";
import * as postCssExtractor from "../../../probe/src/postCssExtractor";

import insertSelectors from "../../lib/insertSelectors";

export default async function main(logger, cssVariationID, notifyJobComplete) {
    logger.info("Start job", cssVariationID);
    try {
        __main(logger, cssVariationID);
    } catch (e) {
        logger.error("main throw an error");
        await DB.updateCssVariationStatus(cssVariationID, "ERROR");
    }
    logger.info("done with job main");
    notifyJobComplete();
}

async function __main(logger, cssVariationID) {
    const cssVariation = await DB.getCSSFileVariationByID(cssVariationID);
    const url = cssVariation.url;

    logger.info("Download file %s", url);
    let fileContent = "";
    try {
        fileContent = await Download.toVar(url);
    } catch (e) {
        logger.error("Error downloading file");
        return;
    }
    logger.debug("File content length: %d", fileContent.length);

    const selectorsInFile: Set<string> = await postCssExtractor(fileContent);
    logger.debug(
        "Selectors found in the new css variations",
        selectorsInFile.size
    );

    const selectorsInDb = await DB.getAllSelectorsWithFilter(
        cssVariation.application_id,
        cssVariation.css_file_id
    );
    await deleteSelectors(
        logger,
        cssVariation.css_file_id,
        selectorsInDb,
        Array.from(selectorsInFile)
    );

    const m = new Map();
    m.set(cssVariation.css_file_id, Array.from(selectorsInFile));
    await insertSelectors(logger, cssVariation.application_id, m, false);

    await DB.updateCssVariationStatus(cssVariationID, "SUCCESS");
}

async function deleteSelectors(
    logger,
    cssFileId: number,
    selectorsInDb,
    selectorsInFile: string[]
) {
    const existingSelectors = _.map(selectorsInDb, "selector");
    const missingSelectors = _.difference(existingSelectors, selectorsInFile);

    logger.debug("Missing selectors", missingSelectors);

    if (missingSelectors.length === 0) {
        return;
    }

    for (let missingSelector of missingSelectors) {
        const selectorInDb = selectorsInDb.find((item) => {
            return item.selector === missingSelector;
        });
        await DB.deleteSelectorMapping(cssFileId, selectorInDb.id);

        if (selectorInDb.mapping_state === "no") {
            logger.debug("Selector need to be deleted", selectorInDb.selector);
            await DB.deleteSelector(selectorInDb.id);
        }
    }
}
