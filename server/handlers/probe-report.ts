import type express from "express";
import * as crypto from "crypto";
import { ProbeApiV1 } from "../../probe/src/probe";

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
	console.log(payload);
	request_cache.add(req_hex);
}
