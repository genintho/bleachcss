const fs = require("fs");
const request = require("request-promise-native");
const http = require("http");
const https = require("https");

/**
 * Download the content of a file to a variable.
 *
 * @param {string} url
 * @returns {Promise<string>}
 */
export function toVar(url: string): Promise<string> {
	return new Promise<string>((resolve, reject) => {
		request({
			uri: url,
			method: "GET",
			gzip: true,
			resolveWithFullResponse: true,
		})
			.then((res) => {
				resolve(res.body);
			})
			.catch((e) => {
				console.error("Download to VAr error");
				reject(e);
			});
	});
}

/**
 * Download the content of a file into a file on the file system
 * @param {string} url
 * @param {string} destination
 * @returns {Promise<void>}
 */
export function toFile(url: string, destination: string): Promise<void> {
	return new Promise<void>((resolve, reject) => {
		const file = fs.createWriteStream(destination);
		const prot = getProtocol(url);
		prot
			.get(url, function (response) {
				response.pipe(file);
				file.on("finish", function () {
					file.close(resolve); // close() is async, call cb after close completes.
				});
			})
			.on("error", function (err) {
				// Handle errors
				fs.unlink(destination); // Delete the file async. (But we don't check the result)
				reject(err.message);
			});
	});
}

function getProtocol(url: string) {
	return url.substr(0, 5) === "https" ? https : http;
}
