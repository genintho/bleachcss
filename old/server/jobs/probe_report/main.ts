/**
 * This job is responsible for processing the report send by the probe.
 */

import _ = require("lodash");
import * as DB from "../../lib/db";
import syncCssFiles from "../../lib/syncCssFiles";
import insertSelectors from "../../lib/insertSelectors";

export default async function main(logger, payloadStr, notifyJobComplete) {
	const payload = JSON.parse(payloadStr);
	const appId = await DB.getAppIdByKey(payload.k);

	// PAYLOAD EXAMPLE
	// v0.1
	//     var data = {
	//         v: version,
	//         k: client_key
	//         f: {}
	//     };
	switch (payload.v) {
		case "0.1":
			await processV0_1(logger, appId, payload);
			break;
		default:
			throw new Error("Can not process probe report with version " + payload.v);
	}

	notifyJobComplete();
}

async function processV0_1(logger, appId, payload) {
	// v0.1
	//     var data = {
	//         v: version,
	//         f: {
	//                CSS FILE URL               =>   Array of SEEN selector
	//             'https://lol.com/css.main.css': ['body', '.something']
	//          }
	//     };
	logger.info("Probe report process v0.1 ", { appId });

	const filesURLs = _.keys(payload.f);
	logger.debug("Files URLs in payload", filesURLs);

	const cssVariations = await syncCssFiles(logger, appId, filesURLs);
	logger.debug("Matching Css Variations", cssVariations);

	if (cssVariations.length !== filesURLs.length) {
		throw new Error("Variation size miss-match");
	}

	const insertMap = new Map();
	cssVariations.forEach(async (file) => {
		insertMap.set(file.css_file_id, payload.f[file.url]);
	});

	await insertSelectors(logger, appId, insertMap, true);
}
