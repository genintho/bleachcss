import * as fs from "fs";
import * as path from "path";
import type { Logger } from "./Logger";

let cache: Config | null = null;

export function get_config(log: Logger): Config {
	if (!cache) {
		log.debug("Loading configuration");
		const config_path = path.resolve(__dirname, "../../bleachcss.config.js");
		let user_config: Configuration = {};
		if (fs.existsSync(config_path)) {
			user_config = Object.assign(user_config, require(config_path));
		}

		cache = new Config(user_config);
	}
	return cache;
}

export interface Configuration {
	readonly push_to_github?: boolean;
	readonly repo_owner?: string;
	readonly repo_name?: string;
	readonly target_branch?: string;
	readonly pr_branch?: string;
	readonly mark_unused_after?: number;
	readonly ignore?: {
		readonly selectors?: string[];
		readonly files?: string[];
	};
}

export class Config {
	private messages: string[] = [];
	private errors: string[] = [];
	readonly push_to_github: boolean = false;
	readonly repo_owner: string | undefined;
	readonly repo_name: string | undefined;
	readonly target_branch: string = "master";
	readonly pr_branch: string = "bleachcss";
	readonly mark_unused_after: number = 30;

	constructor(user_config: Configuration) {
		if (user_config.push_to_github !== true) {
			this.messages.push(
				"ℹ️ Syncing with Github disable - push_to_github is missing or set to false"
			);
			return;
		}

		this.push_to_github = true;
		this.messages.push(
			"ℹ️ Syncing with Github enable - push_to_github set to true"
		);

		if (user_config.repo_owner) {
			this.repo_owner = user_config.repo_owner;
			this.messages.push(`✅ Repo Owner: '${this.repo_owner}'`);
		} else {
			this.errors.push("💥 Missing mandatory configuration 'repo_owner'");
		}

		if (user_config.repo_name) {
			this.repo_name = user_config.repo_name;
			this.messages.push(`✅ Repo Name: '${this.repo_name}'`);
		} else {
			this.errors.push("💥 Missing mandatory configuration 'repo_name'");
		}

		if (user_config.target_branch) {
			this.target_branch = user_config.target_branch;
		}
		this.messages.push(`ℹ️ Target Branch: '${this.target_branch}'`);

		if (user_config.pr_branch) {
			this.pr_branch = user_config.pr_branch;
		}
		this.messages.push(`ℹ️ PR Branch: '${this.pr_branch}'`);

		if (user_config.mark_unused_after) {
			this.mark_unused_after = user_config.mark_unused_after;
		}
		this.messages.push(
			`ℹ️ Selectors are considered unused after: '${this.mark_unused_after}' days`
		);
	}

	get has_error(): boolean {
		return this.errors.length > 0;
	}
	get logs() {
		return Object.assign([], this.errors, this.messages);
	}
}
