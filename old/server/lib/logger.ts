import winston = require("winston");

function makeid() {
	let text = "";
	let possible =
		"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
	for (let i = 0; i < 8; i++) {
		text += possible.charAt(Math.floor(Math.random() * possible.length));
	}
	return text;
}

export default function factory(label: string) {
	const requestID = makeid();

	return new winston.Logger({
		level: process.env.LOG_LEVEL ? process.env.LOG_LEVEL : "silly",
		transports: [
			new winston.transports.Console({
				prettyPrint: true,
				colorize: "all",
				label: label + " " + requestID,
				timestamp: true,
			}),
		],
	});
}
