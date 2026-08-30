import { neon } from '@neondatabase/serverless';

const connectionString = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_G0YbKCch1JlQ@ep-little-dream-a5dfnw2y-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require';

export const sql = neon(connectionString);

