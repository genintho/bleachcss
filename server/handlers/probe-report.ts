import type express from "express";
import * as crypto from "crypto";
import { ProbeApiV1 } from "../../probe/src/probe";
import { findPattern } from "../lib/findPattern";
import * as Selector from "../models/Selector";
import { process_css_file } from "./process_css_file";
import { Logger } from "../lib/Logger";

const request_cache = new Set();

export async function probeReport(
	log: Logger,
	req: express.Request,
	res: express.Response
) {
	const raw_payload = req.body;
	const req_hex = crypto.createHash("md5").update(raw_payload).digest("hex");
	log.info("Probe report", req_hex);
	if (!request_cache.has(req_hex)) {
		const payload = JSON.parse(raw_payload);
		request_cache.add(req_hex);
		try {
			await process_v01(log, payload);
		} catch (e) {
			log.error("API top level error");
			log.error(e);
		}
	} else {
		log.info("API Cache hit", req_hex);
	}

	res.send("ack");
}

async function process_v01(log: Logger, payload: ProbeApiV1) {
	for (const file_url of Object.keys(payload.f)) {
		const file_pattern = findPattern(file_url);
		const selectors = payload.f[file_url];
		log.info(selectors.length, "selectors1");
		for (const selector of selectors) {
			await Selector.create(file_pattern.name, selector, true);
		}
		await process_css_file(log, file_pattern);
	}
}
