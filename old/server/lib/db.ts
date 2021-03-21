import loggerFactory from "../lib/logger";
const logger = loggerFactory("db");

import * as fs from "fs";
// import * as mysql from "mysql";
import * as crypto from "crypto";
// import readPemFile from "./readPemFile";

const dbConnectionOptions = {
	multipleStatements: true,
	host: process.env["DATABASE_HOST"]
		? process.env["DATABASE_HOST"]
		: "127.0.0.1",
	user: process.env["DATABASE_USER"] ? process.env["DATABASE_USER"] : "root",
	password: process.env["DATABASE_PASSWORD"]
		? process.env["DATABASE_PASSWORD"]
		: "",
	database: process.env["DATABASE_NAME"]
		? process.env["DATABASE_NAME"]
		: "bleachRails_development",
	debug: false, //["ComQueryPacket", "RowDataPacket"], // false // /**/
};

// if (process.env["RACK_ENV"] === "production") {
//     dbConnectionOptions["ssl"] = {
//         ca: readPemFile(),
//     };
// }

const pool = "a"; //mysql.createPool(dbConnectionOptions);

// let MAXQUERY_SIZE = 50000;
//
// pool.query("SHOW VARIABLES LIKE 'max_allowed_packet'", function(err, results){
//     if (err) return;
//
//     console.log(results);
// });

export function init() {
	return new Promise<void>(async (resolve, reject) => {
		logger.info("Need to create the DB structure");
		logger.info("APPLICATIONS");
		try {
			await _dbRun(fs.readFileSync("/app/sql/main.sql", "utf-8"));
		} catch (e) {
			logger.info("Error when rebuilding table structure");
		}
		// logger.info("CSS_FILES");
		// await _dbRun(fs.readFileSync("sql/main_css_files.sql", "utf-8"));
		// await _dbRun(
		//     fs.readFileSync("sql/main_css_file_variations.sql", "utf-8")
		// );
		// await _dbRun(fs.readFileSync("sql/main_css_selectors.sql", "utf-8"));
		// await _dbRun(
		//     fs.readFileSync("sql/main_css_file_variations.sql", "utf-8")
		// );
		// await _dbRun(
		//     fs.readFileSync("sql/main_selector_file_mappings.sql", "utf-8")
		// );

		resolve();
	});
}

function _dbRun(query: string): Promise<void> {
	return new Promise<void>((resolve, reject) => {
		pool.query(query, (err, results) => {
			if (err) {
				reject(err);
				return;
			}
			resolve();
		});
	});
}

export function getApp(applicationID: number): Promise<Application> {
	return new Promise<Application>((resolve, reject) => {
		pool.query(
			"SELECT * FROM applications where id=?",
			applicationID,
			function (error, results, fields) {
				if (error) {
					reject(error);
					return;
				}

				resolve(results[0]);
				return;
			}
		);
	});
}

export function getAppIdByKey(key: string): Promise<number> {
	return new Promise<number>((resolve, reject) => {
		resolve(1);
		// pool.query(
		//     "SELECT id FROM applications where client_key=?",
		//     key,
		//     (error, results, fields) => {
		//         if (error) {
		//             reject(error);
		//             return;
		//         }

		//         resolve(results[0].id);
		//         return;
		//     }
		// );
	});
}

export function getCSSFilesVariationsByUrls(
	applicationID: number,
	urls: string[]
): Promise<CSSFileVariation[]> {
	return new Promise<CSSFileVariation[]>((resolve, reject) => {
		pool.query(
			"SELECT id, application_id, css_file_id, url, fetch_status FROM css_file_variations WHERE url in (?) AND application_id=? AND fetch_status != 'ERROR'",
			[urls, applicationID],
			function (error, results, fields) {
				if (error) {
					reject(error);
					return;
				}
				resolve(results);
				return;
			}
		);
	});
}

export function getCSSFileVariationByID(id: number): Promise<CSSFileVariation> {
	return new Promise<CSSFileVariation>((resolve, reject) => {
		pool.query(
			"SELECT id, application_id, css_file_id, url, fetch_status FROM css_file_variations WHERE id=?",
			[id],
			function (error, results, fields) {
				if (error) {
					reject(error);
					return;
				}
				resolve(results[0]);
				return;
			}
		);
	});
}

export function insertCssFileVariation(
	applicationID: number,
	cssFileID: number,
	url: string
): Promise<CSSFileVariation> {
	return new Promise<CSSFileVariation>((resolve, reject) => {
		pool.query(
			"INSERT INTO css_file_variations(application_id, css_file_id, url, fetch_status, created_at, updated_at) VALUE (?, ?, ?, 'QUEUED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
			[applicationID, cssFileID, url],
			function (error, results, fields) {
				if (error) {
					reject(error);
					return;
				}

				resolve({
					id: results.insertId,
					application_id: applicationID,
					css_file_id: cssFileID,
					url: url,
				});
				return;
			}
		);
	});
}

export function updateCssVariationStatus(
	id: number,
	newStatus: string
): Promise<void> {
	logger.info("updateCssVariationStatus", { id, newStatus });
	return new Promise<void>((resolve, reject) => {
		pool.query(
			"UPDATE css_file_variations SET fetch_status=? WHERE id=?",
			[newStatus, id],
			(error) => {
				if (error) {
					reject(error);
					return;
				}
				resolve();
				return;
			}
		);
	});
}

function _generateInsertQuery(
	safeAppID: number,
	selectors: string[],
	shouldUpdateSeen: boolean
) {
	let sql = "INSERT ";
	sql += shouldUpdateSeen ? "" : "IGNORE ";

	sql +=
		"INTO css_selectors(" +
		"application_id, " +
		"md5, " +
		"selector," +
		"created_at, " +
		"updated_at";
	if (shouldUpdateSeen) {
		sql += ", seen_at";
	}
	sql += ") VALUES";
	sql += selectors.map((selector) => {
		let value =
			"(" +
			safeAppID +
			", " +
			"0x" +
			crypto.createHash("md5").update(selector).digest("hex") +
			", " +
			pool.escape(selector) +
			", " +
			"CURRENT_TIMESTAMP, " +
			"CURRENT_TIMESTAMP";
		if (shouldUpdateSeen) {
			value += ", CURRENT_TIMESTAMP";
		}
		value += ")";
		return value;
	});
	if (shouldUpdateSeen) {
		sql += " ON DUPLICATE KEY UPDATE seen_at=CURRENT_TIMESTAMP";
	}
	return sql;
}

export function insertNewSelectors(
	appId: number,
	cssFileID,
	selectors: string[],
	shouldUpdateSeen = false
): Promise<number> {
	return new Promise<number>((resolve, reject) => {
		pool.getConnection(function (err, connection) {
			connection.beginTransaction((err) => {
				if (err) {
					return reject(err);
				}

				const safeAppID = pool.escape(appId);
				const sql = _generateInsertQuery(
					safeAppID,
					selectors,
					shouldUpdateSeen
				);
				// sql = sql.substring(0, sql.length-1);
				pool.query(sql, async (err, results) => {
					if (err) {
						reject(err);
						return;
					}
					if (results.affectedRows !== selectors.length) {
						reject();
					}
					const lastInsertID = results.insertId;

					if (!lastInsertID) {
						console.error("No insert id");
						reject();
					}

					const newIDRange: number[] = [];
					for (let i = 0; i < selectors.length; i++) {
						newIDRange.push(lastInsertID + i);
					}

					// Insert in the join table
					await insertNewSelectorMapping(appId, cssFileID, newIDRange);
					connection.commit(function (err) {
						if (err) {
							return connection.rollback(function () {
								throw err;
							});
						}
						connection.release();
						resolve(results.insertId);
					});
				});
			});
		});
	});
}

export function deleteSelector(selectorId: number): Promise<void> {
	return new Promise<void>((resolve, reject) => {
		const sql = "DELETE FROM css_selectors WHERE id=? LIMIT 1;";
		pool.query(sql, [selectorId], (err, results) => {
			if (err) {
				reject();
				return;
			}
			resolve();
		});
	});
}

export function insertNewSelectorMapping(
	applicationID: number,
	cssFileID,
	selectorIDs: number[]
): Promise<number> {
	return new Promise<number>((resolve, reject) => {
		const safeAppID = pool.escape(applicationID);
		const safeCSSFileID = pool.escape(cssFileID);

		let sql =
			"INSERT IGNORE INTO selector_file_mappings(application_id, css_file_id, css_selector_id) VALUES";
		sql += selectorIDs.map((selectorID) => {
			return (
				"(" +
				safeAppID +
				", " +
				safeCSSFileID +
				"," +
				pool.escape(selectorID) +
				")"
			);
		});
		// sql = sql.substring(0, sql.length-1);
		pool.query(sql, (err, results) => {
			if (err) {
				reject();
				return;
			}
			if (results.affectedRows !== selectorIDs.length) {
				console.error("Weird number of selector inserted does not match");
				reject();
			}
			resolve(results.insertId);
		});
	});
}

export function deleteSelectorMapping(
	cssFileId: number,
	selectorId: number
): Promise<void> {
	return new Promise<void>((resolve, reject) => {
		const sql =
			"DELETE FROM selector_file_mappings WHERE css_file_id=? AND css_selector_id=? LIMIT 1";
		pool.query(sql, [cssFileId, selectorId], (err, results) => {
			if (err) {
				reject();
				return;
			}
			resolve();
		});
	});
}

export function insertCssFileDefinition(
	appId: number,
	name: string,
	pattern: string
): Promise<CSSFileDefinition> {
	return new Promise<CSSFileDefinition>((resolve, reject) => {
		pool.query(
			"INSERT INTO css_files(application_id, name, pattern, created_at, updated_at) VALUE (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
			[appId, name, pattern],
			function (error, results, fields) {
				if (error) {
					reject(error);
					return;
				}

				resolve({
					id: results.insertId,
					name,
					pattern,
				});
				return;
			}
		);
	});
}

export function updateSelectorSeen(
	applicationID: number,
	selectorIDs: number[]
): Promise<void> {
	return new Promise<void>((resolve, reject) => {
		pool.query(
			"UPDATE css_selectors SET seen_at=CURRENT_TIMESTAMP, updated_at=CURRENT_TIMESTAMP WHERE application_id = ? AND id in(?)",
			[applicationID, selectorIDs],
			(err, results) => {
				if (err) {
					reject();
					return;
				}
				if (results.affectedRows !== selectorIDs.length) {
					console.error("Weird number of selector inserted does not match");
					reject();
				}
				resolve(results.affectedRows);
			}
		);
	});
}

export function getSelectorByName(
	applicationID: number,
	cssFileID: number,
	selectors: string[]
): Promise<CSSSelector[]> {
	console.log(selectors);
	const hashedSelectors = selectors.map((selector) => {
		return (
			"UNHEX(" + crypto.createHash("md5").update(selector).digest("hex") + ")"
		);
		// return "0x" + crypto.createHash("md5").update(selector).digest("hex");
	});
	return new Promise<CSSSelector[]>((resolve, reject) => {
		if (selectors.length === 0) {
			return resolve([]);
		}

		let sql =
			"SELECT " +
			"CS.id, " +
			"CS.selector, " +
			"CS.updated_at, " +
			"CFCS.application_id " +
			"FROM `css_selectors` as CS " +
			"LEFT JOIN selector_file_mappings as CFCS ON CS.id = CFCS.css_selector_id AND CFCS.css_file_id=? " +
			"WHERE " +
			"CS.application_id=? AND " +
			"CS.md5 IN(" +
			selectors.map((selector) => {
				return (
					'UNHEX("' +
					crypto.createHash("md5").update(selector).digest("hex") +
					'")'
				);
			}) +
			")";

		pool.query(
			sql,
			[cssFileID, applicationID, hashedSelectors],
			function (error, results, fields) {
				if (error) {
					// reject(error);
					logger.error("Error in Query, return empty results", error);
					reject([]);
					return;
				}
				resolve(results);
				return;
			}
		);
	});
}

export function getAppFiles(
	applicationID: number
): Promise<CSSFileDefinition[]> {
	return new Promise<CSSFileDefinition[]>((resolve, reject) => {
		pool.query(
			"SELECT id, name, pattern FROM css_files where application_id=?",
			applicationID,
			function (error, results, fields) {
				if (error) {
					reject(error);
					return;
				}
				resolve(results);
				return;
			}
		);
	});
}

/**
 * Return the selector + the id of the CSS FILE other than the one passed. this helps know that the selector is also
 * present in other files
 *
 * @param {number} appId
 * @param {number} cssFileId
 * @returns {Promise<CSSSelector[]>}
 */
export function getAllSelectorsWithFilter(
	appId: number,
	cssFileId: number
): Promise<CSSSelector[]> {
	return new Promise<CSSSelector[]>((resolve, reject) => {
		let sql =
			"SELECT " +
			"CS.id AS id, " +
			"CS.selector AS selector, " +
			'if(CFCS.css_file_id IS NULL, "no", "has") as mapping_state ' +
			"FROM `css_selectors` as CS " +
			"LEFT JOIN selector_file_mappings as CFCS ON CS.id = CFCS.css_selector_id AND CFCS.css_file_id!=? " +
			"WHERE " +
			"CS.application_id=?;";

		pool.query(sql, [cssFileId, appId], function (error, results, fields) {
			if (error) {
				reject(error);
				return;
			}
			resolve(results);
			return;
		});
	});
}

/**
 * Return the selectors that have not been seen since 30 days.
 *
 * @param {number} appId
 * @returns {Promise<Set<string>>}
 */
export function getAllUnusedSelectors(appId: number): Promise<Set<string>> {
	return new Promise<Set<string>>((resolve, reject) => {
		pool.query(
			"SELECT selector FROM css_selectors WHERE application_id = ? AND (seen_at IS NULL OR seen_at < (NOW() - INTERVAL 30 DAY))",
			appId,
			(error, results, fields) => {
				if (error) {
					reject(error);
					return;
				}
				const s = new Set();
				results.forEach((item) => {
					s.add(item.selector);
				});
				resolve(s);
				return;
			}
		);
	});
}
