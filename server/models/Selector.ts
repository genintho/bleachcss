import * as db from "../db";
import type { Logger } from "../lib/Logger";
import type sqlite3 from "sqlite3";

export async function createOrUpdateSeen(
	file_pattern: string,
	selector: string
) {
	const db_connection = await db.connect();
	await db_connection.run(
		"INSERT INTO css_selector (name, created_at, seen_at) " +
			"VALUES (:name, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) " +
			"ON CONFLICT (name) DO UPDATE SET seen_at=CURRENT_TIMESTAMP WHERE name=:name;",
		{
			":name": selector,
		}
	);
	await insert_file_selector(db_connection, selector, file_pattern);
}

export async function createOrIgnore(file_pattern: string, selector: string) {
	const db_connection = await db.connect();
	await db_connection.run(
		"INSERT INTO css_selector (name, created_at, seen_at) " +
			"VALUES (:name, CURRENT_TIMESTAMP, NULL) " +
			"ON CONFLICT (name) DO NOTHING;",
		{
			":name": selector,
		}
	);
	await insert_file_selector(db_connection, selector, file_pattern);
}

async function insert_file_selector(
	db_connection: sqlite3.Database,
	selector: string,
	file_pattern: string
) {
	await db_connection.run(
		"INSERT OR IGNORE INTO file_selector (selector, file) " +
			"VALUES (:selector, :file) ;",
		{
			":selector": selector,
			":file": file_pattern,
		}
	);
}

export async function getFromFile(
	file_pattern: string
): Promise<{ selector: string; num_reference: number }[]> {
	const db_connection = await db.connect();
	// @ts-ignore
	return db_connection.all(
		"SELECT selector, count(selector) as num_reference " +
			"FROM file_selector " +
			"WHERE selector IN (" +
			"    SELECT selector " +
			"    FROM file_selector " +
			"    WHERE file=:pattern" +
			")" +
			"GROUP BY selector;",
		{ ":pattern": file_pattern }
	);
}

export async function removeAssociation(
	file_pattern: string,
	selector: string,
	should_remove_selector: boolean
) {
	const db_connection = await db.connect();
	await db_connection.run(
		"DELETE FROM file_selector WHERE file=:file AND selector=:selector",
		{ ":file": file_pattern, ":selector": selector }
	);
	if (should_remove_selector) {
		await db_connection.run("DELETE FROM css_selector WHERE name=:selector", {
			":selector": selector,
		});
	}
}

export async function get_unused(
	log: Logger,
	since: number
): Promise<string[]> {
	const db_connection = await db.connect();
	// @ts-ignore
	return (
		db_connection
			// @TODO use seen_at date
			.all(
				"SELECT name FROM css_selector WHERE (seen_at IS NOT NULL AND seen_at < date('now', '-" +
					Number(since) +
					" days') ) OR (seen_at IS NULL AND created_at) < date('now', '-" +
					Number(since) +
					" days');"
			)
			//@ts-ignore
			.then((res) => {
				//@ts-ignore
				return res.map((item) => {
					return item.name;
				});
			})
	);
}
