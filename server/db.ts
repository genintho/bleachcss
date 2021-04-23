import sqlite3 from "sqlite3";
import { open } from "sqlite";
import * as path from "path";

// sqlite3.verbose();

// const ss = new Set();
export async function connect(): Promise<sqlite3.Database> {
	const cache = ((await open({
		filename: path.resolve(__dirname, "./database.sqlite"),
		driver: sqlite3.cached.Database,
	})) as unknown) as sqlite3.Database;
	// cache.on("trace", (data) => {
	// 	if (ss.has(data)) {
	// 		return;
	// 	}
	// 	console.log(data);
	// 	ss.add(data);
	// });
	return cache;
}

export async function run_migrations() {
	const db_connect = await connect();
	// @ts-ignore
	await db_connect.migrate({
		/**
		 * If true, will force the migration API to rollback and re-apply the latest migration over
		 * again each time when Node.js app launches.
		 */
		// force?: boolean
		/**
		 * Migrations table name. Default is 'migrations'
		 */
		// table?: string
		/**
		 * Path to the migrations folder. Default is `path.join(process.cwd(), 'migrations')`
		 */
		migrationsPath: path.resolve(__dirname, "migrations"),
	});
}
