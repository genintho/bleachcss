const fs = require("fs");
const zlib = require("zlib");
const esbuild = require("esbuild");
const path = require("path");

const RELEASE_FOLDER = path.resolve(__dirname, "dist/probe");
const PAST_RELEASE_FOLDER = path.resolve(__dirname, RELEASE_FOLDER, "releases");

const files = fs.readdirSync(PAST_RELEASE_FOLDER).filter((name) => {
	return name.includes("min.js.br");
});
files.sort();
const target_file = files[files.length - 1];
const version = target_file.substring(0, target_file.indexOf("-"));

esbuild.buildSync({
	entryPoints: [path.resolve(__dirname, "./probe/src/probe.js")],
	bundle: true,
	minify: false,
	sourcemap: false,
	target: ["chrome58", "firefox57", "safari11", "edge16"],
	outfile: path.resolve(RELEASE_FOLDER, "probe.js"),
});

esbuild.buildSync({
	entryPoints: ["./probe/src/probe.js"],
	bundle: true,
	minify: true,
	sourcemap: true,
	target: ["chrome58", "firefox57", "safari11", "edge16"],
	outfile: path.resolve(RELEASE_FOLDER, "probe.min.js"),
});

const stats = {};

Promise.all(
	["probe.js", "probe.min.js"].map((filename) => {
		const BASE_FILE_PATH = path.resolve(RELEASE_FOLDER, filename);
		return Promise.all([
			new Promise((resolve, reject) => {
				fs.createReadStream(BASE_FILE_PATH)
					.pipe(zlib.createGzip({ level: 9 }))
					.pipe(fs.createWriteStream(BASE_FILE_PATH + ".gz"))
					.on("finish", (err) => {
						err ? reject(err) : resolve();
					});
			}),

			new Promise((resolve, reject) => {
				fs.createReadStream(BASE_FILE_PATH)
					.pipe(zlib.createBrotliCompress({}))
					.pipe(fs.createWriteStream(BASE_FILE_PATH + ".br"))
					.on("finish", (err) => {
						err ? reject(err) : resolve();
					});
			}),
		]).then(() => {
			const BASE_VERSION_PATH = path.resolve(
				PAST_RELEASE_FOLDER,
				version + "-" + filename
			);
			const idx = path.basename(BASE_FILE_PATH);
			stats[idx] = {
				js: fs.statSync(BASE_FILE_PATH).size,
				[version + ".js"]: fs.statSync(BASE_VERSION_PATH).size,
				gz: fs.statSync(BASE_FILE_PATH + ".gz").size,
				[version + ".gz"]: fs.statSync(BASE_VERSION_PATH + ".gz").size,
				br: fs.statSync(BASE_FILE_PATH + ".br").size,
				[version + ".br"]: fs.statSync(BASE_VERSION_PATH + ".br").size,
			};
			["js", "gz", "br"].forEach((ext) => {
				const delta = stats[idx][ext] - stats[idx][version + "." + ext];
				stats[idx]["delta" + ext] = (delta >= 0 ? "+" : "") + delta;
			});
		});
	})
).then(() => {
	console.table(stats);
});
