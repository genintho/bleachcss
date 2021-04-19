import type express from "express";
import { findPattern } from "../lib/findPattern";
import { process_css_file } from "./process_css_file";
import { QueryFcn, Parse1Api, Parse1ApiItem } from "../../types/parse-css";

const request_cache = new Map();

export async function parseCssFile(
	req: express.Request,
	res: express.Response
) {
	console.time("Parse_CSS_File");
	const css_file_url = req.query.url as string;
	console.log(
		"----------------------------------------------------------------------------"
	);
	console.log("Parse CSS file", req.query);
	if (!request_cache.has(css_file_url)) {
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

	res.header("Content-Type", "application/json");
	res.send(JSON.stringify(request_cache.get(css_file_url), null, 4));
	console.log("API success");
	console.timeEnd("Parse_CSS_File");
}

export async function process(url: string): Promise<Parse1Api> {
	const file_pattern = findPattern(url);
	const selectors = await process_css_file(file_pattern);
	const arr = Array.from(selectors);
	arr.sort();

	const res: Record<string, Parse1ApiItem> = {};

	arr.forEach((selector) => {
		const parents = extract_parents(selector);
		res[selector] = {
			selector,
			parent: parents.length > 0 ? parents[0] : null,
			exists: true,
			fcn: QueryFcn.General,
		};
		let parent = parents.shift();
		while (parent) {
			if (!res[parent]) {
				res[parent] = {
					selector: parent,
					parent: parents.length > 0 ? parents[0] : null,
					exists: false,
					fcn: QueryFcn.General,
				};
			}
			parent = parents.pop();
		}
	});

	return Object.values(res);
}

export function extract_parents(selector: string): string[] {
	var splits = selector.split(/\s|\+|~|>/);
	if (splits.length === 1) {
		return [];
	}

	var last = splits.pop();
	var parentSelector = selector
		.substr(0, selector.length - last!.length - 1)
		.trim();
	if (["+", "~", ">"].indexOf(parentSelector.slice(-1)) !== -1) {
		parentSelector = parentSelector.slice(0, -1).trim();
	}
	return [parentSelector].concat(extract_parents(parentSelector));
}
