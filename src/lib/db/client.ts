import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { getRequiredEnv } from "@/lib/env";
import * as schema from "@/lib/db/schema";

export function getDb() {
  const client = neon(getRequiredEnv("DATABASE_URL"));

  return drizzle({
    client,
    schema,
  });
}
