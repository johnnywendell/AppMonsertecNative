import { getDb, runAsync, getAllAsync, getFirstAsync } from '../database';
import { syncBoletimMedicao } from './syncService'; // Importa a função de sync
import { api } from './api'; // Com chaves

async function runBatchAsync(db, statements) {
    // Esta é uma implementação simplificada; em um banco de dados Expo SQLite, 
    // você usaria db.transactionAsync.
    console.log(`⏳ Executando lote de ${statements.length} comandos SQL...`);
    for (const stmt of statements) {
        try {
            await db.runAsync(stmt.sql, stmt.args);
        } catch (e) {
            console.error("❌ Erro ao executar statement em lote:", stmt.sql, stmt.args, e.message);
            // Dependendo da sua necessidade, você pode lançar o erro para reverter a transação inteira
        }
    }
    console.log("✅ Lote de comandos SQL concluído.");
}

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

const BM_ENDPOINT = 'api/v1/planejamento/boletimmedicao/';

// --- 1. BUSCAR NA API (Remoto -> SQLite) ---
export const buscarBoletinsNaAPI = async (termo) => {
    try {
        const response = await api.get(`${BM_ENDPOINT}?search=${termo}`);
        // DRF com paginação retorna .results
        const resultados = response.data.results || [];

        if (resultados.length > 0) {
            const db = await getDb();
            const statements = [];

            for (const item of resultados) {
                statements.push({
                    sql: `INSERT OR REPLACE INTO boletim_medicoes (
                        server_id, unidade_server_id, projeto_cod_server_id, 
                        d_aprovador_server_id, b_aprovador_server_id,
                        periodo_inicio, periodo_fim, status_pgt, status_med, 
                        d_numero, d_data, d_status, b_numero, b_data, b_status,
                        descricao, valor, follow_up, rev, sync_status
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced')`,
                    args: [
                        item.id,
                        item.unidade?.id || item.unidade || null,
                        item.projeto_cod?.id || item.projeto_cod || null,
                        item.d_aprovador?.id || item.d_aprovador || null,
                        item.b_aprovador?.id || item.b_aprovador || null,
                        item.periodo_inicio,
                        item.periodo_fim,
                        item.status_pgt,
                        item.status_med,
                        item.d_numero,
                        item.d_data,
                        item.d_status,
                        item.b_numero,
                        item.b_data,
                        item.b_status,
                        item.descricao || "",
                        item.valor || 0,
                        item.follow_up || "",
                        item.rev || 0,
                    ]
                });
            }
            // Executa todos os inserts de uma vez para performance
            await runBatchAsync(db, statements);
        }
        return resultados.length;
    } catch (error) {
        console.error("❌ Erro na busca remota de BMs:", error.message);
        return 0;
    }
};

export const listarBoletinsMedicao = async (page = 1, limit = 15, busca = "") => {
    try {
        const db = await getDb();

        // Se estiver na primeira página e sem busca, tenta sincronizar o básico
        if (page === 1 && !busca) {
            await syncBoletimMedicao(db).catch(err => console.error("Falha no sync BM:", err));
        }

        const offset = (page - 1) * limit;
        let query = `SELECT * FROM boletim_medicoes `;
        let args = [];

        if (busca) {
            // Busca por descrição, número do documento D ou B, ou ID do servidor
            query += `WHERE descricao LIKE ? OR d_numero LIKE ? OR b_numero LIKE ? OR CAST(server_id AS TEXT) LIKE ? `;
            args.push(`%${busca}%`, `%${busca}%`, `%${busca}%`, `%${busca}%`);
        }

        query += `ORDER BY periodo_inicio DESC, id DESC LIMIT ? OFFSET ?`;
        args.push(parseInt(limit), parseInt(offset));

        const listaRaw = await db.getAllAsync(query, args);
        
        // Mapeia os nomes dos campos para manter compatibilidade com a UI
        return listaRaw.map(item => ({
            ...item,
            unidade: item.unidade_server_id,
            projeto_cod: item.projeto_cod_server_id,
            d_aprovador: item.d_aprovador_server_id,
            b_aprovador: item.b_aprovador_server_id,
        }));

    } catch (error) {
        console.error("❌ Erro CRÍTICO ao listar BMs:", error);
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