import { exec } from "child_process";
import extract_zip from "extract-zip";
import * as fs from "fs";
import * as path from "path";
import * as Selector from "./server/models/Selector";
import { Octokit } from "@octokit/rest";
import * as Download from "./server/lib/download.utils";

import { Config, get_config } from "./server/lib/Config";
import { Logger } from "./server/lib/Logger";
import postcss, { Root } from "postcss";
import postcss_nested from "postcss-nested";
import postcss_scss from "postcss-scss";

(async () => {
	try {
		await main();
	} catch (e) {
		console.log(e);
	}
})();

async function main() {
	const log = new Logger("repo-sync");
	log.info("Start to sync with the repo");
	const config = get_config(log);
	config.logs.forEach((msg) => log.info(msg));
	if (config.has_error) {
		log.error(config.errors);
		process.exit(1);
	}
	if (!config.push_to_github) {
		log.info("Sync with Github is disable.");
		process.exit(0);
	}
	const octokit = new Octokit({
		log,
		headers: {
			"user-agent": "BleachCSS", // GitHub is happy with a unique user agent
		},
		auth: config.github_personal_access_token,
	});

	const unused_selectors = await Selector.get_unused(
		log,
		config.mark_unused_after
	);

	log.info(unused_selectors.length, "selectors are deemed as unused");
	if (unused_selectors.length === 0) {
		log.info("Nothing to remove, exiting");
		process.exit(0);
	}

	const repo_dir = await downloadArchive(log, octokit, config);

	const css_file_sources = await load_source_css_files(repo_dir, log, config);

	const { new_content, selectors_removed } = await remove_selector_from_source(
		log,
		octokit,
		config,
		css_file_sources,
		unused_selectors
	);

	if (new_content.size === 0) {
		log.info("Nothing changed, script is over");
		return;
	}

	await createOrGetBranchSha(log, octokit, config);

	const { head_commit_sha, tree_recent_commit_sha } = await get_recent_commit(
		log,
		octokit,
		config
	);

	const new_tree_sha = await create_new_tree(
		log,
		octokit,
		config,
		tree_recent_commit_sha,
		repo_dir,
		new_content
	);

	const new_commit_sha = await create_commit(
		log,
		octokit,
		config,
		new_tree_sha,
		head_commit_sha
	);

	await update_branch(log, octokit, config, new_commit_sha);

	await create_pr(log, octokit, config, selectors_removed, unused_selectors);

	if (fs.existsSync(repo_dir)) {
		fs.rmSync(repo_dir, { recursive: true });
	}
	log.info("Done");
}

async function get_recent_commit(
	log: Logger,
	octokit: Octokit,
	config: Config
) {
	log.info("Get target branch most recent commit");
	const most_recent_commit_sha = await octokit.repos.getCommit({
		// @ts-expect-error
		repo: config.repo_name,
		// @ts-expect-error
		owner: config.repo_owner,
		per_page: 1,
		ref: config.target_branch,
	});
	log.info("Most recent commit ", most_recent_commit_sha.data.sha);
	return {
		tree_recent_commit_sha: most_recent_commit_sha.data.commit.tree.sha,
		head_commit_sha: most_recent_commit_sha.data.sha,
	};
}

async function create_commit(
	log: Logger,
	octokit: Octokit,
	config: Config,
	new_tree_sha: string,
	head_commit_sha: string
) {
	log.info("Commit changes");
	const {
		data: { sha: new_commit_sha },
	} = await octokit.git.createCommit({
		// @ts-expect-error
		owner: config.repo_owner,
		// @ts-expect-error
		repo: config.repo_name,
		message: "BleachCSS -" + new Date().toISOString(),
		tree: new_tree_sha,
		parents: [head_commit_sha],
		author: {
			name: "BleachCSS",
			email: "thomas@bleachcss.com",
			date: new Date().toISOString(),
		},
	});
	log.info("New commit sha", new_commit_sha);
	return new_commit_sha;
}

async function create_pr(
	log: Logger,
	octokit: Octokit,
	config: Config,
	selectors_removed: Set<string>,
	unused_selectors: string[]
) {
	const pr_body = [
		"<details>",
		`<summary>Remove ${selectors_removed.size} selectors</summary>`,
		"<ul>",
	]
		.concat(
			Array.from(selectors_removed).map((selector) => {
				return `<li>${selector}</li>\n`;
			}),
			[
				"</ul>",
				"</details>",
				`<i>${
					unused_selectors.length - selectors_removed.size
				} selectors left to remove</i>`,
			]
		)
		.join("\n");

	try {
		log.info("Try to create Pull request");
		await octokit.pulls.create({
			// @ts-expect-error
			repo: config.repo_name,
			// @ts-expect-error
			owner: config.repo_owner,
			title: "[BleachCss] - Remove unused CSS selectors",
			head: config.pr_branch,
			base: config.target_branch,
			body: pr_body,
		});
		return;
	} catch (e) {
		if (!e.errors[0].message.startsWith("A pull request already exists")) {
			log.error(e);
			throw e;
		}
	}
	log.info("PR already exists, updating it");
	const pr_num = await find_existing_pr_number(log, octokit, config);
	log.info(`Existing PR num ${pr_num}`);
	if (pr_num === undefined) {
		return;
	}
	await octokit.pulls.update({
		// @ts-expect-error
		owner: config.repo_owner,
		// @ts-expect-error
		repo: config.repo_name,
		pull_number: pr_num,
		body: pr_body,
	});
	//
}

async function find_existing_pr_number(
	log: Logger,
	octokit: Octokit,
	config: Config
): Promise<number | undefined> {
	// - - - -
	log.info("branch:" + config.pr_branch);
	const res = await octokit.pulls.list({
		// @ts-expect-error
		repo: config.repo_name,
		// @ts-expect-error
		owner: config.repo_owner,
		state: "open",
		head: "" + config.pr_branch,
	});
	for (let i = 0; i < res.data.length; i++) {
		const pr = res.data[i];
		if (pr.state === "open" && pr.head.ref === config.pr_branch) {
			return pr.number;
		}
	}
	return;
}

async function load_source_css_files(
	repo_dir: string,
	log: Logger,
	config: Config
): Promise<Map<string, Root>> {
	const css_files = await find_source_css_file_paths(repo_dir);
	const postcss_file = new Map();
	for (let file_path of css_files) {
		const normalized_file_path = normalizePath(repo_dir, file_path);
		log.debug("Process CSS file", normalized_file_path);
		if (config.ignored_source_css_file_list.includes(normalized_file_path)) {
			log.debug(`CSS File '${normalized_file_path}' is on the ignored list`);
			continue;
		}

		const file_content = fs.readFileSync(file_path, { encoding: "utf-8" });
		const pCss = await postcss([postcss_nested]).process(file_content, {
			from: undefined,
			parser: postcss_scss,
		});

		if (!pCss.root) {
			throw new Error("PostCss parsing failed.");
		}
		postcss_file.set(file_path, pCss.root);
	}
	return postcss_file;
}

async function remove_selector_from_source(
	log: Logger,
	octokit: Octokit,
	config: Config,
	css_files: Map<string, Root>,
	unused_selectors: string[]
): Promise<{
	new_content: Map<string, string>;
	selectors_removed: Set<string>;
}> {
	const selectors_removed: Set<string> = new Set();
	const modified_files: Set<string> = new Set();

	for (const selector of unused_selectors) {
		log.debug("Look at selector", selector);
		if (selectors_removed.size >= config.num_selectors_per_pr) {
			log.debug(
				"Reach limit of the number of CSS selector that can be removed in a PR"
			);
			break;
		}

		if (config.ignored_selectors_list.includes(selector)) {
			log.debug(`Selector '${selector}' is on the ignored list`);
			continue;
		}

		css_files.forEach((postcss_file_instance, file) => {
			postcss_file_instance.walkRules((rule: any) => {
				if (rule.selector === selector) {
					log.info('file %s unused selector "%s"', file, rule.selector);
					rule.remove();
					modified_files.add(file);
					selectors_removed.add(selector);
				}
			});
		});
	}

	const new_content: Map<string, string> = new Map();
	for (let file_path of Array.from(modified_files)) {
		log.debug("Regenerate file", file_path);
		const clean_css = await new Promise<string>((resolve) => {
			let newCssStr = "";
			// @ts-expect-error
			postcss.stringify(css_files.get(file_path), (result) => {
				newCssStr += result;
			});
			resolve(newCssStr);
		});

		new_content.set(file_path, clean_css);
	}
	return { new_content, selectors_removed };
}

function getTreeBlobs(dir: string, new_content: Map<string, string>) {
	const res: any = [];
	new_content.forEach((content, path) => {
		res.push({
			path: normalizePath(dir, path),
			content,
			// sha: path_blob.get(path),
			mode: "100644",
		});
	});
	return res;
}

function normalizePath(dir: string, filePath: string): string {
	// filePath = /tmp/job_create_prc2A8to/genintho-test-b6b72f9/css/test.css
	const a = filePath.replace(dir, "");
	// a /genintho-test-b6b72f9/css/test.css

	const b = a.split("/");
	// b [ '', 'genintho-test-b6b72f9', 'css', 'test.css' ]
	b.shift();
	b.shift();

	// b2 [ 'css', 'test.css' ]
	return b.join("/");
	// c css/test.css
}

async function downloadArchive(
	log: Logger,
	octokit: Octokit,
	config: Config
): Promise<string> {
	const dir = path.resolve(__dirname, "repo", new Date().getTime().toString());
	log.info("Root directory", dir);
	fs.mkdirSync(dir);
	const archive_tar = path.join(dir, "archive.zip"); // @TODO random file name
	const archive_url = await getArchiveURL(log, octokit, config);
	log.info("Archive URL", archive_url);
	if (archive_url === undefined) {
		log.error("Archive URL was not found");
		process.exit(1);
	}
	await Download.toFile(
		archive_url,
		archive_tar,
		// @ts-ignore
		config.github_personal_access_token
	);
	log.info(
		"Archive downloaded with success. Size",
		fs.statSync(archive_tar).size
	);
	await extract_zip(archive_tar, { dir });

	return dir;
}

async function getArchiveURL(
	log: Logger,
	octokit: Octokit,
	config: Config
): Promise<string | undefined> {
	const response = await octokit.repos.downloadZipballArchive({
		request: {
			redirect: "manual", // Needed or the code will try to download the thing all in memory
		},
		// @ts-expect-error
		owner: config.repo_owner,
		// @ts-expect-error
		repo: config.repo_name,
	});
	return response?.headers?.location;
}

export function find_source_css_file_paths(
	path_input: string
): Promise<string[]> {
	return new Promise<string[]>((resolve, reject) => {
		// @FIXME escape command
		const cmd =
			"find " +
			path_input +
			' -type f -iname "*.css" -or -iname "*.scss" -or -iname "*.sass" | grep -v node_modules';
		exec(cmd, (error, stdout, stderr) => {
			if (error) {
				reject(`exec error: ${error}`);
				return;
			}
			const files: string[] = [];
			stdout.split("\n").forEach((filename) => {
				if (filename.length) {
					files.push(filename);
				}
			});
			resolve(files);
		});
	});
}

async function createOrGetBranchSha(
	log: Logger,
	octokit: Octokit,
	config: Config
): Promise<string> {
	try {
		log.info("Try to get branch");
		const branch = await octokit.git.getRef({
			// @ts-expect-error
			owner: config.repo_owner,
			// @ts-expect-error
			repo: config.repo_name,
			ref: "heads/" + config.pr_branch,
		});
		if (branch.data.object.sha) {
			log.info("Branch already existing", branch.data.object.sha);
			return branch.data.object.sha;
		}
	} catch (e) {
		// Nothing to o
		log.error(e);
	}
	// Create a new Branch
	log.info("Branch does not exists, create a new one");
	log.info("Get Reference to HEAD hash");
	const response = await octokit.git.getRef({
		// @ts-expect-error
		owner: config.repo_owner,
		// @ts-expect-error
		repo: config.repo_name,
		ref: "heads/" + config.target_branch,
	});
	const branch_sha = response.data.object.sha;
	log.info("sha of head branch", branch_sha);
	log.info("Create new Branch");
	await octokit.git.createRef({
		// @ts-expect-error
		owner: config.repo_owner,
		// @ts-expect-error
		repo: config.repo_name,
		sha: branch_sha,
		ref: "refs/heads/" + config.pr_branch,
	});
	log.info("Branch created");
	return branch_sha;
}

async function create_new_tree(
	log: Logger,
	octokit: Octokit,
	config: Config,
	tree_recent_commit_sha: string,
	repo_dir: string,
	new_content: Map<string, string>
) {
	log.info("Create a new tree");
	const {
		data: { sha: new_tree_sha },
	} = await octokit.git.createTree({
		// @ts-expect-error
		repo: config.repo_name,
		// @ts-expect-error
		owner: config.repo_owner,
		base_tree: tree_recent_commit_sha,
		tree: getTreeBlobs(repo_dir, new_content),
	});
	log.info("Tree sha", new_tree_sha);
	return new_tree_sha;
}

async function update_branch(
	log: Logger,
	octokit: Octokit,
	config: Config,
	new_commit_sha: string
) {
	log.info("Map branch HEAD to new commit Hash");
	await octokit.git.updateRef({
		// @ts-expect-error
		owner: config.repo_owner,
		// @ts-expect-error
		repo: config.repo_name,
		ref: "heads/" + config.pr_branch,
		sha: new_commit_sha,
		force: true,
	});
	log.info("Branch has been updated");
}
