import { getDb, runAsync, getAllAsync, getFirstAsync } from '../database';
import { syncAS } from './syncService'; // Importa a função de sync
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
const AS_ENDPOINT = 'api/v1/planejamento/as/'; // Ajuste conforme seu endpoint real

export const buscarASsNaAPI = async (termo) => {
    try {
        const response = await api.get(`${AS_ENDPOINT}?search=${termo}`);
        const resultados = response.data.results || [];

        if (resultados.length > 0) {
            const db = await getDb();
            const statements = [];

            for (const item of resultados) {
                statements.push({
                    sql: `INSERT OR REPLACE INTO ass (
                        server_id, data, local, disciplina, obs, tipo,
                        unidade_server_id, projeto_cod_server_id, 
                        solicitante_server_id, aprovador_server_id,
                        sync_status
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced')`,
                    args: [
                        item.id, 
                        item.data, 
                        item.local || "", 
                        item.disciplina || "", 
                        item.obs || "",
                        item.tipo || "NORMAL", // ADICIONADO: Evita erro de NOT NULL constraint
                        item.unidade?.id || item.unidade || null,
                        item.projeto_cod?.id || item.projeto_cod || null,
                        item.solicitante?.id || item.solicitante || null,
                        item.aprovador?.id || item.aprovador || null,
                    ]
                });
            }
            await runBatchAsync(db, statements);
        }
        return resultados.length;
    } catch (error) {
        console.error("❌ Erro na busca remota de AS:", error.message);
        return 0;
    }
};

export const listarASs = async (page = 1, limit = 15, busca = "") => {
    try {
        const db = await getDb();

        if (page === 1 && !busca) {
            await syncAS(db).catch(err => console.error("Falha no sync AS:", err));
        }

        const offset = (page - 1) * limit;
        let query = `SELECT * FROM ass `;
        let args = [];

        if (busca) {
            // REMOVIDO DEFINITIVAMENTE: "OR os LIKE ?"
            // Agora busca em local, disciplina ou ID
            query += `WHERE local LIKE ? OR disciplina LIKE ? OR CAST(server_id AS TEXT) LIKE ? `;
            args.push(`%${busca}%`, `%${busca}%`, `%${busca}%`);
        }

        query += `ORDER BY data DESC, id DESC LIMIT ? OFFSET ?`;
        args.push(parseInt(limit), parseInt(offset));

        const listaRaw = await db.getAllAsync(query, args);
        
        return listaRaw.map(item => ({
            ...item,
            unidade: item.unidade_server_id,
            projeto_cod: item.projeto_cod_server_id,
        }));

    } catch (error) {
        console.error("❌ Erro CRÍTICO ao listar ASs:", error);
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