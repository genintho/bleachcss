// Syncing CSS File means inserting new variations and triggering a job to process them

import * as DB from "../db";
import createJob from "../jobQueue/createJob";
import findPattern from "./findPattern";
import findPublicLibrary from "./findPublicLibrary";

export default async function index(
	logger,
	applicationID: number,
	newCssVariations: string[]
): Promise<CSSFileVariation[]> {
	let cssVariationFiles = await DB.getCSSFilesVariationsByUrls(
		applicationID,
		newCssVariations
	);

	logger.debug("Existing CSS File Variations", cssVariationFiles);
	if (cssVariationFiles.length !== newCssVariations.length) {
		logger.info("Some CSS File Variations are missing from the DB", {
			size: { db: cssVariationFiles.length, newCss: newCssVariations.length },
		});
		const newVariations = await addNewVariations(
			logger,
			applicationID,
			cssVariationFiles,
			newCssVariations
		);
		cssVariationFiles = cssVariationFiles.concat(newVariations);
	}

	return cssVariationFiles;
}

async function addNewVariations(
	logger,
	appId: number,
	cssVariationFiles,
	newCssVariationUrls: string[]
): Promise<CSSFileVariation[]> {
	// Load all the CSS File Definition
	const cssDefinitionFiles = await DB.getAppFiles(appId);
	logger.debug("Application CSS File definition", cssDefinitionFiles);

	const newVariations: CSSFileVariation[] = [];

	// match the url of the file with the regular expression associated with each file
	// We are using a regular for loop instead of a .forEach to be able to use await
	for (let newVariationURL of newCssVariationUrls) {
		logger.debug("process url", newVariationURL);

		// Skip variation url that are already in the db
		if (
			cssVariationFiles.find((file) => {
				return file.url === newVariationURL;
			})
		) {
			logger.debug("Variation already existing", newVariationURL);
			continue;
		}
		let matchId = matchAgainstCssFile(cssDefinitionFiles, newVariationURL);

		if (!matchId) {
			matchId = await matchPublicLibrary(logger, appId, newVariationURL);
		}

		if (!matchId) {
			matchId = await matchPattern(logger, appId, newVariationURL);
		}

		logger.info('New Variation "%s" matched with %d', newVariationURL, matchId);
		const newVariation = await DB.insertCssFileVariation(
			appId,
			matchId,
			newVariationURL
		);
		newVariations.push(newVariation);
		createJob("css_variations", newVariation.id);
	}

	return newVariations;
}

function matchAgainstCssFile(cssDefinitionFiles, url) {
	const match = cssDefinitionFiles.find((definition) => {
		if (!definition.pattern || !definition.pattern.length) {
			return false;
		}
		const reg = new RegExp(definition.pattern);
		return reg.test(url);
	});
	return match ? match.id : 0;
}

async function matchPublicLibrary(
	logger,
	appId: number,
	newVariationURL: string
): Promise<number> {
	const match = findPublicLibrary(logger, newVariationURL);
	if (match === null) {
		return 0;
	}
	logger.info("New CSS File Definition", match.name);
	const cssFileDef = await DB.insertCssFileDefinition(
		appId,
		match.name,
		match.pattern
	);
	return cssFileDef.id;
}

async function matchPattern(
	logger,
	appId: number,
	newVariationURL: string
): Promise<number> {
	const match = findPattern(logger, newVariationURL);
	if (match === null) {
		return 0;
	}
	logger.info("New CSS File Definition", match.name);
	const cssFileDef = await DB.insertCssFileDefinition(
		appId,
		match.name,
		match.pattern
	);
	return cssFileDef.id;
}
