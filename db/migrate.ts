import { migrate as migratePglite } from 'drizzle-orm/pglite/migrator';
import { migrate as migrateNeon } from 'drizzle-orm/neon-http/migrator';
import { db } from './index';

async function main() {
  console.log('Running migrations...');
  
  if (process.env.DATABASE_URL) {
    // @ts-ignore
    await migrateNeon(db, { migrationsFolder: './drizzle' });
  } else {
    // @ts-ignore
    await migratePglite(db, { migrationsFolder: './drizzle' });
  }
  
  console.log('Migrations complete!');
  process.exit(0);
}

main().catch((e) => {
  console.error('Migration failed');
  console.error(e);
  process.exit(1);
});
