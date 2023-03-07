import pgInit from 'pg-promise';

const pgp = pgInit();
export const db = pgp(process.env.REPLICHAT_DB_CONNECTION_STRING);

const {isolationLevel} = pgp.txMode;

// Helper to make sure we always access database at serializable level.
export async function tx(f) {
  return await db.tx({mode: isolationLevel.serializable}, f);
}