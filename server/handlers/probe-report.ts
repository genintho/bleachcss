import type express from "express";
import * as crypto from "crypto";
import { ProbeApiV1 } from "../../probe/src/probe";
import { findPattern } from "../lib/findPattern";
import * as Selector from "../models/Selector";
import { process_css_file } from "./process_css_file";

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
