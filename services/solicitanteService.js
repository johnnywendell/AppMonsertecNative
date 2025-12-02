import { getDb, getAllAsync, getFirstAsync } from '../database';
import { syncSolicitantes } from './syncService'; // Importa a nova função de sync

/**
 * Insere ou atualiza um solicitante localmente e marca para sincronização.
 * @param {object} dados - { id (opcional), solicitante, contrato_server_id }
 */
export const salvarSolicitanteLocal = async (dados) => {
    const db = await getDb();
    // Atenção: usando 'solicitante' (corrigido) em vez de 'solciitante' (do seu serializer)
    const { id, solicitante, contrato_server_id } = dados; 
    let result;

    if (!solicitante || !contrato_server_id) {
        throw new Error("Solicitante e ID do Contrato são obrigatórios.");
    }
    
    const payload = [
        solicitante, 
        contrato_server_id,
        'pending' // Status para sincronização
    ];

    if (id) {
        // --- ATUALIZAÇÃO ---
        result = await db.runAsync(
            `UPDATE solicitantes
             SET solicitante=?, contrato_server_id=?, sync_status=?, updated_at=CURRENT_TIMESTAMP
             WHERE id=?`,
            [...payload.slice(0, -1), 'pending', id]
        );
        console.log(`Solicitante local ID ${id} atualizado. Status: pending.`);
        
        return { ...dados, sync_status: 'pending' };

    } else {
        // --- CRIAÇÃO ---
        result = await db.runAsync(
            `INSERT INTO solicitantes (solicitante, contrato_server_id, sync_status)
             VALUES (?, ?, ?)`,
            payload
        );
        console.log(`Solicitante local criado com ID: ${result.lastInsertRowId}. Status: pending.`);
        
        return { ...dados, id: result.lastInsertRowId, sync_status: 'pending' };
    }
};

/**
 * Lista todos os solicitantes (Offline-First).
 * 1. Lê primeiro do SQLite.
 * 2. Tenta sincronizar com servidor em background (syncSolicitantes).
 */
export const listarSolicitantes = async () => {
    try {
        // 1. Leitura local
        const lista = await getAllAsync(
            "SELECT * FROM solicitantes" 
        );

        // Ordenação em memória
        const listaOrdenada = lista.sort((a, b) => a.solicitante.localeCompare(b.solicitante));

        // 2. Sincronização em background
        syncSolicitantes().catch((e) => console.warn("Sync de solicitantes em background falhou:", e.message));

        return listaOrdenada;

    } catch (error) {
        console.error("Erro ao listar solicitantes localmente:", error);
        throw error;
    }
};

/**
 * Busca um solicitante por ID local.
 */
export const buscarSolicitante = async (id) => {
    return await getFirstAsync(
        "SELECT * FROM solicitantes WHERE id=?",
        [id]
    );
};