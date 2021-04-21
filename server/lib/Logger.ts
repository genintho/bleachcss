import chalk from "chalk";

export class Logger {
	private readonly hash: string;
	private readonly prefix: string;

	private timers: Map<string, [number, number]> = new Map();

	constructor(prefix = "") {
		this.hash = chalk.bgHex(Logger.make_color())(Logger.make_id());
		this.prefix = prefix;
	}

	public error(...args: any[]) {
		this.log(chalk.redBright.bold, ...args);
	}

	public warn(...args: any[]) {
		this.warning(...args);
	}

	public warning(...args: any[]) {
		this.log(chalk.yellowBright, ...args);
	}

	public info(...args: any[]) {
		this.log(chalk.white, ...args);
	}

	public debug(...args: any[]) {
		this.log(chalk.grey, ...args);
	}

	public time(label: string) {
		this.timers.set(label, process.hrtime());
	}

	public timeEnd(label: string) {
		const start = this.timers.get(label);
		this.timers.delete(label);
		const end = process.hrtime(start);
		let str = label + " ";
		if (end[0]) {
			str = end[0] + "s ";
		}
		str += Math.floor(end[1] / 100000) / 10 + "ms";
		this.info(str);
	}

	private log(line_decorator: any, ...args: any[]): void {
		const date = new Date().toISOString().substr(0, 19).replace("T", " ");
		console.log(this.hash, "-", line_decorator(date, "-", ...args));
	}

	private static make_color(): string {
		return Math.floor(Math.random() * 16777215).toString(16);
	}

	private static make_id(): string {
		let text = "";
		let possible =
			"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
		for (let i = 0; i < 8; i++) {
			text += possible.charAt(Math.floor(Math.random() * possible.length));
		}
		return text;
	}
}
