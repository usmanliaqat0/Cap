import path from "node:path";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { DrizzleQueryError } from "drizzle-orm";
import { migrate } from "drizzle-orm/mysql2/migrator";

import { runOrgIdBackfill } from "./migrations/orgid_backfill.ts";

async function runMigrate() {
	console.log("💿 initializing migration connection...");
	const connection = await mysql.createConnection(process.env.DATABASE_URL!);
	const migrationDb = drizzle(connection);

	console.log("💿 running migrations...");
	await migrate(migrationDb, {
		migrationsFolder: path.join(process.cwd(), "/migrations"),
	});
	
	console.log("💿 closing migration connection...");
	await connection.end();
}

function errorIsOrgIdMigration(e: unknown): e is DrizzleQueryError {
	return (
		e instanceof DrizzleQueryError &&
		e.query ===
			"ALTER TABLE `videos` MODIFY COLUMN `orgId` varchar(15) NOT NULL;"
	);
}

export async function migrateDb() {
	runMigrate()
		.catch(async (e) => {
			if (errorIsOrgIdMigration(e)) {
				console.log("non-null videos.orgId migration failed, running backfill");

				await runOrgIdBackfill();
				await runMigrate();
			} else throw e;
		})
		.catch((e) => {
			if (errorIsOrgIdMigration(e))
				throw new Error(
					"videos.orgId backfill failed, you will need to manually update the videos.orgId column before attempting to migrate again.",
				);
		});
}
