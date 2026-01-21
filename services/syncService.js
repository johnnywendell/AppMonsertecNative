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
    // RDC
    await syncRDCs(db);

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
const RDC_ENDPOINT = 'api/v1/planejamento/rdc/';

export const syncRDCs = async (db) => {
    const netInfo = await NetInfo.fetch();
    if (!netInfo.isConnected) {
        console.log('Log: 📵 Sem internet — RDCs sem sync agora.');
        return;
    }

    if (!db) { db = await getDb(); }
    
    console.log("Log: 📌 Iniciando Sincronização de RDCs (UP & DOWN)...");

    // --- 1️⃣ SYNC UP (SQLite -> API) ---
    try {
        const rdcPendentes = await db.getAllAsync("SELECT * FROM rdc WHERE sync_status='pending'");

        if (rdcPendentes.length > 0) {
            console.log(`Log: ⬆️ Enviando ${rdcPendentes.length} RDC(s) pendente(s)...`);

            for (const rdc of rdcPendentes) {
                const method = rdc.server_id ? 'PUT' : 'POST';
                const endpoint = rdc.server_id ? `${RDC_ENDPOINT}${rdc.server_id}/` : RDC_ENDPOINT;

                try {
                    const payload = {
                        data: rdc.data,
                        local: rdc.local,
                        tipo: rdc.tipo,
                        disciplina: rdc.disciplina,
                        clima: rdc.clima,
                        obs: rdc.obs,
                        aprovado: rdc.aprovado === 1,
                        encarregado: rdc.encarregado,
                        inicio: rdc.inicio,
                        termino: rdc.termino,
                        // Foreign Keys: Garantir que enviamos o ID esperado pelo Django
                        unidade: rdc.unidade_server_id,
                        solicitante: rdc.solicitante_server_id,
                        aprovador: rdc.aprovador_server_id,
                        projeto_cod: rdc.projeto_cod_server_id,
                        AS: rdc.AS_server_id,
                        bm: rdc.bm_server_id,
                        // Nested: Limpando IDs para evitar conflito no Django
                        rdcsserv: cleanNestedIds(JSON.parse(rdc.servicos_json || '[]')),
                        rdcshh: cleanNestedIds(JSON.parse(rdc.hh_json || '[]')),
                        rdcspupin: cleanNestedIds(JSON.parse(rdc.pin_json || '[]')),
                    };

                    let response = rdc.server_id ? await api.put(endpoint, payload) : await api.post(endpoint, payload);
                    
                    // Atualiza o registro local com o ID do servidor
                    await db.runAsync(
                        "UPDATE rdc SET server_id=?, sync_status='synced', updated_at=CURRENT_TIMESTAMP WHERE id=?",
                        [response.data.id, rdc.id]
                    );
                    console.log(`Log: ✅ [RDC ID ${rdc.id}] Sincronizado com sucesso.`);

                } catch (error) {
                    console.error(`Log: ❌ Erro ao enviar RDC ${rdc.id}:`, error.response?.data || error.message);
                }
            }
        }
    } catch (err) {
        console.error("Log: ❌ Erro no Sync UP:", err.message);
    }

    // --- 2️⃣ SYNC DOWN (API -> SQLite) ---
    try {
        console.log("Log: ⬇️ Baixando dados do servidor...");
        // Buscamos a primeira página (os mais recentes)
        const response = await api.get(`${RDC_ENDPOINT}?page=1`);
        
        // Trata a paginação do Django (.results)
        const serverRDCs = response.data.results || [];
        console.log(`Log: 📡 Recebidos ${serverRDCs.length} RDCs do servidor.`);

        if (serverRDCs.length > 0) {
            const syncDownStatements = [];

            for (const apiRdc of serverRDCs) {
                // Preparamos os JSONs para salvar no SQLite
                const servicos_json = JSON.stringify(apiRdc.rdcsserv || []);
                const hh_json = JSON.stringify(apiRdc.rdcshh || []);
                const pin_json = JSON.stringify(apiRdc.rdcspupin || []);

                syncDownStatements.push({
                    sql: `INSERT OR REPLACE INTO rdc (
                            server_id, data, local, tipo, disciplina, obs, aprovado, encarregado, clima, inicio, termino, doc,
                            unidade_server_id, solicitante_server_id, aprovador_server_id, projeto_cod_server_id, AS_server_id, bm_server_id,
                            servicos_json, hh_json, pin_json, sync_status, id 
                        ) VALUES (
                            ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced', 
                            (SELECT id FROM rdc WHERE server_id = ?) 
                        )`,
                    args: [
                        apiRdc.id, apiRdc.data, apiRdc.local, apiRdc.tipo, apiRdc.disciplina, apiRdc.obs, apiRdc.aprovado ? 1 : 0, 
                        apiRdc.encarregado, apiRdc.clima, apiRdc.inicio, apiRdc.termino, apiRdc.doc,
                        // Mapeamento: O Django costuma retornar o ID direto ou objeto.id
                        apiRdc.unidade?.id || apiRdc.unidade,
                        apiRdc.solicitante?.id || apiRdc.solicitante,
                        apiRdc.aprovador?.id || apiRdc.aprovador,
                        apiRdc.projeto_cod?.id || apiRdc.projeto_cod,
                        apiRdc.AS?.id || apiRdc.AS,
                        apiRdc.bm?.id || apiRdc.bm,
                        servicos_json, hh_json, pin_json,
                        apiRdc.id // para o sub-select do ID local
                    ]
                });
            }

            // EXECUTAR O LOTE NO BANCO LOCAL
            await runBatchAsync(db, syncDownStatements);
            console.log("Log: 📥 Banco local atualizado com os dados da API.");
        }
    } catch (err) {
        console.error("Log: ❌ Sync DOWN RDC falhou:", err.response?.data || err.message);
    }

    console.log("Log: 🔄 Sincronização finalizada.");
};

const LEVANTAMENTO_ENDPOINT = 'api/v1/planejamento/levantamento/';
const LEVANTAMENTO_TABLE = 'levantamento';
const PINTURA_CHILD_KEY = 'itens_pintura'; // Nome do campo aninhado no Serializer/API
const PINTURA_JSON_COLUMN = 'itens_pintura_json'; // Nome da coluna JSON no SQLite
export const syncLevantamento = async (db) => {
    const netInfo = await NetInfo.fetch();
    if (!netInfo.isConnected) {
        console.log('Log: 📵 Sem internet — Levantamentos sem sync agora.');
        return;
    }

    if (!db) { db = await getDb(); }
    
    console.log("Log: 📌 Iniciando Sincronização de Levantamentos (UP & DOWN)...");

    // --- 1️⃣ SYNC UP (SQLite -> API) ---
    try {
        const levantamentosPendentes = await db.getAllAsync(
            `SELECT * FROM ${LEVANTAMENTO_TABLE} WHERE sync_status='pending'`
        );

        if (levantamentosPendentes.length > 0) {
            console.log(`Log: ⬆️ Enviando ${levantamentosPendentes.length} Levantamento(s) pendente(s)...`);

            for (const lvt of levantamentosPendentes) {
                const method = lvt.server_id ? 'PUT' : 'POST';
                const endpoint = lvt.server_id ? `${LEVANTAMENTO_ENDPOINT}${lvt.server_id}/` : LEVANTAMENTO_ENDPOINT;

                try {
                    const payload = {
                        data: lvt.data,
                        escopo: lvt.escopo,
                        local: lvt.local,
                        obs: lvt.obs,
                        // Foreign Keys (Mapeamento para o Django)
                        auth_serv: lvt.auth_serv_server_id,
                        unidade: lvt.unidade_server_id,
                        projeto_cod: lvt.projeto_cod_server_id,
                        // Itens aninhados com limpeza de ID local
                        [PINTURA_CHILD_KEY]: cleanNestedIds(JSON.parse(lvt[PINTURA_JSON_COLUMN] || '[]')),
                    };

                    const response = lvt.server_id 
                        ? await api.put(endpoint, payload) 
                        : await api.post(endpoint, payload);
                    
                    // Atualiza o registro local com o ID retornado do servidor
                    await db.runAsync(
                        `UPDATE ${LEVANTAMENTO_TABLE} SET server_id=?, sync_status='synced', updated_at=CURRENT_TIMESTAMP WHERE id=?`,
                        [response.data.id, lvt.id]
                    );
                    console.log(`Log: ✅ [LVT ID ${lvt.id}] Sincronizado com sucesso.`);

                } catch (error) {
                    console.error(`Log: ❌ Erro ao enviar LVT ${lvt.id}:`, error.response?.data || error.message);
                }
            }
        }
    } catch (err) {
        console.error("Log: ❌ Erro no Sync UP Levantamento:", err.message);
    }

    // --- 2️⃣ SYNC DOWN (API -> SQLite) ---
    try {
        console.log("Log: ⬇️ Baixando Levantamentos do servidor...");
        // Buscamos a primeira página para o sync padrão
        const response = await api.get(`${LEVANTAMENTO_ENDPOINT}?page=1`);
        
        // Trata a paginação do Django (.results)
        const serverLvts = response.data.results || [];
        console.log(`Log: 📡 Recebidos ${serverLvts.length} Levantamentos do servidor.`);

        if (serverLvts.length > 0) {
            const syncDownStatements = [];

            for (const apiLvt of serverLvts) {
                // Preparamos o JSON dos itens filhos
                const pintura_json = JSON.stringify(apiLvt[PINTURA_CHILD_KEY] || []);

                syncDownStatements.push({
                            sql: `INSERT OR REPLACE INTO ${LEVANTAMENTO_TABLE} (
                                    server_id, data, escopo, local, doc,
                                    auth_serv_server_id, unidade_server_id, projeto_cod_server_id,
                                    ${PINTURA_JSON_COLUMN}, sync_status, id 
                                ) VALUES (
                                    ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced', 
                                    (SELECT id FROM ${LEVANTAMENTO_TABLE} WHERE server_id = ?) 
                                )`,
                            args: [
                                apiLvt.id,
                                apiLvt.data,
                                apiLvt.escopo,
                                apiLvt.local,
                                apiLvt.doc,
                                // Foreign Keys
                                apiLvt.auth_serv?.id || apiLvt.auth_serv,
                                apiLvt.unidade?.id || apiLvt.unidade,
                                apiLvt.projeto_cod?.id || apiLvt.projeto_cod,
                                JSON.stringify(apiLvt[PINTURA_CHILD_KEY] || []),
                                apiLvt.id // para o sub-select
                            ]
                        });
            }

            await runBatchAsync(db, syncDownStatements);
            console.log("Log: 📥 Banco local de Levantamentos atualizado.");
        }
    } catch (err) {
        console.error("Log: ❌ Sync DOWN Levantamento falhou:", err.response?.data || err.message);
    }

    console.log("Log: 🔄 Sincronização de Levantamentos finalizada.");
};


const AS_ENDPOINT = 'api/v1/planejamento/as/'; // Ajuste o endpoint conforme sua API
export const syncAS = async (db) => {
    const netInfo = await NetInfo.fetch();
    if (!netInfo.isConnected) {
        console.log('Log: 📵 Sem internet — ASs sem sync agora.');
        return;
    }

    if (!db) { db = await getDb(); }
    
    console.log("Log: 📌 Iniciando Sincronização de ASs (UP & DOWN)...");

    // --- 1️⃣ SYNC UP (SQLite -> API) ---
    try {
        const asPendentes = await db.getAllAsync(
            "SELECT * FROM ass WHERE sync_status='pending' OR sync_status='update_pending'"
        );

        if (asPendentes.length > 0) {
            console.log(`Log: ⬆️ Enviando ${asPendentes.length} AS(s) pendente(s)...`);

            for (const asLocal of asPendentes) {
                const method = asLocal.server_id ? 'PUT' : 'POST';
                const endpoint = asLocal.server_id ? `${AS_ENDPOINT}${asLocal.server_id}/` : AS_ENDPOINT;

                try {
                    const payload = {
                        data: asLocal.data,
                        status_as: asLocal.status_as,
                        tipo: asLocal.tipo,
                        disciplina: asLocal.disciplina,
                        escopo: asLocal.escopo,
                        local: asLocal.local,
                        obs: asLocal.obs,
                        rev: asLocal.rev,
                        as_sap: asLocal.as_sap,
                        as_antiga: asLocal.as_antiga,
                        // Foreign Keys (Mapeamento para o que o Django espera)
                        unidade: asLocal.unidade_server_id,
                        solicitante: asLocal.solicitante_server_id,
                        aprovador: asLocal.aprovador_server_id,
                        projeto_cod: asLocal.projeto_cod_server_id,
                    };

                    const response = await api({
                        method,
                        url: endpoint,
                        data: payload
                    });
                    
                    // Atualiza o registro local com o ID do servidor
                    await db.runAsync(
                        "UPDATE ass SET server_id=?, sync_status='synced' WHERE id=?",
                        [response.data.id, asLocal.id]
                    );
                    console.log(`Log: ✅ [AS ID ${asLocal.id}] Sincronizada com sucesso.`);

                } catch (error) {
                    console.error(`Log: ❌ Erro ao enviar AS ${asLocal.id}:`, error.response?.data || error.message);
                }
            }
        }
    } catch (err) {
        console.error("Log: ❌ Erro no Sync UP AS:", err.message);
    }

    // --- 2️⃣ SYNC DOWN (API -> SQLite) ---
    try {
    console.log("Log: ⬇️ Baixando ASs do servidor...");
    const response = await api.get(`${AS_ENDPOINT}?page=1`);
    
    // O ERRO ESTAVA AQUI: O Django retorna um objeto, a lista real fica em .results
    // Adicionamos o "|| []" para garantir que seja sempre um iterável
    const serverASs = response.data.results || (Array.isArray(response.data) ? response.data : []);

    if (serverASs.length > 0) {
        const syncDownStatements = [];

        // Agora o 'for' não vai falhar, pois serverASs é garantidamente um Array
        for (const apiAs of serverASs) {
            syncDownStatements.push({
                sql: `INSERT OR REPLACE INTO ass (
                        server_id, unidade_server_id, solicitante_server_id, aprovador_server_id, projeto_cod_server_id,
                        data, status_as, tipo, disciplina, escopo, local, obs, rev, as_sap, as_antiga,
                        sync_status, id 
                    ) VALUES (
                        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced', 
                        (SELECT id FROM ass WHERE server_id = ?) 
                    )`,
                args: [
                    apiAs.id, 
                    apiAs.unidade?.id || apiAs.unidade || null,
                    apiAs.solicitante?.id || apiAs.solicitante || null,
                    apiAs.aprovador?.id || apiAs.aprovador || null,
                    apiAs.projeto_cod?.id || apiAs.projeto_cod || null,
                    apiAs.data, 
                    apiAs.status_as, 
                    apiAs.tipo, 
                    apiAs.disciplina, 
                    apiAs.escopo, 
                    apiAs.local, 
                    apiAs.obs, 
                    apiAs.rev, 
                    apiAs.as_sap, 
                    apiAs.as_antiga,
                    apiAs.id 
                ]
            });
        }

        await runBatchAsync(db, syncDownStatements);
        console.log(`Log: 📥 Banco local atualizado — ${serverASs.length} ASs sincronizadas.`);
    }
} catch (err) {
    console.error("Log: ❌ Sync DOWN AS falhou:", err.message);
}

    console.log("Log: 🔄 Sincronização de AS finalizada.");
};

const BM_ENDPOINT = 'api/v1/planejamento/boletimmedicao/';

export async function syncBoletimMedicao(dbParam = null) {
    const { isConnected } = await NetInfo.fetch();
    if (!isConnected) {
        console.log('📵 Sem internet — BMs sem sync agora');
        return;
    }

    // Garante que temos a instância do banco
    const db = dbParam || await getDb();

    try {
        console.log("📌 Iniciando Sincronização de BMs (UP & DOWN)...");

        // --- 1️⃣ SYNC UP: Enviar pendentes do SQLite para API ---
        const pendentes = await db.getAllAsync(
            "SELECT * FROM boletim_medicoes WHERE sync_status = 'pending' OR sync_status = 'update_pending'"
        );

        for (const bmLocal of pendentes) {
            try {
                const payload = {
                    periodo_inicio: bmLocal.periodo_inicio,
                    periodo_fim: bmLocal.periodo_fim,
                    status_pgt: bmLocal.status_pgt,
                    status_med: bmLocal.status_med,
                    d_numero: bmLocal.d_numero,
                    d_data: bmLocal.d_data,
                    d_status: bmLocal.d_status,
                    b_numero: bmLocal.b_numero,
                    b_data: bmLocal.b_data,
                    b_status: bmLocal.b_status,
                    descricao: bmLocal.descricao,
                    valor: bmLocal.valor,
                    follow_up: bmLocal.follow_up,
                    rev: bmLocal.rev,
                    // Foreign Keys
                    unidade_id: bmLocal.unidade_server_id,
                    projeto_cod: bmLocal.projeto_cod_server_id,
                    d_aprovador: bmLocal.d_aprovador_server_id,
                    b_aprovador: bmLocal.b_aprovador_server_id,
                };

                let resp;
                if (bmLocal.server_id) {
                    resp = await api.put(`${BM_ENDPOINT}${bmLocal.server_id}/`, payload);
                } else {
                    resp = await api.post(BM_ENDPOINT, payload);
                }

                await db.runAsync(
                    "UPDATE boletim_medicoes SET sync_status = 'synced', server_id = ? WHERE id = ?",
                    [resp.data.id, bmLocal.id]
                );
                console.log(`✅ BM ID Local ${bmLocal.id} sincronizado.`);

            } catch (e) {
                console.warn(`⚠️ Falha ao enviar BM ID ${bmLocal.id}:`, e.response?.data || e.message);
            }
        }

        // --- 2️⃣ SYNC DOWN: Buscar do servidor (com paginação) ---
        console.log("📥 Baixando BMs do servidor...");
        
        // Se você quiser buscar uma pesquisa específica, pode passar como parâmetro: 
        // ex: api.get(`${BM_ENDPOINT}?page=1&search=${termo}`)
        const response = await api.get(`${BM_ENDPOINT}?page=1`);

        // Ajuste para Paginação: Pega .results ou o array direto
        const serverBMs = response.data.results || (Array.isArray(response.data) ? response.data : []);

        if (serverBMs.length > 0) {
            // Opcional: Marcar como 'deleted' para limpeza (conforme seu código original)
            await db.runAsync("UPDATE boletim_medicoes SET sync_status = 'deleted' WHERE sync_status = 'synced'");

            await db.withTransactionAsync(async () => {
                for (const apiBm of serverBMs) {
                    await db.runAsync(
                        `INSERT OR REPLACE INTO boletim_medicoes (
                            server_id, unidade_server_id, projeto_cod_server_id, d_aprovador_server_id, b_aprovador_server_id,
                            periodo_inicio, periodo_fim, status_pgt, status_med, d_numero, d_data, d_status, b_numero, b_data, b_status,
                            descricao, valor, follow_up, rev, sync_status, id 
                        ) VALUES (
                            ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced', 
                            (SELECT id FROM boletim_medicoes WHERE server_id = ?) 
                        )`,
                        [
                            apiBm.id, 
                            apiBm.unidade?.id || apiBm.unidade || null,
                            apiBm.projeto_cod?.id || apiBm.projeto_cod || null,
                            apiBm.d_aprovador?.id || apiBm.d_aprovador || null,
                            apiBm.b_aprovador?.id || apiBm.b_aprovador || null,
                            apiBm.periodo_inicio, apiBm.periodo_fim, apiBm.status_pgt, apiBm.status_med, 
                            apiBm.d_numero, apiBm.d_data, apiBm.d_status, apiBm.b_numero, apiBm.b_data, apiBm.b_status,
                            apiBm.descricao, apiBm.valor, apiBm.follow_up, apiBm.rev,
                            apiBm.id // para o SELECT id interno
                        ]
                    );
                }
            });

            // Remove os itens que não vieram na última resposta da API (opcional, cuidado com paginação aqui)
            await db.runAsync("DELETE FROM boletim_medicoes WHERE sync_status = 'deleted'");
            
            console.log(`📥 Banco local atualizado — ${serverBMs.length} BMs processados.`);
        }

    } catch (err) {
        console.error("❌ Sync BMs falhou:", err.message);
    }
}


async function syncRelatorios(db) {
    const netInfo = await NetInfo.fetch();
    if (!netInfo.isConnected) return;

    try {
        // 1. ENVIAR PENDENTES (Local -> Servidor)
        const locais = await db.getAllAsync("SELECT * FROM relatorios WHERE sync_status = 'pending'");

        for (const item of locais) {
            try {
                // Buscamos os dados vinculados
                const eLocais = await db.getAllAsync("SELECT * FROM etapas_pintura WHERE relatorio_id = ?", [item.id]);
                const fLocais = await db.getAllAsync("SELECT * FROM photos WHERE relatorio_id = ?", [item.id]);

                const payload = {
                    ...item,
                    // Garantimos que enviamos arrays, mesmo que vazios
                    relatorios: (eLocais || []).map(e => ({
                        tinta: e.tinta,
                        // ... adicione os outros campos aqui
                        pintor: e.pintor
                    })),
                    relatorio: (fLocais || []).map(f => ({ photo: f.photo_path }))
                };

                // Limpamos campos que o Django não aceita no POST
                delete payload.id;
                delete payload.sync_status;
                delete payload.server_id;

                await api.post('api/v1/qualidade/relatorios/', payload);
                
                // Marcar como sincronizado
                await db.runAsync('UPDATE relatorios SET sync_status = "synced" WHERE id = ?', [item.id]);
            } catch (err) {
                console.error("Erro ao subir item:", item.id, err.message);
            }
        }

        // 2. DOWNLOAD (Servidor -> Local)
        const response = await api.get('api/v1/qualidade/relatorios/');
        // IMPORTANTE: O Django Rest Framework com paginação coloca a lista em .results
        const vindosDoServidor = response.data.results || [];

        // Limpar locais sincronizados antes de repopular
        await db.runAsync('DELETE FROM relatorios WHERE sync_status = "synced"');

        for (const srv of vindosDoServidor) {
            // Inserir Relatório Pai
            await db.runAsync(
                `INSERT INTO relatorios (id, cliente, data, sync_status, server_id) VALUES (?, ?, ?, ?, ?)`,
                [srv.id, srv.cliente, srv.data, 'synced', srv.id]
            );

            // AQUI ESTÁ O PULO DO GATO:
            // O Serializer chama de 'relatorios' as ETAPAS.
            const listaEtapas = srv.relatorios || []; // Se vier undefined, vira array vazio
            for (const etapa of listaEtapas) {
                await db.runAsync(
                    `INSERT INTO etapas_pintura (relatorio_id, tinta, sync_status) VALUES (?, ?, ?)`,
                    [srv.id, etapa.tinta, 'synced']
                );
            }

            // O Serializer chama de 'relatorio' as FOTOS.
            const listaFotos = srv.relatorio || []; 
            for (const foto of listaFotos) {
                await db.runAsync(
                    `INSERT INTO photos (relatorio_id, photo_path, sync_status) VALUES (?, ?, ?)`,
                    [srv.id, foto.photo, 'synced']
                );
            }
        }
        
    } catch (error) {
        console.error('Erro geral no Sync:', error.message);
    }
}

async function syncChecklists(db) {
    // Implementação semelhante
}

async function syncRelatoriosGarantia(db) {
    // Implementação semelhante
}