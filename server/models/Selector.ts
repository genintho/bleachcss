import * as db from "../db";

export async function create(
	file_pattern: string,
	selector: string,
	is_seen: boolean
) {
	const db_connection = await db.connect();
	// console.log("selector create", name);
	await db_connection.run(
		"INSERT INTO css_selector (name, created_at, seen_at) " +
			"VALUES (:name, :created_at, :seen_at) " +
			"ON CONFLICT (name) DO UPDATE SET seen_at=:seen_at WHERE name=:name;",
		{
			":name": selector,
			":created_at": new Date(),
			":seen_at": is_seen ? new Date() : null,
		}
	);

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
