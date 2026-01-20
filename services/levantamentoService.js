// src/services/levantamentoService.js

import { runAsync, getAllAsync, getFirstAsync } from '../database';
import { syncLevantamento } from './syncService'; // Importar a nova função de sync

import { getDb } from '../database';
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
/**
 * Insere ou atualiza um Levantamento localmente e marca para sincronização.
 * Lida com a conversão do array de itens filhos para JSON.
 * @param {object} dados - Objeto Levantamento completo (incluindo array itens_pintura).
 */
export const salvarLevantamentoLocal = async (dados) => {
    const {
        id, // ID Local (se for edição)
        server_id,
        auth_serv, // ID da FK (AS)
        data,
        unidade, // ID da FK (Area)
        projeto_cod, // ID da FK (ProjetoCodigo)
        escopo,
        local,
        doc,
        
        // Array de filhos (precisa virar JSON para o SQLite)
        itens_pintura = [],
    } = dados;

    // Serializa o array para salvar no SQLite
    const pintura_json = JSON.stringify(itens_pintura);

    // Campos para query (ordem deve bater com a SQL abaixo)
    const payload = [
        data,
        escopo,
        local,
        doc,
        auth_serv,
        unidade,
        projeto_cod,
        pintura_json,
        'pending' // sync_status
    ];

    try {
        let result;

        if (id) {
            // --- ATUALIZAÇÃO ---
            // Adiciona o ID ao final do array para o WHERE
            result = await runAsync(
                `UPDATE levantamento SET 
                    data=?, escopo=?, local=?, doc=?,
                    auth_serv_server_id=?, unidade_server_id=?, projeto_cod_server_id=?,
                    itens_pintura_json=?,
                    sync_status=?, updated_at=CURRENT_TIMESTAMP
                WHERE id=?`,
                [...payload, id]
            );
            console.log(`Levantamento Local ID ${id} atualizado. Status: pending.`);
            return { ...dados, sync_status: 'pending' };

        } else {
            // --- CRIAÇÃO ---
            result = await runAsync(
                `INSERT INTO levantamento (
                    data, escopo, local, doc,
                    auth_serv_server_id, unidade_server_id, projeto_cod_server_id,
                    itens_pintura_json,
                    sync_status
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                payload
            );
            const newId = result.lastInsertRowId;
            console.log(`Levantamento Local criado com ID: ${newId}. Status: pending.`);
            return { ...dados, id: newId, sync_status: 'pending' };
        }
    } catch (error) {
        console.error("Erro ao salvar Levantamento local:", error);
        throw error;
    }
};

/**
 * Listar Levantamentos (Offline-First)
 * Recupera do SQLite e converte o JSON interno de volta para Array.
 */
const LVT_ENDPOINT = 'api/v1/planejamento/levantamento/';
export const buscarLevantamentosNaAPI = async (termo) => {
    try {
        console.log(`📡 Buscando Levantamentos remotamente por: "${termo}"`);
        const response = await api.get(`${LVT_ENDPOINT}?search=${termo}`);
        
        // Django paginado usa .results
        const resultados = response.data.results || [];

        if (resultados.length > 0) {
            const db = await getDb();
            const statements = [];

            for (const lvt of resultados) {
                statements.push({
                    sql: `INSERT OR REPLACE INTO levantamento (
                        server_id, data, local, tipo, obs, 
                        unidade_server_id, projeto_cod_server_id, auth_serv_server_id,
                        itens_pintura_json, sync_status
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced')`,
                    args: [
                        lvt.id, lvt.data, lvt.local, lvt.tipo, lvt.obs,
                        lvt.unidade, lvt.projeto_cod, lvt.auth_serv,
                        JSON.stringify(lvt.itens_pintura || []),
                        lvt.id
                    ]
                });
            }
            await runBatchAsync(db, statements);
            console.log(`✅ ${resultados.length} Levantamentos salvos no SQLite.`);
        }
        return resultados.length;
    } catch (error) {
        console.error("❌ Erro na busca remota de Levantamento:", error.message);
        return 0;
    }
};

export const listarLevantamentos = async (page = 1, limit = 15, busca = "") => {
    try {
        const db = await getDb();

        if (page === 1 && !busca) {
            console.log("🔄 Chamando sincronização automática de Levantamentos...");
            await syncLevantamento(db).catch(err => console.error("Falha no sync silencioso LVT:", err));
        }

        const offset = (page - 1) * limit;
        let query = `SELECT * FROM levantamento `;
        let args = [];

        if (busca) {
            // CORREÇÃO AQUI: 2 '?' na query = 2 args no push
            query += `WHERE local LIKE ? OR CAST(server_id AS TEXT) LIKE ? `;
            args.push(`%${busca}%`, `%${busca}%`); // Removido o terceiro argumento extra
        }

        query += `ORDER BY data DESC, id DESC LIMIT ? OFFSET ?`;
        
        // Garante que limit e offset sejam inteiros para evitar datatype mismatch
        args.push(parseInt(limit), parseInt(offset));

        console.log(`🔎 Executando Query: ${query} | Args:`, args);

        const listaRaw = await db.getAllAsync(query, args);
        
        return listaRaw.map(lvt => ({
            ...lvt,
            itens_pintura: JSON.parse(lvt.itens_pintura_json || '[]'),
            auth_serv: lvt.auth_serv_server_id,
            unidade: lvt.unidade_server_id, 
            projeto_cod: lvt.projeto_cod_server_id,
        }));

    } catch (error) {
        console.error("❌ Erro CRÍTICO ao listar Levantamentos:", error);
        throw error;
    }
};

/**
 * Busca um Levantamento específico por ID local.
 * Essencial para popular o formulário de edição.
 */
export const buscarLevantamento = async (id) => {
    try {
        const lvt = await getFirstAsync(
            "SELECT * FROM levantamento WHERE id=?",
            [id]
        );

        if (!lvt) return null;

        // Formata o retorno parseando o JSON
        return {
            ...lvt,
            // Reconstroi os nomes de campo que o formulário espera
            auth_serv: lvt.auth_serv_server_id,
            unidade: lvt.unidade_server_id,
            projeto_cod: lvt.projeto_cod_server_id,
            
            // Filhos
            itens_pintura: JSON.parse(lvt.itens_pintura_json || '[]'),
        };
    } catch (error) {
        console.error(`Erro ao buscar Levantamento ID ${id}:`, error);
        throw error;
    }
};

/**
 * Exclui um Levantamento localmente.
 * Se tiver server_id, marca como deleted para o sync remover no servidor.
 */
export const excluirLevantamentoLocal = async (id) => {
    try {
        const lvt = await buscarLevantamento(id);

        if (!lvt) {
            return { success: false, message: "Levantamento não encontrado." };
        }
        
        if (lvt.server_id) {
            // Soft delete para sync
            await runAsync(
                `UPDATE levantamento SET sync_status='deleted', updated_at=CURRENT_TIMESTAMP WHERE id=?`, 
                [id]
            );
            console.log(`Levantamento ID ${id} marcado como 'deleted'. Sync disparado.`);
            syncLevantamento().catch(e => console.warn("Sync delete fail:", e));
        } else {
            // Hard delete (nunca foi pro servidor)
            await runAsync(`DELETE FROM levantamento WHERE id=?`, [id]);
            console.log(`Levantamento ID ${id} removido permanentemente.`);
        }

        return { success: true };

    } catch (error) {
        console.error(`Erro ao excluir Levantamento ID ${id}:`, error);
        throw error;
    }
};