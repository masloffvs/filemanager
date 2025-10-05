import { Database } from "bun:sqlite";
import { logger } from "../logger";

interface Value {
  type: "TEXT" | "INTEGER" | "REAL" | "BLOB" | "NUMERIC" | "NULL";
  notNull?: boolean;
  primaryKey?: boolean;
  unique?: boolean;
  default?: string | number | null;
}

export function createSchema(schema: { [key: string]: Value }): string {
  return Object.entries(schema)
    .map(
      ([
        column,
        { type, notNull, primaryKey, unique, default: defaultValue },
      ]) => {
        const constraints = [];
        if (notNull) constraints.push("NOT NULL");
        if (primaryKey) constraints.push("PRIMARY KEY");
        if (unique) constraints.push("UNIQUE");
        if (defaultValue !== undefined)
          constraints.push(`DEFAULT ${defaultValue}`);

        return `${column} ${type} ${constraints.join(" ")}`;
      }
    )
    .join(", ");
}

export function bootstrapDatabase(
  db: Database,
  tableName: string,
  schema: string
) {
  const query = db.query(`
    CREATE TABLE IF NOT EXISTS ${tableName} (${schema});
    CREATE INDEX IF NOT EXISTS idx_${tableName}_entryId ON ${tableName} (entryId);
  `);

  query.run();
  logger.info(`Database table ${tableName} is ready.`);
}
