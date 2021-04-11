import type express from "express";

export async function probeReport(req: express.Request, res: express.Response) {
	console.info("API Hit");
	// createJob("probe_report", req.body);
	res.send("ack");
}
