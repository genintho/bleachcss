import { CssUrlResource } from "../lib/findPattern";
import * as CssFile from "../models/CssFile";
import { toVariable } from "../lib/download.utils";
import { postCssExtractor } from "../lib/postCssExtractor";
import * as Selector from "../models/Selector";
import { Logger } from "../lib/Logger";

export async function process_css_file(
	log: Logger,
	css_url_resource: CssUrlResource
): Promise<Set<string>> {
	await CssFile.create(log, css_url_resource.name);
	const is_new_file_version = await CssFile.record_history(
		log,
		css_url_resource.name,
		css_url_resource.url
	);
	if (!is_new_file_version) {
		log.info("file version is existing");
		// return;
	}

	log.info("Download CSS File", css_url_resource.url);
	const css_file_content = await toVariable(css_url_resource.url);
	const selectors_in_file = await postCssExtractor(css_file_content);
	log.info(`CSS File has ${selectors_in_file.size} selectors`);
	for (const selector of Array.from(selectors_in_file)) {
		await Selector.create(css_url_resource.name, selector, false);
	}

	const selectors_in_db = await Selector.getFromFile(css_url_resource.name);
	log.info(
		`CSS File has ${selectors_in_db.length} selectors referenced in the DB`
	);
	for (const record of selectors_in_db) {
		// Selector is not found in the CSS file
		if (!selectors_in_file.has(record.selector)) {
			await Selector.removeAssociation(
				css_url_resource.name,
				record.selector,
				record.num_reference === 1
			);
		}
	}
	return selectors_in_file;
}
