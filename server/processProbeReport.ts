const crypto = require("crypto");
import findPattern from "./lib/findPattern";
import * as SelectorStore from "./selectorStore";
import MasterFile from "./lib/MasterFile";
import * as Download from "./lib/Download";
import postCssExtractor from "../probe/src/postCssExtractor";

// Allow us to not reprocess duplicates reports
const knownRequestSignature: Set<string> = new Set();

// Keep track of which FileVersion we processed
const knownFileVersion: Set<string> = new Set();

function _main(logger, rawPayload: string) {
    const payload = JSON.parse(rawPayload);
    Object.keys(payload.f).forEach((fileURL: string) => {
        logger.info("Probe", fileURL);
        // We have never seen this file yet, let's queue its processing
        if (!knownFileVersion.has(fileURL)) {
            setImmediate(async () => {
                await _processFile(logger, fileURL);
            });
            knownFileVersion.add(fileURL);
        }

        const master = _identifyMasterFile(fileURL);

        payload.f[fileURL].forEach((selector: string) => {
            logger.info("Probe", selector);
            SelectorStore.linkSelector(selector, master);
            SelectorStore.selectorSeen(selector);
        });
    });
}

function _identifyMasterFile(versionFileUrl: string): MasterFile {
    const pattern = findPattern(versionFileUrl);
    return new MasterFile(pattern.name);
}

async function _processFile(logger, url: string) {
    logger.info("Start processing file", url);
    const master = _identifyMasterFile(url);

    // Download the file
    const rawFileContent = "";
    let fileContent = "";
    try {
        fileContent = await Download.toVar(url);
    } catch (e) {
        logger.error("Error downloading file", e);
        return;
    }
    logger.debug("File content length: %d", fileContent.length);

    // Extract the list of selector from the file
    const selectorsInFile: Set<string> = await postCssExtractor(fileContent);

    // Get the previous list of selector
    const previousVersionSelectorList = SelectorStore.getSelectorsOfMaster(
        master
    );

    // Set the list of selector with what we found in memory
    selectorsInFile.forEach((s) => {
        SelectorStore.linkSelector(s, master);
    });

    // 4 diff the 2 lists
    const selectorToUnlink = new Set();
    previousVersionSelectorList.forEach((selector) => {
        if (!selectorsInFile.has(selector.id)) {
            selectorToUnlink.add(selector.id);
        }
    });

    // 5 remove the link between selector and master file
    selectorToUnlink.forEach((s) => {
        SelectorStore.unlinkSelector(s, master);
    });
}

export default function processProbeReport(logger, requestBody: string) {
    //
    const signature = crypto
        .createHash("md5")
        .update(requestBody)
        .digest("hex");

    if (knownRequestSignature.has(signature)) {
        logger.info("Payload already processed");
        return;
    }
    _main(logger, requestBody);
    knownRequestSignature.add(signature);
}
