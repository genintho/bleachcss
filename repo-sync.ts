import * as fs from "fs";
import * as path from "path";
import * as Selector from "./server/models/Selector";
import { Octokit } from "@octokit/rest";
import * as Download from "./server/lib/download.utils";

// ({

import { Config, get_config } from "./server/lib/Config";
import { Logger } from "./server/lib/Logger";

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
	if (config.push_to_github === false) {
		log.info("Sync with Github is disable.");
		process.exit(0);
	}

	const octokit = new Octokit({
		log,
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

	await downloadArchive(log, octokit, config);
	//
	// /**
	//  * This job will create or update a PR in the application repository.
	//  * The PR will remove the CSS selector that we considered as unseen
	//  */
	// import * as _ from 'lodash';
	// import * as DB from '../../lib/db';
	// import * as postcss from 'postcss';
	// import * as fsp from '../../lib/fsp';
	// import * as PostCssWrap from '../../lib/tools/PostCssWrap';
	//
	// const GitHubApi = require('github');
	// const postCssNested = require('postcss-nested');
	//
	// import createOrGetBranchSha from './createOrGetBranchSha';
	// import downloadArchive from './downloadArchive';
	// import normalizePath from './normalizePath';
	//
	// const BRANCH_NAME = 'bleachcss';
	//
	// export default async function main(logger, appId: number, githubToken: string, notifyJobComplete) {
	// 	// @TODO Get all data from an application row
	// 	const {owner, repo} = await getGithubInfos(appId);
	// 	const gh = createGH(githubToken);
	//
	// 	// Fetch Archive url
	// 	const defaultBranch = await getDefaultBranch(gh, owner, repo);
	// 	logger.info('Repo default branch', defaultBranch);
	//
	// 	const codeDirectory = await downloadArchive(gh, owner, repo, defaultBranch);
	// 	logger.info('Archive Directory', codeDirectory);
	//
	// 	const cssFiles = await fsp.findInPath(codeDirectory);
	// 	logger.info('Found CSS files', cssFiles);
	//
	// 	const unusedSelectors = await DB.getAllUnusedSelectors(appId);
	// 	const blobShas = await processFile(logger, gh, owner, repo, cssFiles, unusedSelectors);
	//
	// 	if (blobShas.size === 0) {
	// 		logger.info('No blob got created, job is over');
	// 		notifyJobComplete();
	// 		return;
	// 	}
	//
	// 	const branchSha = await createOrGetBranchSha(logger, gh, owner, repo, defaultBranch, BRANCH_NAME);
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
	// function createGH(githubToken: string) {
	// 	// const auth_token = 'c9022d8fbdeaded0ecf38f90a717bcd6958ab9df';
	// 	const github = new GitHubApi({
	// 		// optional
	// 		debug: false,
	// 		protocol: "https",
	// 		// host: "github.my-GHE-enabled-company.com", // should be api.github.com for GitHub
	// 		// pathPrefix: "/api/v3", // for some GHEs; none for GitHub
	// 		headers: {
	// 			"user-agent": "BleachCSS-Dev" // GitHub is happy with a unique user agent
	// 		},
	// 		Promise: Promise,
	// 		followRedirects: false, // default: true; there's currently an issue with non-get redirects, so allow ability to disable follow-redirects
	// 		timeout: 5000
	// 	});
	// 	github.authenticate({
	// 		type: "oauth",
	// 		token: githubToken
	// 	});
	// 	return github;
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
	// async function processFile(logger, github, owner: string, repo: string, cssFiles: string[], unusedSelectors: Set<string>): Promise<Map<string, string>> {
	// 	const blobShas = new Map();
	//
	// 	for(let filePath of cssFiles) {
	// 		const fileContent = await fsp.read(filePath);
	// 		const pCss = await postcss([postCssNested]).process(fileContent, {});
	//
	// 		if (!pCss.root) {
	// 			throw new Error('PostCss parsing failed.');
	// 		}
	//
	// 		let fileNeedToBeModified = false;
	// 		pCss.root.walkRules((rule) => {
	// 			// FIXME handle rule.selectors => remove it then remove rule if rule.nodes.length == 0
	// 			if (unusedSelectors.has(rule.selector)) {
	// 				logger.info('file %s unused selector "%s"', filePath, rule.selector);
	// 				rule.remove();
	// 				fileNeedToBeModified = true;
	// 			}
	// 		});
	//
	// 		if (!fileNeedToBeModified) {
	// 			continue;
	// 		}
	// 		const cleanCss = await PostCssWrap.stringify(pCss);
	// 		// await fsp.write(filePath, cleanCss);
	// 		logger.info('Create a file blob for ', filePath);
	// 		const blobRes = await github.gitdata.createBlob({
	// 			owner: owner,
	// 			repo: repo,
	// 			encoding: 'utf-8',
	// 			content: cleanCss
	// 		});
	// 		if (!_.has(blobRes, 'data.sha')) {
	// 			throw new Error("No Sha in the blob");
	// 		}
	//
	// 		blobShas.set(blobRes.data.sha, filePath);
	// 	}
	// 	return blobShas;
	// }
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
	const dir = path.resolve(__dirname, "repo");
	const archiveTar = path.join(dir, "archive.tar.gz"); // @TODO random file name
	const archive_url = await getArchiveURL(log, octokit, config);
	log.info(archive_url);
	if (archive_url === undefined) {
		log.error("Archive URL was not found");
		process.exit(1);
	}
	await Download.toFile(archive_url, archiveTar);
	// await Download.toFile(archiveUrl, archiveTar);
	// await fsp.untar(archiveTar, tmpDir);
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
