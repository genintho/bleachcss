import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import { probeReport } from "./handlers/probe-report";
import * as db from "./db";
import { parseCssFile } from "./handlers/parse-css-file";
import { Logger } from "./lib/Logger";

const log = new Logger("www");

(async () => {
	await db.run_migrations();
})();

const app = express();

app.use(express.static("dist/probe"));

app.get("/", (req, res) => {
	res.send("👋");
});

[
	{
		url: "/a/1/report",
		method: "post",
		middleware: [bodyParser.text],
		fcn: probeReport,
	},
	{ url: "/a/1/parse", method: "get", middleware: [], fcn: parseCssFile },
].forEach((handler) => {
	// @ts-ignore
	app[handler.method](
		handler.url,
		[cors()].concat(
			// @ts-ignore
			handler.middleware.map((md) => {
				return md();
			}),
			[
				async (req, res) => {
					const log = new Logger(handler.url);
					log.time(handler.url);
					log.info("API call starts");
					// @ts-ignore
					await handler.fcn(log, req, res);
					log.info("API call ends");
					log.timeEnd(handler.url);
				},
			]
		)
	);
});

app.listen(3000, () => {
	log.info("WebServer is Ready to go!");
});

// Handle any uncaught Exception. This should never been happening in production,
// but it is really useful in dev
process.on("uncaughtException", function (err) {
	log.error(err.toString());
});

// Handle any unhandled promise rejection. This should never been happening in production,
// but it is really useful in dev
process.on("unhandledRejection", function (err) {
	log.error("Error", err);
});
