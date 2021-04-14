import * as db from "../db";

export async function create(name: string) {
	const db_connection = await db.connect();
	console.log("css file create", name);
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
	pattern: string,
	url: string
): Promise<boolean> {
	return new Promise(async (resolve, reject) => {
		const db_connection = await db.connect();
		try {
			console.log("Record history");
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
			console.error("Can not record history", e);
			reject(false);
		}
		resolve(false);
	});
}
