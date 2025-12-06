import { getDb, runAsync, getAllAsync, getFirstAsync } from '../database';
import { syncAprovadores } from './syncService'; // Certifique-se que o nome do arquivo e da função estão corretos

/**
 * Insere ou atualiza um aprovador localmente e marca para sincronização.
 * @param {object} dados - { id (opcional), aprovador, contrato_server_id }
 */
export const salvarAprovadorLocal = async (dados) => {
    const db = await getDb();
    const { id, aprovador, contrato_server_id } = dados;
    let result;

    if (!aprovador || !contrato_server_id) {
        throw new Error("Aprovador e ID do Contrato são obrigatórios.");
    }
    
    const payload = [
        aprovador, 
        contrato_server_id,
        'pending' // Status para sincronização
    ];

    if (id) {
        // --- ATUALIZAÇÃO ---
        // Observação: Assumindo que a tabela SQLite para Aprovador é 'aprovadores'
        result = await db.runAsync(
            `UPDATE aprovadores
             SET aprovador=?, contrato_server_id=?, sync_status=?, updated_at=CURRENT_TIMESTAMP
             WHERE id=?`,
            [...payload.slice(0, -1), 'pending', id]
        );
        console.log(`Aprovador local ID ${id} atualizado. Status: pending.`);
        
        return { ...dados, sync_status: 'pending' };

    } else {
        // --- CRIAÇÃO ---
        result = await db.runAsync(
            `INSERT INTO aprovadores (aprovador, contrato_server_id, sync_status)
             VALUES (?, ?, ?)`,
            payload
        );
        console.log(`Aprovador local criado com ID: ${result.lastInsertRowId}. Status: pending.`);
        
        return { ...dados, id: result.lastInsertRowId, sync_status: 'pending' };
    }
};

/**
 * Lista todos os aprovadores (Offline-First).
 * 1. Lê primeiro do SQLite.
 * 2. Tenta sincronizar com servidor em background (syncAprovadores).
 */
export const listarAprovadores = async () => {
    try {
        // 1. Leitura local
        const lista = await getAllAsync(
            "SELECT * FROM aprovadores" 
        );

        // Ordenação em memória
        const listaOrdenada = lista.sort((a, b) => a.aprovador.localeCompare(b.aprovador));

        // 2. Sincronização em background
        syncAprovadores().catch((e) => console.warn("Sync de aprovadores em background falhou:", e.message));

        return listaOrdenada;

    } catch (error) {
        console.error("Erro ao listar aprovadores localmente:", error);
        throw error;
    }
};

/**
 * Busca um aprovador por ID local.
 */
export const buscarAprovador = async (id) => {
    // Observação: Assumindo que a tabela SQLite é 'aprovadores'
    return await getFirstAsync(
        "SELECT * FROM aprovadores WHERE id=?",
        [id]
    );
};