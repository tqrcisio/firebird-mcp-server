import Firebird from 'node-firebird';
import { promisify } from 'util';
import { getFirebirdConfig } from '../config/firebird.config.js';


const pool = Firebird.pool(5, getFirebirdConfig());

const getConnection = promisify(pool.get).bind(pool);

type QueryCallback<T> = (err: Error | null, result: T) => void;
type ExecuteCallback = (err: Error | null) => void;
type TransactionCallback = (err: Error | null, transaction: any) => void;

export class FirebirdDB {
    static async query<T = any>(sql: string, params: any[] = []): Promise<T> {
        const connection = await getConnection();
        try {
            return new Promise<T>((resolve, reject) => {
                (connection.query as any)(sql, params, ((err: Error | null, result: T) => {
                    if (err) reject(err);
                    else resolve(result);
                }) as QueryCallback<T>);
            });
        } finally {
            connection.detach();
        }
    }

    static async execute(sql: string, params: any[] = []): Promise<void> {
        const connection = await getConnection();
        try {
            return new Promise<void>((resolve, reject) => {
                (connection.execute as any)(sql, params, ((err: Error | null) => {
                    if (err) reject(err);
                    else resolve();
                }) as ExecuteCallback);
            });
        } finally {
            connection.detach();
        }
    }

    static async transaction<T>(
        callback: (transaction: any) => Promise<T>
    ): Promise<T> {
        const connection = await getConnection();
        try {
            const transaction = await new Promise<any>((resolve, reject) => {
                (connection.transaction as any)(0, ((err: Error | null, transaction: any) => {
                    if (err) reject(err);
                    else resolve(transaction);
                }) as TransactionCallback);
            });

            try {
                const result = await callback(transaction);
                await new Promise<void>((resolve, reject) => {
                    transaction.commit((err: Error | null) => {
                        if (err) reject(err);
                        else resolve();
                    });
                });
                return result;
            } catch (error) {
                await new Promise<void>((resolve) => {
                    transaction.rollback(() => resolve());
                });
                throw error;
            }
        } finally {
            connection.detach();
        }
    }
} 