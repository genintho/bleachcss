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
	readonly github_personal_access_token?: string;
	readonly repo_owner?: string;
	readonly repo_name?: string;
	readonly target_branch?: string;
	readonly pr_branch?: string;
	readonly mark_unused_after?: number;
	readonly num_selectors_per_pr?: number;
	readonly ignored_selectors_list?: string[];
	readonly ignored_source_css_file_list?: string[];
}

export class Config {
	private messages: string[] = [];
	private errs: string[] = [];
	readonly push_to_github: boolean = false;
	readonly github_personal_access_token: string | undefined;
	readonly repo_owner: string | undefined;
	readonly repo_name: string | undefined;
	readonly target_branch: string = "master";
	readonly pr_branch: string = "bleachcss";
	readonly mark_unused_after: number = 30;
	readonly num_selectors_per_pr: number = 25;
	readonly ignored_selectors_list: string[] = [];
	readonly ignored_source_css_file_list: string[] = [];

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
			this.errs.push("💥 Missing mandatory configuration 'repo_owner'");
		}

		if (user_config.repo_name) {
			this.repo_name = user_config.repo_name;
			this.messages.push(`✅ Repo Name: '${this.repo_name}'`);
		} else {
			this.errs.push("💥 Missing mandatory configuration 'repo_name'");
		}

		if (user_config.github_personal_access_token) {
			this.github_personal_access_token =
				user_config.github_personal_access_token;
			this.messages.push("✅ Github Personal Access Token");
		} else {
			this.errs.push(
				"💥 Missing mandatory configuration 'github_personal_access_token'"
			);
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

		if (user_config.num_selectors_per_pr) {
			this.num_selectors_per_pr = Number(user_config.num_selectors_per_pr);
		}
		this.messages.push(
			`ℹ️ Pull Requests will remove at most: '${this.num_selectors_per_pr}' selectors`
		);

		if (user_config.ignored_selectors_list) {
			this.ignored_selectors_list = user_config.ignored_selectors_list;
		}
		this.messages.push(
			`ℹ️ Selectors that will be ignored: '${this.ignored_selectors_list.toString()}'`
		);

		if (user_config.ignored_source_css_file_list) {
			this.ignored_source_css_file_list =
				user_config.ignored_source_css_file_list;
		}
		this.messages.push(
			`ℹ️ Source CSS files that will be ignored: '${this.ignored_source_css_file_list.toString()}'`
		);
	}

	get has_error(): boolean {
		return this.errs.length > 0;
	}
	get logs() {
		return Object.assign([], this.errs, this.messages);
	}
	get errors() {
		return Object.assign([], this.errs);
	}
}
