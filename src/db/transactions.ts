import type { PoolClient } from 'pg';
import { getClient } from './index.js';

// type TransactionCallback<T> = (client: PoolClient) => Promise<T>

// export async function withTransaction<T>(callback: TransactionCallback<T>): Promise<T> {
//   const client = await getClient();
//   try {
//     await client.query("BEGIN");
//     const result = await callback(client);
//     await client.query("COMMIT");
//     return result;
//   } catch (err) {
//     await client.query("ROLLBACK");
//     throw err;
//   } finally {
//     client.release();
//   }
// }

type TransactionCallback<T> = (client: PoolClient) => Promise<T>;

export async function withTransaction<T>(callback: TransactionCallback<T>): Promise<T> {
  const client = await getClient();
  try {
    await client.query("BEGIN")
    const result = await callback(client)
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK")
    throw err
  } finally {
    client.release()
  }
}