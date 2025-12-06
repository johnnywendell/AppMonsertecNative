import { getDb, runAsync, getAllAsync, getFirstAsync } from '../database';
import { syncAS } from './syncService'; // Importa a função de sync

const TABLE_NAME = 'ass'; // Mantendo 'ass' para evitar conflito com 'AS' do SQL

/**
 * Insere ou atualiza uma AS localmente e marca para sincronização.
 * @param {object} dados - { 
 * id (opcional), data, tipo, disciplina, escopo, local, obs, rev, as_sap, as_antiga,
 * unidade_server_id, solicitante_server_id, aprovador_server_id, projeto_cod_server_id
 * }
 */
export const salvarASLocal = async (dados) => {
    const db = await getDb();
    const { id } = dados;
    let result;

    // Campos obrigatórios mínimos para validação
    if (!dados.data || !dados.tipo || !dados.disciplina || !dados.solicitante_server_id) {
        throw new Error("Data, Tipo, Disciplina e Solicitante são obrigatórios.");
    }
    
    // Lista de valores para o SQL (mantendo a ordem das colunas no INSERT/UPDATE)
    const payload = [
        dados.data,
        dados.tipo,
        dados.disciplina,
        dados.escopo || null,
        dados.local || null,
        dados.obs || null,
        dados.rev || 0,
        dados.as_sap || null,
        dados.as_antiga || null,
        dados.unidade_server_id || null, 
        dados.solicitante_server_id,
        dados.aprovador_server_id || null,
        dados.projeto_cod_server_id || null,
        'pending' // sync_status
    ];
    
    // Lista de nomes das colunas (incluindo as FKs server_id)
    const columns = [
        'data', 'tipo', 'disciplina', 'escopo', 'local', 'obs', 'rev', 'as_sap', 'as_antiga',
        'unidade_server_id', 'solicitante_server_id', 'aprovador_server_id', 'projeto_cod_server_id', 
        'sync_status'
    ];

    const placeholders = columns.map(() => '?').join(', ');
    const setClause = columns.map(col => `${col}=?`).join(', ');


    if (id) {
        // --- ATUALIZAÇÃO ---
        result = await db.runAsync(
            `UPDATE ${TABLE_NAME}
             SET ${setClause}, updated_at=CURRENT_TIMESTAMP
             WHERE id=?`,
            [...payload, id]
        );
        console.log(`AS local ID ${id} atualizada. Status: pending.`);
        
        return { ...dados, sync_status: 'pending' };

    } else {
        // --- CRIAÇÃO ---
        result = await db.runAsync(
            `INSERT INTO ${TABLE_NAME} (${columns.join(', ')})
             VALUES (${placeholders})`,
            payload
        );
        console.log(`AS local criada com ID: ${result.lastInsertRowId}. Status: pending.`);
        
        return { ...dados, id: result.lastInsertRowId, sync_status: 'pending' };
    }
};

/**
 * Lista todas as ASs (Offline-First) e dispara sync em background.
 */
export const listarASs = async () => {
    try {
        // 1. Leitura local
        const lista = await getAllAsync(
            "SELECT * FROM ass ORDER BY data DESC, id DESC" // Ordena por data (mais recente primeiro)
        );

        // 2. Sincronização em background
        syncAS().catch((e) => console.warn("Sync de ASs em background falhou:", e.message));

        return lista;

    } catch (error) {
        console.error("Erro ao listar ASs localmente:", error);
        throw error;
    }
};

/**
 * Busca uma AS por ID local.
 */
export const buscarAS = async (id) => {
    return await getFirstAsync(
        `SELECT * FROM ${TABLE_NAME} WHERE id=?`,
        [id]
    );
};