// src/services/levantamentoService.js

import { runAsync, getAllAsync, getFirstAsync } from '../database';
import { syncLevantamento } from './syncService'; // Importar a nova função de sync

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
export const listarLevantamentos = async () => {
    try {
        const listaRaw = await getAllAsync(
            "SELECT * FROM levantamento ORDER BY data DESC, id DESC"
        );

        // Processa os dados brutos para converter JSON string -> Objeto JS
        const listaFormatada = listaRaw.map(lvt => ({
            ...lvt,
            // Filhos
            itens_pintura: JSON.parse(lvt.itens_pintura_json || '[]'),
            // Mapeia IDs de FK para nomes amigáveis no frontend (server_ids)
            auth_serv: lvt.auth_serv_server_id,
            unidade: lvt.unidade_server_id, 
            projeto_cod: lvt.projeto_cod_server_id,
            // ... outros campos
        }));

        // Tenta sincronizar em background sem travar a UI
        syncLevantamento().catch((e) => console.warn("Sync Levantamento background error:", e.message));

        return listaFormatada;

    } catch (error) {
        console.error("Erro ao listar Levantamentos:", error);
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