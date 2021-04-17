// import type express from "express";
import { findPattern } from "../lib/findPattern";
import { process_css_file } from "./process_css_file";

const request_cache = new Map();

export type Parse1Api = Record<string, any>;

export async function parseCssFile(
	req: express.Request,
	res: express.Response
) {
	const css_file_url = req.query.url as string;
	console.log(
		"----------------------------------------------------------------------------"
	);
	if (true || !request_cache.has(css_file_url)) {
		try {
			const payload = await process(css_file_url);
			request_cache.set(css_file_url, payload);
		} catch (e) {
			console.error("API Parse top level error");
			console.error(e);
		}
	} else {
		console.log("API Cache hit", css_file_url);
	}

	// res.json(request_cache.get(css_file_url));
	res.header("Content-Type", "application/json");
	res.send(JSON.stringify(request_cache.get(css_file_url), null, 4));
	console.log("API success");
}

export async function process(url: string) {
	const file_pattern = findPattern(url);
	const selectors = await process_css_file(file_pattern);
	const arr = Array.from(selectors);
	arr.sort();
	const payload: Parse1Api = {};
	arr.forEach((selector) => {
		payload[selector] = true;
	});
	return payload;
}

export function extract_parents(selector: string): string[] {
	var splits = selector.split(/\s|\+|~|>/);
	if (splits.length === 1) {
		return [];
	}

	var last = splits.pop();
	var parentSelector = selector
		.substr(0, selector.length - last.length - 1)
		.trim();
	if (["+", "~", ">"].indexOf(parentSelector.slice(-1)) !== -1) {
		parentSelector = parentSelector.slice(0, -1).trim();
	}
	return [parentSelector].concat(extract_parents(parentSelector));
}
