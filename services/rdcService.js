// src/services/rdcService.js

import { runAsync, getAllAsync, getFirstAsync } from '../database';
import { syncRDCs } from './syncService'; // Importar sua função de sync existente
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
 * Insere ou atualiza um RDC localmente e marca para sincronização.
 * Lida com a conversão dos arrays de filhos (Serviços, HH, PIN) para JSON.
 * * @param {object} dados - Objeto RDC completo (incluindo arrays rdcsserv, rdcshh, rdcspupin).
 */
export const salvarRdcLocal = async (dados) => {
    const {
        id, // ID Local (se for edição)
        server_id,
        data,
        unidade, // ID da FK
        solicitante, // ID da FK
        aprovador, // ID da FK
        local,
        tipo,
        doc,
        disciplina,
        obs,
        aprovado,
        AS, // ID da FK
        encarregado,
        projeto_cod, // ID da FK
        clima,
        inicio,
        termino,
        bm, // ID da FK
        
        // Arrays de filhos (precisam virar JSON para o SQLite conforme sua lógica de sync)
        rdcsserv = [],
        rdcshh = [],
        rdcspupin = []
    } = dados;

    // Serializa os arrays para salvar no SQLite (conforme esperado pelo syncRDCs)
    const servicos_json = JSON.stringify(rdcsserv);
    const hh_json = JSON.stringify(rdcshh);
    const pin_json = JSON.stringify(rdcspupin);

    // Converte booleano para inteiro (SQLite não tem boolean nativo)
    const aprovadoInt = aprovado ? 1 : 0;

    // Campos para query (ordem deve bater com a SQL abaixo)
    const payload = [
        data,
        local,
        tipo,
        disciplina,
        obs,
        aprovadoInt,
        encarregado,
        clima,
        inicio,
        termino,
        doc,
        unidade,
        solicitante,
        aprovador,
        projeto_cod,
        AS,
        bm,
        servicos_json,
        hh_json,
        pin_json,
        'pending' // sync_status
    ];

    try {
        let result;

        if (id) {
            // --- ATUALIZAÇÃO ---
            // Adiciona o ID ao final do array para o WHERE
            result = await runAsync(
                `UPDATE rdc SET 
                    data=?, local=?, tipo=?, disciplina=?, obs=?, aprovado=?, encarregado=?, clima=?, inicio=?, termino=?, doc=?,
                    unidade_server_id=?, solicitante_server_id=?, aprovador_server_id=?, projeto_cod_server_id=?, AS_server_id=?, bm_server_id=?,
                    servicos_json=?, hh_json=?, pin_json=?,
                    sync_status=?, updated_at=CURRENT_TIMESTAMP
                WHERE id=?`,
                [...payload, id]
            );
            console.log(`RDC Local ID ${id} atualizado. Status: pending.`);
            return { ...dados, sync_status: 'pending' };

        } else {
            // --- CRIAÇÃO ---
            result = await runAsync(
                `INSERT INTO rdc (
                    data, local, tipo, disciplina, obs, aprovado, encarregado, clima, inicio, termino, doc,
                    unidade_server_id, solicitante_server_id, aprovador_server_id, projeto_cod_server_id, AS_server_id, bm_server_id,
                    servicos_json, hh_json, pin_json,
                    sync_status
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                payload
            );
            const newId = result.lastInsertRowId;
            console.log(`RDC Local criado com ID: ${newId}. Status: pending.`);
            return { ...dados, id: newId, sync_status: 'pending' };
        }
    } catch (error) {
        console.error("Erro ao salvar RDC local:", error);
        throw error;
    }
};

/**
 * Listar RDCs (Offline-First)
 * Recupera do SQLite e converte os JSONs internos de volta para Arrays.
 */
const RDC_ENDPOINT = 'api/v1/planejamento/rdc/';
export const buscarRDCsNaAPI = async (termo) => {
    try {
        // 1. Busca na API usando o filtro que configuramos no Django
        const response = await api.get(`${RDC_ENDPOINT}?search=${termo}`);
        const resultados = response.data.results;

        if (resultados.length > 0) {
            const db = await getDb();
            const statements = [];

            // 2. Salva os resultados no SQLite para que o usuário possa vê-los
            for (const rdc of resultados) {
                statements.push({
                    sql: `INSERT OR REPLACE INTO rdc (
                        server_id, data, local, tipo, disciplina, obs, aprovado, 
                        unidade_server_id, projeto_cod_server_id,
                        servicos_json, hh_json, pin_json, sync_status
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced')`,
                    args: [
                        rdc.id, rdc.data, rdc.local, rdc.tipo, rdc.disciplina, rdc.obs, 
                        rdc.aprovado ? 1 : 0, 
                        rdc.unidade, rdc.projeto_cod, // Adicionado projeto_cod
                        JSON.stringify(rdc.rdcsserv || []), 
                        JSON.stringify(rdc.rdcshh || []), 
                        JSON.stringify(rdc.rdcspupin || [])
                    ]
                });
            }
            await runBatchAsync(db, statements);
        }
        return resultados.length; // Retorna quantos encontrou
    } catch (error) {
        console.error("Erro na busca remota:", error);
        return 0;
    }
};
export const listarRDCs = async (page = 1, limit = 15, busca = "") => {
    try {
        const db = await getDb(); // Garante que o banco está aberto
        if (page === 1 && !busca) {
            console.log("🔄 Chamando sincronização automática...");
            await syncRDCs(db).catch(err => console.error("Falha no sync silencioso:", err));
        }
        const offset = (page - 1) * limit;
        
        console.log(`🔎 Buscando RDCs localmente: Página ${page}, Busca: "${busca}"`);

        let query = `SELECT * FROM rdc `;
        let args = [];

        if (busca) {
            // Ajustei para procurar no server_id também
            query += `WHERE local LIKE ? OR disciplina LIKE ? OR server_id LIKE ? `;
            args.push(`%${busca}%`, `%${busca}%`, `%${busca}%`);
        }

        query += `ORDER BY data DESC, id DESC LIMIT ? OFFSET ?`;
        args.push(limit, offset);

        // USANDO O db DIRETAMENTE PARA EVITAR ERROS DE ESCOPO
        const listaRaw = await db.getAllAsync(query, args);
        
        console.log(`📊 Total de RDCs encontrados no SQLite: ${listaRaw.length}`);

        return listaRaw.map(rdc => ({
            ...rdc,
            aprovado: rdc.aprovado === 1,
            // Certifique-se que no seu banco os nomes são servicos_json, hh_json...
            rdcsserv: JSON.parse(rdc.servicos_json || '[]'),
            rdcshh: JSON.parse(rdc.hh_json || '[]'),
            rdcspupin: JSON.parse(rdc.pin_json || '[]'),
            unidade: rdc.unidade_server_id,
        }));

    } catch (error) {
        console.error("❌ Erro CRÍTICO ao listar RDCs:", error);
        throw error;
    }
};

/**
 * Busca um RDC específico por ID local.
 * Essencial para popular o formulário de edição.
 */
export const buscarRdc = async (id) => {
    try {
        const rdc = await getFirstAsync(
            "SELECT * FROM rdc WHERE id=?",
            [id]
        );

        if (!rdc) return null;

        // Formata o retorno parseando os JSONs
        return {
            ...rdc,
            aprovado: rdc.aprovado === 1,
            // Reconstroi os nomes de campo que o formulário espera (baseado no serializer Django)
            unidade: rdc.unidade_server_id,
            solicitante: rdc.solicitante_server_id,
            aprovador: rdc.aprovador_server_id,
            projeto_cod: rdc.projeto_cod_server_id,
            AS: rdc.AS_server_id,
            bm: rdc.bm_server_id,
            
            // Filhos
            rdcsserv: JSON.parse(rdc.servicos_json || '[]'),
            rdcshh: JSON.parse(rdc.hh_json || '[]'),
            rdcspupin: JSON.parse(rdc.pin_json || '[]'),
        };
    } catch (error) {
        console.error(`Erro ao buscar RDC ID ${id}:`, error);
        throw error;
    }
};

/**
 * Exclui um RDC localmente.
 * Se tiver server_id, marca como deleted para o sync remover no servidor.
 */
export const excluirRdcLocal = async (id) => {
    try {
        const rdc = await buscarRdc(id);

        if (!rdc) {
            return { success: false, message: "RDC não encontrado." };
        }
        
        if (rdc.server_id) {
            // Soft delete para sync
            await runAsync(
                `UPDATE rdc SET sync_status='deleted', updated_at=CURRENT_TIMESTAMP WHERE id=?`, 
                [id]
            );
            console.log(`RDC ID ${id} marcado como 'deleted'. Sync disparado.`);
            syncRDCs().catch(e => console.warn("Sync delete fail:", e));
        } else {
            // Hard delete (nunca foi pro servidor)
            await runAsync(`DELETE FROM rdc WHERE id=?`, [id]);
            console.log(`RDC ID ${id} removido permanentemente.`);
        }

        return { success: true };

    } catch (error) {
        console.error(`Erro ao excluir RDC ID ${id}:`, error);
        throw error;
    }
};