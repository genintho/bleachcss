import type express from "express";
import * as crypto from "crypto";
import { ProbeApiV1 } from "../../probe/src/probe";
import { findPattern } from "../lib/findPattern";

const request_cache = new Set();

export function probeReport(req: express.Request, res: express.Response) {
	const raw_payload = req.body;
	const req_hex = crypto.createHash("md5").update(raw_payload).digest("hex");
	if (request_cache.has(req_hex)) {
		console.log("API Cache hit", req_hex);
		res.send("ack");
		return;
	}
	const payload = JSON.parse(raw_payload);
	request_cache.add(req_hex);
	process_v01(payload);
	res.send("ack");
}

function process_v01(payload: ProbeApiV1) {
	Object.keys(payload.f).forEach((file_url) => {
		// a
		const r = findPattern(file_url);
		const selectors = payload.f[file_url];
	});
}
