import * as db from "../db";

export async function create(name: string) {
	const db_connection = await db.connect();
	console.log("selector create", name);
	await db_connection.run(
		"INSERT INTO css_selector (name, created_at, seen_at) " +
			"VALUES (:name, :created_at, :seen_at) " +
			"ON CONFLICT (name) DO UPDATE SET seen_at=:seen_at WHERE name=:name;",
		{
			":name": name,
			":created_at": new Date(),
			":seen_at": new Date(),
		}
	);
}
