import type express from "express";
import { findPattern } from "../lib/findPattern";
import { process_css_file } from "./process_css_file";
import { Parse1Api, Parse1ApiItem, QueryFcn } from "../../types/parse-css";
import { Logger } from "../lib/Logger";

const request_cache = new Map();

export async function parseCssFile(
	log: Logger,
	req: express.Request,
	res: express.Response
) {
	const css_file_url = req.query.url as string;
	log.info("Parse CSS file", css_file_url);
	if (!request_cache.has(css_file_url)) {
		try {
			const payload = await process(log, css_file_url);
			request_cache.set(css_file_url, payload);
		} catch (e) {
			log.info("API Parse top level error");
			log.info(e);
		}
	} else {
		log.info("API Cache hit", css_file_url);
	}

	res.header("Content-Type", "application/json");
	res.send(JSON.stringify(request_cache.get(css_file_url), null, 4));
}

export async function process(log: Logger, url: string): Promise<Parse1Api> {
	const file_pattern = findPattern(url);
	const selectors = await process_css_file(log, file_pattern);
	const arr = Array.from(selectors);
	arr.sort();

	const res: Record<string, Parse1ApiItem> = {};

	arr.forEach((selector) => {
		const parents = extract_parents(selector);
		// @TODO Decompose selector parents only if the parents has more than 1 child
		// The tree with only 1 branch and multiple nodes are creating more work than needed
		// Example if the css file has only .parent .child .grandson
		// and .parent .child .granddaughter, the we should return only ".parent .child" in the payload
		res[selector] = {
			selector,
			parent: parents.length > 0 ? parents[0] : null,
			exists: true,
			fcn: find_fcn_detection(selector),
		};
		let parent = parents.shift();
		while (parent) {
			if (!res[parent]) {
				res[parent] = {
					selector: parent,
					parent: parents.length > 0 ? parents[0] : null,
					exists: false,
					fcn: find_fcn_detection(parent),
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

export function find_fcn_detection(selector: string): QueryFcn {
	if (/^#[^\s]+$/.test(selector)) {
		return QueryFcn.id;
	}

	if (/^\.[^\s]+$/.test(selector)) {
		return QueryFcn.class;
	}
	return QueryFcn.General;
}
