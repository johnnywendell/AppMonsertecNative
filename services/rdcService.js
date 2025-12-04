// src/services/rdcService.js

import { runAsync, getAllAsync, getFirstAsync } from '../database';
import { syncRDCs } from './syncService'; // Importar sua função de sync existente

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
export const listarRDCs = async () => {
    try {
        const listaRaw = await getAllAsync(
            "SELECT * FROM rdc ORDER BY data DESC, id DESC"
        );

        // Processa os dados brutos para converter JSON string -> Objeto JS
        const listaFormatada = listaRaw.map(rdc => ({
            ...rdc,
            aprovado: rdc.aprovado === 1, // Converte 1/0 para true/false
            rdcsserv: JSON.parse(rdc.servicos_json || '[]'),
            rdcshh: JSON.parse(rdc.hh_json || '[]'),
            rdcspupin: JSON.parse(rdc.pin_json || '[]'),
            // Mapeia IDs de FK para nomes amigáveis no frontend se necessário (server_ids)
            unidade: rdc.unidade_server_id,
            solicitante: rdc.solicitante_server_id, 
            aprovador: rdc.aprovador_server_id,
            // ... outros campos
        }));

        // Tenta sincronizar em background sem travar a UI
        syncRDCs().catch((e) => console.warn("Sync RDC background error:", e.message));

        return listaFormatada;

    } catch (error) {
        console.error("Erro ao listar RDCs:", error);
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