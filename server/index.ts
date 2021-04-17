import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import { probeReport } from "./handlers/probe-report";
import * as db from "./db";
import { parseCssFile } from "./handlers/parse-css-file";

(async () => {
	await db.aaa();
})();

const app = express();

app.use(express.static("dist/probe"));

app.get("/", (req, res) => {
	res.send("👋");
});
app.post("/a/1/report", [bodyParser.text(), probeReport]);
app.get("/a/1/parse", [cors(), parseCssFile]);

app.listen(3000, () => {
	console.log("WebServer is Ready to go!");
});

// Handle any uncaught Exception. This should never been happening in production,
// but it is really useful in dev
process.on("uncaughtException", function (err) {
	console.error(err.toString());
});

// Handle any unhandled promise rejection. This should never been happening in production,
// but it is really useful in dev
process.on("unhandledRejection", function (err) {
	console.error("Error", err);
});
