import { Pool } from 'pg';
import dotenv from 'dotenv';

// Support local development when running outside framework-managed env loading.
dotenv.config({ path: '.env' });
dotenv.config();

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set. Add it to .env');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

export default pool;
