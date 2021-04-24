import { exec } from "child_process";
import extract_zip from "extract-zip";
import * as fs from "fs";
import * as path from "path";
import * as Selector from "./server/models/Selector";
import { Octokit } from "@octokit/rest";
import * as Download from "./server/lib/download.utils";

import { Config, get_config } from "./server/lib/Config";
import { Logger } from "./server/lib/Logger";
import postcss from "postcss";
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

	const css_files = await find_in_path(repo_dir);

	const new_content = await processFile(
		log,
		octokit,
		config,
		css_files,
		unused_selectors
	);

	if (new_content.size === 0) {
		log.info("Nothing changed, script is over");
		return;
	}
	// const diff: Record<string, string> = {};
	// new_content.forEach((content, path) => {
	// 	diff[normalizePath(repo_dir, path)] = content;
	// });
	// octokit
	// 	.createPullRequest({
	// 		// @ts-expect-error
	// 		owner: config.repo_owner,
	// 		// @ts-expect-error
	// 		repo: config.repo_name,
	// 		title: "pull request title",
	// 		body: "pull request description",
	// 		// base: "main" /* optional: defaults to default branch */,
	// 		head: config.pr_branch + new Date().getTime(),
	// 		changes: [
	// 			{
	// 				/* optional: if `files` is not passed, an empty commit is created instead */
	// 				files: diff,
	// 				commit:
	// 					"creating file1.txt, file2.png, deleting file3.txt, updating file4.txt (if it exists)",
	// 			},
	// 		],
	// 	})
	// 	.then((pr) => console.log(pr?.data.number));
	// const latestCommit = await octokit.repos.getCommit({
	// 	// @ts-expect-error
	// 	repo: config.repo_name,
	// 	// @ts-expect-error
	// 	owner: config.repo_owner,
	// 	sha: config.target_branch,
	// 	per_page: 1,
	// });
	// debugger;
	const branchSha = await createOrGetBranchSha(log, octokit, config);
	const most_recent_commit_sha = await octokit.git.getCommit({
		// @ts-expect-error
		repo: config.repo_name,
		// @ts-expect-error
		owner: config.repo_owner,
		commit_sha: branchSha,
	});

	log.info("Create a new tree");
	const new_tree = await octokit.git.createTree({
		// @ts-expect-error
		repo: config.repo_name,
		// @ts-expect-error
		owner: config.repo_owner,
		base_tree: most_recent_commit_sha.data.tree.sha,
		tree: getTreeBlobs(repo_dir, new_content),
	});
	// console.log(newTree);
	await sleep(5000);
	log.info("Commit changes");
	const commitResponse = await octokit.git.createCommit({
		// @ts-expect-error
		owner: config.repo_owner,
		// @ts-expect-error
		repo: config.repo_name,
		message: "BleachCSS -" + new Date().toISOString(),
		tree: new_tree.data.sha,
		parents: [branchSha],
		author: {
			name: "BleachCSS",
			email: "thomas@bleachcss.com",
			date: new Date().toISOString(),
		},
	});
	//
	log.info("Map branch HEAD to new commit Hash");
	await octokit.git.updateRef({
		// @ts-expect-error
		owner: config.repo_owner,
		// @ts-expect-error
		repo: config.repo_name,
		ref: "heads/" + config.pr_branch,
		sha: commitResponse.data.sha,
		force: true,
	});

	// /. ============

	//
	// 	try {
	// 		logger.info('Try to create Pull request');
	// 		await gh.pullRequests.create({
	// 			owner,
	// 			repo,
	// 			title: '[BleachCss] - Remove unused CSS selectors',
	// 			head: BRANCH_NAME,
	// 			base: defaultBranch,
	// 			body: '#Hello'
	// 		});
	// 	} catch (e) {
	// 		// TODO handle case where the PR already exists.
	// 		// -> Adding a comment to mention it got updated?
	// 		logger.error(e);
	// 	}
	//
	// 	// Cleanup
	// 	try {
	// 		logger.info('Clean up directories');
	// 		fsp.rmDir(codeDirectory);
	// 	} catch(e) {
	// 		logger.error(e);
	// 	}
	// 	logger.info('Done');
	// 	notifyJobComplete();
	// }
	//
	// async function getDefaultBranch(github: any, owner: string, repo: string) {
	// 	const response = await github.repos.get({owner, repo});
	// 	if (_.has(response, 'data.default_branch')) {
	// 		return response.data.default_branch;
	// 	}
	// 	throw new Error("Can not finddefault branch");
	// }
	//

	if (fs.existsSync(repo_dir)) {
		fs.rmSync(repo_dir, { recursive: true });
	}
}

async function processFile(
	log: Logger,
	octokit: Octokit,
	config: Config,
	css_files: string[],
	unused_selectors: string[]
): Promise<Map<string, string>> {
	const postcss_file = new Map();

	const selectors_removed = [];
	const modified_files: Set<string> = new Set();

	for (let file_path of css_files) {
		log.debug("Process CSS file", file_path);
		const fileContent = fs.readFileSync(file_path, { encoding: "utf-8" });
		const pCss = await postcss([postcss_nested]).process(fileContent, {
			from: undefined,
			parser: postcss_scss,
		});

		if (!pCss.root) {
			throw new Error("PostCss parsing failed.");
		}
		postcss_file.set(file_path, pCss);
	}

	unused_selectors.forEach((selector) => {
		if (selectors_removed.length >= config.max_num_selector) {
			return;
		}
		postcss_file.forEach((pcss, file) => {
			pcss.root.walkRules((rule: any) => {
				// FIXME handle rule.selectors => remove it then remove rule if rule.nodes.length == 0
				if (rule.selector === selector) {
					log.info('file %s unused selector "%s"', file, rule.selector);
					rule.remove();
					modified_files.add(file);
				}
			});
		});
	});

	const new_content: Map<string, string> = new Map();
	for (let file_path of Array.from(modified_files)) {
		log.debug("Regenerate file", file_path);
		const clean_css = await new Promise<string>((resolve, reject) => {
			let newCssStr = "";
			postcss.stringify(postcss_file.get(file_path).root, (result) => {
				newCssStr += result;
			});
			resolve(newCssStr);
		});

		new_content.set(file_path, clean_css);
	}
	return new_content;
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
	// b [ 'genintho-test-b6b72f9', 'css', 'test.css' ]
	b.shift();
	b.shift();

	// b2 [ 'css', 'test.css' ]
	const c = b.join("/");
	// c css/test.css
	return c;
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

export function find_in_path(path_input: string): Promise<string[]> {
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
	log.info("Branch does not exists, createa new one");
	log.info("Get Reference to HEAD hash");
	const response = await octokit.git.getRef({
		// @ts-expect-error
		owner: config.repo_owner,
		// @ts-expect-error
		repo: config.repo_name,
		ref: "heads/" + config.target_branch,
	});
	const branch_sha = response.data.object.sha;
	log.info("Sha of head branch", branch_sha);
	log.info("Create new Reference");
	await octokit.git.createRef({
		// @ts-expect-error
		owner: config.repo_owner,
		// @ts-expect-error
		repo: config.repo_name,
		sha: branch_sha,
		ref: "refs/heads/" + config.pr_branch,
	});
	return branch_sha;
}
function sleep(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}
