import { getDb } from './database';

export async function addOfflineOperation({
    entity,
    operation,
    endpoint,
    payload,
}) {
    const db = await getDb();

    const result = await db.runAsync(
        `
        INSERT INTO offline_queue (
            entity,
            operation,
            endpoint,
            payload
        )
        VALUES (?, ?, ?, ?)
        `,
        [
            entity,
            operation,
            endpoint,
            JSON.stringify(payload),
        ]
    );

    console.log(
        `📥 Operação offline salva: ${entity} - ${operation}`
    );

    return result.lastInsertRowId;
}


export async function getPendingOperations() {
    const db = await getDb();

    return await db.getAllAsync(`
        SELECT *
        FROM offline_queue
        ORDER BY created_at ASC, id ASC
    `);
}


export async function removeOfflineOperation(id) {
    const db = await getDb();

    await db.runAsync(
        `
        DELETE FROM offline_queue
        WHERE id = ?
        `,
        [id]
    );
}


export async function registerOfflineError(id, error) {
    const db = await getDb();

    await db.runAsync(
        `
        UPDATE offline_queue
        SET
            attempts = attempts + 1,
            last_error = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        `,
        [
            typeof error === 'string'
                ? error
                : JSON.stringify(error),
            id,
        ]
    );
}