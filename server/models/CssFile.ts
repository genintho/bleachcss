import * as db from "../db";

export async function create(name: string) {
	const db_connection = await db.connect();
	console.log("css file create", name);
	await db_connection.run(
		"INSERT INTO css_files (name) VALUES (:name) ON CONFLICT  DO NOTHING ;",
		{
			":name": name,
		}
	);
}
