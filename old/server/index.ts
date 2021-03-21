import * as path from "path";
import * as fs from "fs";
import loggerFactory from "./lib/logger";
import express = require("express");
import cors = require("cors");
import bodyParser = require("body-parser");
// import createJob from "./lib/jobQueue/createJob";

const logger = loggerFactory("server");
const app = express();
const probeJsContent = fs.readFileSync(
	path.resolve(__dirname, "../../probe/dist/browser/probe.js")
);
const probeJsContentMin = fs.readFileSync(
	path.resolve(__dirname, "../../probe/dist/browser/probe.min.js")
);

app.get("/", (req, res) => {
	res.send("FY");
});

app.get("/probe.js", (req, res) => {
	res.set("Content-Type", "application/javascript");
	res.send(probeJsContent);
});

app.get("/probe.min.js", (req, res) => {
	res.set("Content-Type", "application/javascript");
	res.send(probeJsContentMin);
});

app.get("/api/v1/probes", (req, res) => {
	res.send("FY");
});

// app.post("/api/v1/probes", [cors(), bodyParser.text()], (req, res) => {
//     logger.info("API Hit");
//     createJob("probe_report", req.body);
//     res.send("ack");
// });

app.listen(3000, () => console.log("WebServer is Ready to go!"));

// Handle any uncaught Exception. This should never been happening in production,
// but it is really usefull in dev
process.on("uncaughtException", function (err) {
	logger.error(err.toString());
});

// Handle any unhandled promise rejection. This should never been happening in production,
// but it is really usefull in dev
process.on("unhandledRejection", function (err) {
	console.error("Error", err);
});
