import * as db from "../db";
import { Logger } from "../lib/Logger";

export async function create(log: Logger, name: string) {
	const db_connection = await db.connect();
	log.debug("css file create", name);
	await db_connection.run(
		"INSERT INTO css_file (name, created_at, seen_at) " +
			"VALUES (:name, :created_at, :seen_at) " +
			"ON CONFLICT (name) DO UPDATE SET seen_at=:seen_at WHERE name=:name;",
		{
			":name": name,
			":created_at": new Date(),
			":seen_at": new Date(),
		}
	);
}

export async function record_history(
	log: Logger,
	pattern: string,
	url: string
): Promise<boolean> {
	return new Promise(async (resolve, reject) => {
		const db_connection = await db.connect();
		try {
			await db_connection.run(
				"INSERT INTO css_file_history(pattern, url, created_at) VALUES (:pattern, :url, :created_at);",
				{ ":pattern": pattern, ":url": url, ":created_at": new Date() }
			);
			resolve(true);
			return;
		} catch (e) {
			if (e.code === "SQLITE_CONSTRAINT") {
				resolve(false);
				return;
			}
			log.error("Can not record history", e);
			reject(false);
		}
		resolve(false);
	});
}
