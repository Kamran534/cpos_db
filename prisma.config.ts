import "dotenv/config";
import { defineConfig, env } from "prisma/config";

// Detect which schema is being used from command line args or environment
// When using --schema flag, Prisma reads datasource from that schema file
// This config's datasource is only used as fallback when no --schema is provided
const args = process.argv.slice(2);
const schemaArgIndex = args.indexOf("--schema");
const schemaFromArg = schemaArgIndex >= 0 && args[schemaArgIndex + 1] 
  ? args[schemaArgIndex + 1] 
  : null;

// Determine schema path and datasource
let schemaPath: string;
let datasourceUrl: string;

if (schemaFromArg) {
  // Using --schema flag, detect from the schema file path
  if (schemaFromArg.includes("sqlite")) {
    schemaPath = schemaFromArg;
    datasourceUrl = env("DATABASE_URL");
  } else {
    schemaPath = schemaFromArg;
    datasourceUrl = env("POSTGRES_URL_REMOTE");
  }
} else {
  // No --schema flag, use environment to determine
  const useSqlite = process.env.DB_PROVIDER === 'sqlite' || !process.env.POSTGRES_URL_REMOTE;
  schemaPath = useSqlite ? "prisma/schema.sqlite.prisma" : "prisma/schema.prisma";
  datasourceUrl = useSqlite ? env("DATABASE_URL") : env("POSTGRES_URL_REMOTE");
}

export default defineConfig({
  schema: schemaPath,
  migrations: {
    path: "prisma/migrations",
  },
  engine: "classic",
  datasource: {
    url: datasourceUrl,
  },
});
