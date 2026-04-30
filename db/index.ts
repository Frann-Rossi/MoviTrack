import { drizzle as drizzlePglite } from 'drizzle-orm/pglite';
import { drizzle as drizzleNeon } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { PGlite } from '@electric-sql/pglite';
import * as schema from './schema';

const databaseUrl = process.env.DATABASE_URL || import.meta.env?.DATABASE_URL;

export const db = (() => {
  if (databaseUrl) {
    const client = neon(databaseUrl);
    return drizzleNeon(client, { schema });
  }

  const globalForDb = globalThis as unknown as {
    client: PGlite | undefined;
  };

  const client = globalForDb.client ?? new PGlite('./local-db');
  if (process.env.NODE_ENV !== 'production') globalForDb.client = client;

  return drizzlePglite(client, { schema });
})();
