import { api } from './api';
import { getDb } from '../database';
import { criarRelatorioLocal } from './relatorioQualidadeService';
import NetInfo from '@react-native-community/netinfo';

const cleanNestedIds = (items) => {
    if (!Array.isArray(items)) return [];
    
    return items.map(item => {
        // Cria uma nova cópia do objeto, excluindo a chave 'id'
        const { id, ...rest } = item;
        return rest;
    });
};

const ensureString = (value) => (value === null || value === undefined) ? "" : value;
const AsyncStorage = {
    getItem: async (key) => {
        // Simula o retorno de null se não houver item
        return null; 
    },
    setItem: async (key, value) => {
        // Simula a gravação
        return true;
    }
}
// Função utilitária para executar múltiplas operações em lote/transação (necessária para syncRDCs)
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


export async function syncData() {
    const { isConnected } = await NetInfo.fetch();
    if (!isConnected) {
        console.log('Sem conexão, sincronização adiada');
        return;
    }

    const db = await getDb();

    // Sincronizar Áreas
    await syncAreas(db);
    // Sincronizar Relatórios
    await syncRelatorios(db);
    await syncChecklists(db);
    await syncRelatoriosGarantia(db);
    // Colaboradores
    await syncColaboradores(db);
    // Solicitantes
    await syncSolicitantes(db);


}

const BASE_ENDPOINT = 'api/v1/efetivo/colaboradores/';
export async function syncColaboradores() {
    const { isConnected } = await NetInfo.fetch();
    if (!isConnected) {
        console.log('📵 Sem internet — colaboradores sem sync agora');
        return;
    }

    const db = await getDb();

    try {
        console.log("📌 Sincronizando colaboradores…");

        // 1️⃣ SYNC UP: Enviar pendentes do SQLite para API
        const pendentes = await db.getAllAsync(
            "SELECT * FROM colaboradores WHERE sync_status = 'pending'"
        );

        for (const colab of pendentes) {
            try {
                // Montar o payload com base no Model/Serializer do Django
                const payload = {
                    nome: colab.nome,
                    matricula: colab.matricula,
                    funcao: colab.funcao,
                    disciplina: colab.disciplina,
                    ativo: colab.ativo,
                    // Note: 'chapa' foi substituído por 'matricula' e 'funcao'
                };

                let resp;
                
                // Se o registro local foi uma atualização de um item do servidor:
                if (colab.server_id) {
                    resp = await api.put(`${BASE_ENDPOINT}${colab.server_id}/`, payload);
                    console.log(`☑️ Atualizado Server ID ${colab.server_id}: ${colab.nome}`);
                } else {
                    // É um novo colaborador (POST)
                    resp = await api.post(BASE_ENDPOINT, payload);
                    console.log(`☑️ Criado Server ID ${resp.data.id}: ${colab.nome}`);
                }
                
                // Atualiza o status local para 'synced' e armazena o server_id
                await db.runAsync(
                    "UPDATE colaboradores SET sync_status = 'synced', server_id = ? WHERE id = ?",
                    [resp.data.id, colab.id]
                );

            } catch (e) {
                console.warn(`⚠️ Falha ao enviar pendente ${colab.nome}:`, e.message);
                // Em caso de falha (ex: matricula duplicada), o status permanece 'pending' para tentar novamente depois.
            }
        }

        // 2️⃣ SYNC DOWN: Buscar do servidor e atualizar SQLite
        const { data } = await api.get(BASE_ENDPOINT); // Busca a lista completa do servidor

        // Marca todos os registros locais 'synced' como 'deleted'
        await db.runAsync("UPDATE colaboradores SET sync_status = 'deleted' WHERE sync_status = 'synced'");

        for (const apiColab of data) {
            // Usa INSERT OR REPLACE para garantir que:
            // a) Se o server_id já existe localmente (porque foi syncado), ele é atualizado.
            // b) Se o server_id é novo (baixado), ele é inserido.
            // Usamos o server_id como PK virtual para o REPLACE (garantido pela coluna 'server_id' no DB)

            await db.runAsync(
                `INSERT OR REPLACE INTO colaboradores (
                    server_id, nome, matricula, funcao, disciplina, ativo, sync_status, id 
                ) VALUES (
                    ?, ?, ?, ?, ?, ?, 'synced', 
                    (SELECT id FROM colaboradores WHERE server_id = ?) -- Preserva o ID local se existir
                )`,
                [
                    apiColab.id,
                    apiColab.nome,
                    apiColab.matricula,
                    apiColab.funcao,
                    apiColab.disciplina,
                    apiColab.ativo,
                    apiColab.id // Para o subselect do ID local
                ]
            );
        }
        
        // Remove os colaboradores marcados como 'deleted' (que foram removidos no servidor)
        await db.runAsync("DELETE FROM colaboradores WHERE sync_status = 'deleted'");

        console.log(`📥 Banco atualizado — total API: ${data.length} colaboradores`);

    } catch (err) {
        console.error("❌ Sync colaboradores falhou:", err.message);
    }
}

const AREAS_ENDPOINT = 'api/v1/geral/areas/';
export async function syncAreas() {
    const { isConnected } = await NetInfo.fetch();
    if (!isConnected) {
        console.log('📵 Sem internet — Áreas sem sync agora');
        return;
    }

    const db = await getDb();

    try {
        console.log("📌 Sincronizando Áreas...");

        // 1️⃣ SYNC UP: Enviar pendentes do SQLite para API
        const pendentes = await db.getAllAsync(
            "SELECT * FROM areas WHERE sync_status = 'pending'"
        );

        for (const areaLocal of pendentes) {
            try {
                // Payload para a API (Django Serializer)
                const payload = {
                    area: areaLocal.area,
                    contrato_id: areaLocal.contrato_server_id, // Usamos o campo do modelo
                };

                let resp;
                
                if (areaLocal.server_id) {
                    // Atualização (PUT)
                    resp = await api.put(`${AREAS_ENDPOINT}${areaLocal.server_id}/`, payload);
                    console.log(`☑️ Área atualizada Server ID ${areaLocal.server_id}: ${areaLocal.area}`);
                } else {
                    // Criação (POST)
                    resp = await api.post(AREAS_ENDPOINT, payload);
                    console.log(`☑️ Área criada Server ID ${resp.data.id}: ${areaLocal.area}`);
                }
                
                // Atualiza o status local
                await db.runAsync(
                    "UPDATE areas SET sync_status = 'synced', server_id = ? WHERE id = ?",
                    [resp.data.id, areaLocal.id]
                );

            } catch (e) {
                console.warn(`⚠️ Falha ao enviar Área pendente ${areaLocal.area}:`, e.message);
            }
        }

        // 2️⃣ SYNC DOWN: Buscar do servidor e atualizar SQLite
        const { data } = await api.get(AREAS_ENDPOINT);

        // Marca todos os registros locais 'synced' como 'deleted'
        await db.runAsync("UPDATE areas SET sync_status = 'deleted' WHERE sync_status = 'synced'");

        for (const apiArea of data) {
            await db.runAsync(
                `INSERT OR REPLACE INTO areas (
                    server_id, area, contrato_server_id, sync_status, id 
                ) VALUES (
                    ?, ?, ?, 'synced', 
                    (SELECT id FROM areas WHERE server_id = ?) -- Preserva o ID local
                )`,
                [
                    apiArea.id,
                    apiArea.area,
                    apiArea.contrato, // A API deve retornar o ID do contrato
                    apiArea.id // Para o subselect do ID local
                ]
            );
        }
        
        // Remove os itens marcados como 'deleted'
        await db.runAsync("DELETE FROM areas WHERE sync_status = 'deleted'");

        console.log(`📥 Banco de Áreas atualizado — total API: ${data.length} áreas`);

    } catch (err) {
        console.error("❌ Sync Áreas falhou:", err.message);
    }
}
const SOLICITANTES_ENDPOINT = 'api/v1/geral/solicitantes/';
export async function syncSolicitantes() {
    const { isConnected } = await NetInfo.fetch();
    if (!isConnected) {
        console.log('📵 Sem internet — Solicitantes sem sync agora');
        return;
    }

    const db = await getDb();
    const TABLENAME = 'solicitantes';
    const ENDPOINT = SOLICITANTES_ENDPOINT;

    try {
        console.log("📌 Sincronizando Solicitantes...");

        // 1️⃣ SYNC UP: Enviar pendentes do SQLite para API
        const pendentes = await db.getAllAsync(
            `SELECT * FROM ${TABLENAME} WHERE sync_status = 'pending'`
        );

        for (const solicitanteLocal of pendentes) {
            try {
                // Payload para a API (Django Serializer)
                const payload = {
                    solicitante: solicitanteLocal.solicitante, // Campo de dados
                    contrato_id: solicitanteLocal.contrato_server_id, 
                };

                let resp;
                
                if (solicitanteLocal.server_id) {
                    // Atualização (PUT)
                    resp = await api.put(`${ENDPOINT}${solicitanteLocal.server_id}/`, payload);
                    console.log(`☑️ Solicitante atualizado Server ID ${solicitanteLocal.server_id}: ${solicitanteLocal.solicitante}`);
                } else {
                    // Criação (POST)
                    resp = await api.post(ENDPOINT, payload);
                    console.log(`☑️ Solicitante criado Server ID ${resp.data.id}: ${solicitanteLocal.solicitante}`);
                }
                
                // Atualiza o status local
                await db.runAsync(
                    `UPDATE ${TABLENAME} SET sync_status = 'synced', server_id = ? WHERE id = ?`,
                    [resp.data.id, solicitanteLocal.id]
                );

            } catch (e) {
                console.warn(`⚠️ Falha ao enviar Solicitante pendente ${solicitanteLocal.solicitante}:`, e.message);
            }
        }

        // 2️⃣ SYNC DOWN: Buscar do servidor e atualizar SQLite
        const { data } = await api.get(ENDPOINT);

        // Marca todos os registros locais 'synced' como 'deleted'
        await db.runAsync(`UPDATE ${TABLENAME} SET sync_status = 'deleted' WHERE sync_status = 'synced'`);

        for (const apiSolicitante of data) {
            await db.runAsync(
                `INSERT OR REPLACE INTO ${TABLENAME} (
                    server_id, solicitante, contrato_server_id, sync_status, id 
                ) VALUES (
                    ?, ?, ?, 'synced', 
                    (SELECT id FROM ${TABLENAME} WHERE server_id = ?) -- Preserva o ID local
                )`,
                [
                    apiSolicitante.id,
                    apiSolicitante.solicitante,
                    apiSolicitante.contrato, // A API deve retornar o ID do contrato
                    apiSolicitante.id // Para o subselect do ID local
                ]
            );
        }
        
        // Remove os itens marcados como 'deleted'
        await db.runAsync(`DELETE FROM ${TABLENAME} WHERE sync_status = 'deleted'`);

        console.log(`📥 Banco de Solicitantes atualizado — total API: ${data.length} solicitantes`);

    } catch (err) {
        console.error("❌ Sync Solicitantes falhou:", err.message);
    }
}

const APROVADORES_ENDPOINT = 'api/v1/geral/aprovadores/'; 
export async function syncAprovadores() {
    const { isConnected } = await NetInfo.fetch();
    if (!isConnected) {
        console.log('📵 Sem internet — Aprovadores sem sync agora');
        return;
    }

    const db = await getDb();

    try {
        console.log("📌 Sincronizando Aprovadores...");

        // 1️⃣ SYNC UP: Enviar pendentes do SQLite para API
        const pendentes = await db.getAllAsync(
            "SELECT * FROM aprovadores WHERE sync_status = 'pending'"
        );

        for (const aprovadorLocal of pendentes) {
            try {
                // Payload para a API (Django Serializer)
                const payload = {
                    aprovador: aprovadorLocal.aprovador,
                    contrato_id: aprovadorLocal.contrato_server_id,
                };

                let resp;
                
                if (aprovadorLocal.server_id) {
                    // Atualização (PUT)
                    resp = await api.put(`${APROVADORES_ENDPOINT}${aprovadorLocal.server_id}/`, payload);
                    console.log(`☑️ Aprovador atualizado Server ID ${aprovadorLocal.server_id}: ${aprovadorLocal.aprovador}`);
                } else {
                    // Criação (POST)
                    resp = await api.post(APROVADORES_ENDPOINT, payload);
                    console.log(`☑️ Aprovador criado Server ID ${resp.data.id}: ${aprovadorLocal.aprovador}`);
                }
                
                // Atualiza o status local
                await db.runAsync(
                    "UPDATE aprovadores SET sync_status = 'synced', server_id = ? WHERE id = ?",
                    [resp.data.id, aprovadorLocal.id]
                );

            } catch (e) {
                console.warn(`⚠️ Falha ao enviar Aprovador pendente ${aprovadorLocal.aprovador}:`, e.message);
            }
        }

        // 2️⃣ SYNC DOWN: Buscar do servidor e atualizar SQLite
        const { data } = await api.get(APROVADORES_ENDPOINT);

        // Marca todos os registros locais 'synced' como 'deleted'
        await db.runAsync("UPDATE aprovadores SET sync_status = 'deleted' WHERE sync_status = 'synced'");

        for (const apiAprovador of data) {
            await db.runAsync(
                `INSERT OR REPLACE INTO aprovadores (
                    server_id, aprovador, contrato_server_id, sync_status, id 
                ) VALUES (
                    ?, ?, ?, 'synced', 
                    (SELECT id FROM aprovadores WHERE server_id = ?)
                )`,
                [
                    apiAprovador.id,
                    apiAprovador.aprovador,
                    apiAprovador.contrato, // A API deve retornar o ID do contrato
                    apiAprovador.id // Para o subselect do ID local
                ]
            );
        }
        
        // Remove os itens marcados como 'deleted'
        await db.runAsync("DELETE FROM aprovadores WHERE sync_status = 'deleted'");

        console.log(`📥 Banco de Aprovadores atualizado — total API: ${data.length} aprovadores`);

    } catch (err) {
        console.error("❌ Sync Aprovadores falhou:", err.message);
    }
}

const ITEM_BM_ENDPOINT = 'api/v1/geral/itens-bm/'; // Ajuste o endpoint se necessário
export async function syncItensBm() {
    const { isConnected } = await NetInfo.fetch();
    if (!isConnected) {
        console.log('📵 Sem internet — Itens BM sem sync agora');
        return;
    }

    const db = await getDb();

    try {
        console.log("📌 Sincronizando Itens BM...");

        // 1️⃣ SYNC UP: Enviar pendentes do SQLite para API
        const pendentes = await db.getAllAsync(
            "SELECT * FROM itens_bm WHERE sync_status = 'pending'"
        );

        for (const itemBmLocal of pendentes) {
            try {
                // Payload para a API (Django Serializer)
                const payload = {
                    item_ref: itemBmLocal.item_ref,
                    disciplina: itemBmLocal.disciplina,
                    descricao: itemBmLocal.descricao,
                    und: itemBmLocal.und,
                    preco_item: itemBmLocal.preco_item,
                    obs: itemBmLocal.obs,
                    data: itemBmLocal.data, // Assumindo que está em formato string (YYYY-MM-DD)
                    contrato_id: itemBmLocal.contrato_server_id,
                };

                let resp;
                
                if (itemBmLocal.server_id) {
                    // Atualização (PUT)
                    resp = await api.put(`${ITEM_BM_ENDPOINT}${itemBmLocal.server_id}/`, payload);
                    console.log(`☑️ Item BM atualizado Server ID ${itemBmLocal.server_id}: ${itemBmLocal.item_ref}`);
                } else {
                    // Criação (POST)
                    resp = await api.post(ITEM_BM_ENDPOINT, payload);
                    console.log(`☑️ Item BM criado Server ID ${resp.data.id}: ${itemBmLocal.item_ref}`);
                }
                
                // Atualiza o status local
                await db.runAsync(
                    "UPDATE itens_bm SET sync_status = 'synced', server_id = ? WHERE id = ?",
                    [resp.data.id, itemBmLocal.id]
                );

            } catch (e) {
                console.warn(`⚠️ Falha ao enviar Item BM pendente ${itemBmLocal.item_ref}:`, e.message);
            }
        }

        // 2️⃣ SYNC DOWN: Buscar do servidor e atualizar SQLite
        const { data } = await api.get(ITEM_BM_ENDPOINT);

        // Marca todos os registros locais 'synced' como 'deleted'
        await db.runAsync("UPDATE itens_bm SET sync_status = 'deleted' WHERE sync_status = 'synced'");

        for (const apiItemBm of data) {
            await db.runAsync(
                `INSERT OR REPLACE INTO itens_bm (
                    server_id, item_ref, disciplina, descricao, und, preco_item, obs, data, contrato_server_id, sync_status, id 
                ) VALUES (
                    ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced', 
                    (SELECT id FROM itens_bm WHERE server_id = ?)
                )`,
                [
                    apiItemBm.id,
                    apiItemBm.item_ref,
                    apiItemBm.disciplina,
                    apiItemBm.descricao,
                    apiItemBm.und,
                    apiItemBm.preco_item,
                    apiItemBm.obs,
                    apiItemBm.data, // Assumindo que a API retorna em formato compatível com SQLite (string)
                    apiItemBm.contrato, // A API deve retornar o ID do contrato
                    apiItemBm.id // Para o subselect do ID local
                ]
            );
        }
        
        // Remove os itens marcados como 'deleted'
        await db.runAsync("DELETE FROM itens_bm WHERE sync_status = 'deleted'");

        console.log(`📥 Banco de Itens BM atualizado — total API: ${data.length} itens.`);

    } catch (err) {
        console.error("❌ Sync Itens BM falhou:", err.message);
    }
}


const PROJETO_CODIGO_ENDPOINT = 'api/v1/planejamento/projetocodigo/';
const PROJETO_CODIGO_TABLE = 'projeto_codigos'; 
export async function syncProjetoCodigos() {
    const { isConnected } = await NetInfo.fetch();
    if (!isConnected) {
        console.log('📵 Sem internet — Códigos de Projeto sem sync agora');
        return;
    }

    const db = await getDb();

    try {
        console.log("📌 Sincronizando Códigos de Projeto...");

        // 1️⃣ SYNC UP: Enviar pendentes do SQLite para API
        const pendentes = await db.getAllAsync(
            `SELECT * FROM ${PROJETO_CODIGO_TABLE} WHERE sync_status = 'pending' OR sync_status = 'update_pending'`
        );

        for (const projetoLocal of pendentes) {
            try {
                // Payload para a API (Django Serializer)
                const payload = {
                    projeto_nome: projetoLocal.projeto_nome,
                    contrato_id: projetoLocal.contrato_server_id,
                };

                let resp;
                
                if (projetoLocal.server_id) {
                    // Atualização (PUT)
                    resp = await api.put(`${PROJETO_CODIGO_ENDPOINT}${projetoLocal.server_id}/`, payload);
                    console.log(`☑️ Código de Projeto atualizado Server ID ${projetoLocal.server_id}: ${projetoLocal.projeto_nome}`);
                } else {
                    // Criação (POST)
                    resp = await api.post(PROJETO_CODIGO_ENDPOINT, payload);
                    console.log(`☑️ Código de Projeto criado Server ID ${resp.data.id}: ${projetoLocal.projeto_nome}`);
                }
                
                // Atualiza o status local
                await db.runAsync(
                    `UPDATE ${PROJETO_CODIGO_TABLE} SET sync_status = 'synced', server_id = ? WHERE id = ?`,
                    [resp.data.id, projetoLocal.id]
                );

            } catch (e) {
                console.warn(`⚠️ Falha ao enviar Código de Projeto pendente ${projetoLocal.projeto_nome}:`, e.message);
            }
        }

        // 2️⃣ SYNC DOWN: Buscar do servidor e atualizar SQLite
        const { data } = await api.get(PROJETO_CODIGO_ENDPOINT);

        // Marca todos os registros locais 'synced' como 'deleted'
        await db.runAsync(`UPDATE ${PROJETO_CODIGO_TABLE} SET sync_status = 'deleted' WHERE sync_status = 'synced'`);

        for (const apiProjeto of data) {
            await db.runAsync(
                `INSERT OR REPLACE INTO ${PROJETO_CODIGO_TABLE} (
                    server_id, projeto_nome, contrato_server_id, sync_status, id 
                ) VALUES (
                    ?, ?, ?, 'synced', 
                    (SELECT id FROM ${PROJETO_CODIGO_TABLE} WHERE server_id = ?) -- Preserva o ID local
                )`,
                [
                    apiProjeto.id,
                    apiProjeto.projeto_nome,
                    apiProjeto.contrato_id, // Assumindo que a API retorna 'contrato_id'
                    apiProjeto.id // Para o subselect do ID local
                ]
            );
        }
        
        // Remove os itens marcados como 'deleted'
        await db.runAsync(`DELETE FROM ${PROJETO_CODIGO_TABLE} WHERE sync_status = 'deleted'`);

        console.log(`📥 Banco de Códigos de Projeto atualizado — total API: ${data.length} códigos`);

    } catch (err) {
        console.error("❌ Sync Códigos de Projeto falhou:", err.message);
    }
}
