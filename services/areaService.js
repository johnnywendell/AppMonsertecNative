import { getDb, runAsync, getAllAsync, getFirstAsync } from '../database';
import { syncAreas } from './syncService'; // Criaremos esta função em syncService.js

/**
 * Insere ou atualiza uma área localmente e marca para sincronização.
 * Assume que a área é sempre ligada a um contrato, mas esse contrato não é editável aqui.
 * @param {object} dados - { id (opcional), area, contrato_server_id }
 */
export const salvarAreaLocal = async (dados) => {
    const db = await getDb();
    const { id, area, contrato_server_id } = dados;
    let result;

    if (!area || !contrato_server_id) {
        throw new Error("Área e ID do Contrato são obrigatórios.");
    }
    
    const payload = [
        area, 
        contrato_server_id,
        'pending' // Status para sincronização
    ];

    if (id) {
        // --- ATUALIZAÇÃO ---
        result = await db.runAsync(
            `UPDATE areas
             SET area=?, contrato_server_id=?, sync_status=?, updated_at=CURRENT_TIMESTAMP
             WHERE id=?`,
            [...payload.slice(0, -1), 'pending', id]
        );
        console.log(`Área local ID ${id} atualizada. Status: pending.`);
        
        return { ...dados, sync_status: 'pending' };

    } else {
        // --- CRIAÇÃO ---
        result = await db.runAsync(
            `INSERT INTO areas (area, contrato_server_id, sync_status)
             VALUES (?, ?, ?)`,
            payload
        );
        console.log(`Área local criada com ID: ${result.lastInsertRowId}. Status: pending.`);
        
        return { ...dados, id: result.lastInsertRowId, sync_status: 'pending' };
    }
};

/**
 * Lista todas as áreas (Offline-First).
 * 1. Lê primeiro do SQLite.
 * 2. Tenta sincronizar com servidor em background (syncAreas).
 */
export const listarAreas = async () => {
    try {
        // 1. Leitura local
        const lista = await getAllAsync(
            "SELECT * FROM areas" 
        );

        // Ordenação em memória (como fizemos com colaboradores)
        const listaOrdenada = lista.sort((a, b) => a.area.localeCompare(b.area));

        // 2. Sincronização em background
        syncAreas().catch((e) => console.warn("Sync de áreas em background falhou:", e.message));

        return listaOrdenada;

    } catch (error) {
        console.error("Erro ao listar áreas localmente:", error);
        throw error;
    }
};

/**
 * Busca uma área por ID local.
 */
export const buscarArea = async (id) => {
    return await getFirstAsync(
        "SELECT * FROM areas WHERE id=?",
        [id]
    );
};