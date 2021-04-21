import axios from "axios";
import * as fs from "fs";
import * as https from "https";

export function toVariable(url: string) {
	return axios
		.request({
			responseType: "text",
			url,
			method: "get",
			headers: {
				"Content-Type": "text/css",
			},
		})
		.then((result) => {
			return result.data;
		});
}

// const fs = require("fs");
// const request = require("request-promise-native");
// const http = require("http");
// const https = require("https");

// function getProtocol(url: string) {
// 	return url.substr(0, 5) === "https" ? https : http;
// }

/**
 * Download the content of a file into a file on the file system
 */
export function toFile(url: string, destination: string): Promise<void> {
	return new Promise<void>((resolve, reject) => {
		const file = fs.createWriteStream(destination);
		https
			.get(url, function (response) {
				response.pipe(file);
				file.on("finish", function () {
					file.close(); // close() is async, call cb after close completes.
					resolve();
				});
			})
			.on("error", function (err) {
				// Handle errors
				fs.unlinkSync(destination); // Delete the file async. (But we don't check the result)
				reject(err.message);
			});
	});
}
