import { getDb, runAsync, getAllAsync, getFirstAsync } from '../database';
import { syncBoletimMedicao } from './syncService'; // Importa a função de sync

const TABLE_NAME = 'boletim_medicoes';

// --- FUNÇÃO 1: SALVAR / ATUALIZAR BM ---
/**
 * Insere ou atualiza um Boletim de Medição localmente e marca para sincronização.
 * @param {object} dados - { 
 * id (opcional), periodo_inicio, periodo_fim, descricao, valor, ... todas as FKs_server_id
 * }
 */
export const salvarBoletimMedicaoLocal = async (dados) => {
    const db = await getDb();
    const { id } = dados;
    let result;

    if (!dados.periodo_inicio || !dados.periodo_fim || !dados.descricao) {
        throw new Error("Período de Início, Fim e Descrição são obrigatórios.");
    }
    
    // Lista de valores para o SQL
    const payload = [
        dados.periodo_inicio,
        dados.periodo_fim,
        dados.status_pgt || null,
        dados.status_med || null,
        dados.d_numero || null,
        dados.d_data || null,
        dados.d_status || null,
        dados.b_numero || null,
        dados.b_data || null,
        dados.b_status || null,
        dados.descricao,
        dados.valor || null, // REAL
        dados.follow_up || null,
        dados.rev || 0,
        dados.unidade_server_id || null, 
        dados.projeto_cod_server_id || null,
        dados.d_aprovador_server_id || null,
        dados.b_aprovador_server_id || null,
        'pending' // sync_status
    ];

    // Lista de nomes das colunas
    const columns = [
        'periodo_inicio', 'periodo_fim', 'status_pgt', 'status_med', 
        'd_numero', 'd_data', 'd_status', 'b_numero', 'b_data', 'b_status',
        'descricao', 'valor', 'follow_up', 'rev', 
        'unidade_server_id', 'projeto_cod_server_id', 'd_aprovador_server_id', 'b_aprovador_server_id',
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
        console.log(`BM local ID ${id} atualizado. Status: pending.`);
        
        return { ...dados, sync_status: 'pending' };

    } else {
        // --- CRIAÇÃO ---
        result = await db.runAsync(
            `INSERT INTO ${TABLE_NAME} (${columns.join(', ')})
             VALUES (${placeholders})`,
            payload
        );
        console.log(`BM local criado com ID: ${result.lastInsertRowId}. Status: pending.`);
        
        return { ...dados, id: result.lastInsertRowId, sync_status: 'pending' };
    }
};

// --- FUNÇÃO 2: LISTAR BMs ---
/**
 * Lista todos os Boletins de Medição (Offline-First) e dispara sync em background.
 */
export const listarBoletinsMedicao = async () => {
    try {
        // 1. Leitura local
        const lista = await getAllAsync(
            "SELECT * FROM boletim_medicoes ORDER BY periodo_inicio DESC, id DESC" // Ordena por data de início
        );

        // 2. Sincronização em background
        syncBoletimMedicao().catch((e) => console.warn("Sync de BMs em background falhou:", e.message));

        return lista;

    } catch (error) {
        console.error("Erro ao listar BMs localmente:", error);
        throw error;
    }
};

// --- FUNÇÃO 3: BUSCAR BM POR ID (Para Edição) ---
/**
 * Busca um Boletim de Medição por ID local.
 * Esta função é usada pela tela de formulário para carregar dados de edição.
 */
export const buscarBoletimMedicao = async (id) => {
    try {
        return await getFirstAsync(
            `SELECT * FROM ${TABLE_NAME} WHERE id=?`,
            [id]
        );
    } catch (error) {
        console.error("Erro ao buscar BM por ID:", error);
        return null;
    }
};

/*
 * NOTA DE CORREÇÃO: A função getBoletimMedicaoById foi removida
 * porque usava a API antiga (openDatabase e db.get) e era redundante
 * com buscarBoletimMedicao, que usa a API correta (getFirstAsync).
*/