import { instrumentDrizzleClient } from "@kubiks/otel-drizzle";
import { sql } from "drizzle-orm";
import type { AnyMySqlColumn } from "drizzle-orm/mysql-core";
import { drizzle } from "drizzle-orm/mysql2";

function createDrizzle() {
	const url = process.env.DATABASE_URL;
	if (!url) throw new Error("DATABASE_URL not found");

	if (!url.startsWith("mysql://"))
		throw new Error("DATABASE_URL is not a MySQL URL");

    // Debug logging to verify SSL param removal
    const urlParts = new URL(url);
    console.log(`[DB_DEBUG] Connecting to host: ${urlParts.hostname}, path: ${urlParts.pathname}, search: ${urlParts.search}`);

	return drizzle(url);
}

let _cached: ReturnType<typeof createDrizzle> | undefined;

export const db = () => {
	if (!_cached) {
		_cached = createDrizzle();


		// instrumentDrizzleClient(_cached);
	}
	return _cached;
};

// Use the incoming value if one exists, else fallback to the DBs existing value.
export const updateIfDefined = <T>(v: T | undefined, col: AnyMySqlColumn) =>
	sql`COALESCE(${v === undefined ? sql`NULL` : v}, ${col})`;
