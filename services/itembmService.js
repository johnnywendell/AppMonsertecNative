import { getDb, runAsync, getAllAsync, getFirstAsync } from '../database';
import { syncItensBm } from './syncService'; // Certifique-se que o nome do arquivo e da função estão corretos

/**
 * Insere ou atualiza um ItemBm localmente e marca para sincronização.
 * @param {object} dados - { 
 * id (opcional), item_ref, disciplina, descricao, und, 
 * preco_item, obs, data, contrato_server_id 
 * }
 */
export const salvarItemBmLocal = async (dados) => {
    const db = await getDb();
    const { 
        id, item_ref, disciplina, descricao, und, 
        preco_item, obs, data, contrato_server_id 
    } = dados;
    let result;

    if (!item_ref || !contrato_server_id || !descricao || !data) {
        throw new Error("Campos item_ref, descrição, data e ID do Contrato são obrigatórios.");
    }
    
    // Lista de valores para o INSERT/UPDATE
    const payload = [
        item_ref, disciplina, descricao, und, 
        preco_item, obs, data, contrato_server_id,
        'pending' // Status para sincronização
    ];

    if (id) {
        // --- ATUALIZAÇÃO ---
        // Observação: Assumindo que a tabela SQLite para ItemBm é 'itens_bm'
        result = await db.runAsync(
            `UPDATE itens_bm
             SET item_ref=?, disciplina=?, descricao=?, und=?, preco_item=?, obs=?, data=?, contrato_server_id=?, sync_status=?, updated_at=CURRENT_TIMESTAMP
             WHERE id=?`,
            [...payload.slice(0, -1), 'pending', id]
        );
        console.log(`Item BM local ID ${id} atualizado. Status: pending.`);
        
        return { ...dados, sync_status: 'pending' };

    } else {
        // --- CRIAÇÃO ---
        result = await db.runAsync(
            `INSERT INTO itens_bm (item_ref, disciplina, descricao, und, preco_item, obs, data, contrato_server_id, sync_status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            payload
        );
        console.log(`Item BM local criado com ID: ${result.lastInsertRowId}. Status: pending.`);
        
        return { ...dados, id: result.lastInsertRowId, sync_status: 'pending' };
    }
};

/**
 * Lista todos os Itens BM (Offline-First).
 * 1. Lê primeiro do SQLite.
 * 2. Tenta sincronizar com servidor em background (syncItensBm).
 */
export const listarItensBm = async () => {
    try {
        // 1. Leitura local
        const lista = await getAllAsync(
            "SELECT * FROM itens_bm" 
        );

        // Ordenação em memória
        const listaOrdenada = lista.sort((a, b) => a.item_ref.localeCompare(b.item_ref));

        // 2. Sincronização em background
        syncItensBm().catch((e) => console.warn("Sync de Itens BM em background falhou:", e.message));

        return listaOrdenada;

    } catch (error) {
        console.error("Erro ao listar Itens BM localmente:", error);
        throw error;
    }
};

/**
 * Busca um Item BM por ID local.
 */
export const buscarItemBm = async (id) => {
    // Observação: Assumindo que a tabela SQLite é 'itens_bm'
    return await getFirstAsync(
        "SELECT * FROM itens_bm WHERE id=?",
        [id]
    );
};