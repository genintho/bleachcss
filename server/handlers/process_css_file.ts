import { CssUrlResource } from "../lib/findPattern";
import * as CssFile from "../models/CssFile";
import { toVariable } from "../lib/download.utils";
import { postCssExtractor } from "../lib/postCssExtractor";
import * as Selector from "../models/Selector";

export async function process_css_file(
	css_url_resource: CssUrlResource
): Promise<Set<string>> {
	await CssFile.create(css_url_resource.name);
	const is_new_file_version = await CssFile.record_history(
		css_url_resource.name,
		css_url_resource.url
	);
	if (!is_new_file_version) {
		console.log("file version is existing");
		// return;
	}

	console.log("Download CSS File", css_url_resource.url);
	const css_file_content = await toVariable(css_url_resource.url);
	const selectors_in_file = await postCssExtractor(css_file_content);
	console.log("CSS File has %d selectors", selectors_in_file.size);
	for (const selector of Array.from(selectors_in_file)) {
		await Selector.create(css_url_resource.name, selector, false);
	}

	const selectors_in_db = await Selector.getFromFile(css_url_resource.name);
	console.log(
		"CSS File has %d selectors referenced in the DB",
		selectors_in_db.length
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
