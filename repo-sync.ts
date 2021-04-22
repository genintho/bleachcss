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

(async () => {
	await main();
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

	const blobShas = await processFile(
		log,
		octokit,
		config,
		css_files,
		unused_selectors
	);

	if (blobShas.size === 0) {
		log.info("No blob got created, job is over");
		return;
	}

	const branchSha = await createOrGetBranchSha(log, octokit, config);
	//
	// 	logger.info('Get HEAD tree hash');
	// 	const baseTree = await gh.gitdata.getTree({owner, repo, sha: branchSha});
	//
	// 	logger.info('Create a new tree');
	// 	const newTree = await gh.gitdata.createTree({
	// 		repo: repo,
	// 		owner: owner,
	// 		base_tree: baseTree.data.sha,
	// 		tree: getTreeBlobs(blobShas, codeDirectory)
	// 	});
	//
	// 	logger.info('Commit changes');
	// 	const commitResponse = await gh.gitdata.createCommit({
	// 		owner,
	// 		repo,
	// 		message: 'BleachCSS -' + new Date().toISOString(),
	// 		tree: newTree.data.sha,
	// 		parents: [branchSha],
	// 		author: {
	// 			name: 'BleachCSS',
	// 			email: 'thomas@bleachcss.com',
	// 			date: new Date().toISOString()
	// 		}
	// 	});
	//
	// 	logger.info('Map branch HEAD to new commit Hash');
	// 	await gh.gitdata.updateReference({
	// 		owner,
	// 		repo,
	// 		ref: 'heads/' + BRANCH_NAME,
	// 		sha: commitResponse.data.sha
	// 	});
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

		for (let filePath of css_files) {
			const fileContent = fs.readFileSync(filePath, { encoding: "utf-8" });
			const pCss = await postcss([postcss_nested]).process(fileContent, {});

			if (!pCss.root) {
				throw new Error("PostCss parsing failed.");
			}
			postcss_file.set(filePath, pCss);
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

		const blobSha1: Map<string, string> = new Map();
		for (let file_path of Array.from(modified_files)) {
			const clean_css = await new Promise<string>((resolve, reject) => {
				let newCssStr = "";
				postcss.stringify(postcss_file.get(file_path).root, (result) => {
					newCssStr += result;
				});
				resolve(newCssStr);
			});
			const blobRes = await octokit.gitdata.createBlob({
				owner: config.repo_owner,
				repo: config.repo_name,
				encoding: "utf-8",
				content: clean_css,
			});
			// if (!_.has(blobRes, "data.sha")) {
			// 	throw new Error("No Sha in the blob");
			// }

			blobSha1.set(blobRes.data.sha, file_path);
		}
		return blobSha1;
	}
	//
	// function getTreeBlobs(blobShas: Map<string, string>, pathDir: string) {
	// 	const res: any = [];
	// 	blobShas.forEach((filePath, sha) => {
	// 		res.push({
	// 			path: normalizePath(filePath, pathDir),
	// 			type: 'blob',
	// 			sha,
	// 			mode: '100644'
	// 		});
	// 	});
	// 	return res;
	// }
	//
	//
	// async function getGithubInfos(appId: number): Promise<{owner: string, repo: string}> {
	// 	const app = await DB.getApp(appId);
	// 	if (!app.repo_name) {
	// 		throw new Error("No github infos");
	// 	}
	//
	// 	const split = app.repo_name.split('/');
	// 	if (split.length != 2) {
	// 		throw new Error("Invalid github infos");
	// 	}
	//
	// 	const owner = split[0];
	// 	if (owner.length === 0) {
	// 		throw new Error("Invalid repo owner");
	// 	}
	//
	// 	const repo = split[1];
	// 	if (repo.length === 0) {
	// 		throw new Error("Invalid repo");
	// 	}
	//
	// 	return {owner, repo};
	// }
}

// import * as _ from 'lodash';
// import * as Download from '../../lib/Download';
// import * as path from 'path';
// import * as fsp from '../../lib/fsp';

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
	// try {
	// 	log.info("Try to create branch");
	// 	const branch = await octokit.gitdata.getReference({
	// 		owner: config.repo_owner,
	// 		repo: config.repo_name,
	// 		ref: "heads/" + config.target_branch,
	// 	});
	// 	if (_.has(branch, "data.object.sha")) {
	// 		return branch.data.object.sha;
	// 	}
	// } catch (e) {
	// 	// Nothing to o
	// 	log.error(e);
	// }

	// Create a new Branch
	log.info("Get Reference to HEAD hash");
	const response = await octokit.gitdata.getReference({
		owner: config.repo_owner,
		repo: config.repo_name,
		ref: "heads/" + config.target_branch,
	});
	const branchSha = response.data.object.sha;

	// logger.info("Create new Reference");
	// await github.gitdata.createReference({
	// 	owner,
	// 	repo,
	// 	sha: branchSha,
	// 	ref: "refs/heads/" + branchName,
	// });
	return branchSha;
}
