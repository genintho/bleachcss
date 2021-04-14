import type express from "express";
import * as crypto from "crypto";
import { ProbeApiV1 } from "../../probe/src/probe";
import { findPattern, CssUrlResource } from "../lib/findPattern";
import * as CssFile from "../models/CssFile";
import * as Selector from "../models/Selector";
import { toVariable } from "../lib/download.utils";
import { postCssExtractor } from "../lib/postCssExtractor";

const request_cache = new Set();

export async function probeReport(req: express.Request, res: express.Response) {
	const raw_payload = req.body;
	const req_hex = crypto.createHash("md5").update(raw_payload).digest("hex");
	console.log(
		"----------------------------------------------------------------------------"
	);
	if (request_cache.has(req_hex)) {
		console.log("API Cache hit", req_hex);
		res.send("ack");
		return;
	}
	const payload = JSON.parse(raw_payload);
	// request_cache.add(req_hex);
	try {
		await process_v01(payload);
	} catch (e) {
		console.error("API top level error");
		console.error(e);
	}
	res.send("ack");
	console.log("API success");
}

async function process_v01(payload: ProbeApiV1) {
	for (const file_url of Object.keys(payload.f)) {
		const file_pattern = findPattern(file_url);
		console.log(file_pattern);
		const selectors = payload.f[file_url];
		console.log(selectors.length, "selectors1");
		for (const selector of selectors) {
			await Selector.create(file_pattern.name, selector, true);
		}
		await process_css_file(file_pattern);
	}
}

async function process_css_file(
	css_url_resource: CssUrlResource
): Promise<string> {
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
	return css_url_resource.name;
}
