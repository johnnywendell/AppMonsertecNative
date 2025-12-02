import { api } from './api';
import { getDb } from '../database';
import { criarRelatorioLocal } from './relatorioQualidadeService';
import NetInfo from '@react-native-community/netinfo';

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
    await syncColaboradores();
    // Solicitantes
    await syncSolicitantes();

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



async function syncRelatorios(db) {
    const netInfo = await NetInfo.fetch();
    if (!netInfo.isConnected) {
        console.log('Sem conexão, sincronização de relatórios adiada');
        return;
    }

    try {
        // Sincronizar relatórios pendentes
        const pendingRelatorios = await db.getAllAsync(
            `SELECT * FROM relatorios WHERE sync_status = 'pending'`
        );

        for (const relatorio of pendingRelatorios) {
            try {
                const etapas = await db.getAllAsync(
                    'SELECT * FROM etapas_pintura WHERE relatorio_id = ? AND sync_status = "pending"',
                    [relatorio.id]
                );
                const fotos = await db.getAllAsync(
                    'SELECT * FROM photos WHERE relatorio_id = ? AND sync_status = "pending"',
                    [relatorio.id]
                );

                // supondo que serverRelatorio.unidade é server-side id (ex: 123)
                let unidadeLocalId = null;

                if (serverRelatorio.unidade) {
                    // tenta por server_id (se a coluna existir)
                    try {
                        const areaByServer = await db.getFirstAsync('SELECT id FROM areas WHERE server_id = ?', [serverRelatorio.unidade]);
                        if (areaByServer) unidadeLocalId = areaByServer.id;
                    } catch (e) {
                        // provavelmente coluna server_id não existe — ignoramos esse erro
                    }

                    if (!unidadeLocalId) {
                        // tenta pelo nome: pega a área do servidor (caso não esteja no cache, buscamos online)
                        let serverAreasJson = await AsyncStorage.getItem('@server_areas');
                        let serverAreas = serverAreasJson ? JSON.parse(serverAreasJson) : null;

                        if (!serverAreas) {
                            // tenta buscar do servidor (se estiver online)
                            try {
                                const { data } = await api.get('api/v1/geral/areas/');
                                serverAreas = data;
                                await AsyncStorage.setItem('@server_areas', JSON.stringify(serverAreas));
                            } catch (err) {
                                console.warn('Não foi possível buscar áreas do servidor para mapear unidadeLocalId:', err?.message || err);
                                serverAreas = [];
                            }
                        }

                        const found = serverAreas.find(a => a.id === serverRelatorio.unidade);
                        if (found) {
                            // mapear para id local por nome
                            const local = await db.getFirstAsync('SELECT id FROM areas WHERE nome = ?', [found.nome]);
                            if (local) unidadeLocalId = local.id;
                        }
                    }
                }


                const payload = {
                    cliente: relatorio.cliente || null,
                    data: relatorio.data || null,
                    rec: relatorio.rec || null,
                    nota: relatorio.nota || null,
                    tag: relatorio.tag || null,
                    tipo_serv: relatorio.tipo_serv || null,
                    unidade: unidadeServerId,
                    contrato: relatorio.contrato || null,
                    setor: relatorio.setor || null,
                    corrosividade: relatorio.corrosividade || null,
                    fiscal: relatorio.fiscal || null,
                    inspetor: relatorio.inspetor || null,
                    inicio: relatorio.inicio || null,
                    termino: relatorio.termino || null,
                    tratamento: relatorio.tratamento || null,
                    tipo_subs: relatorio.tipo_subs || null,
                    temp_ambiente: relatorio.temp_ambiente || null,
                    ura: relatorio.ura || null,
                    po: relatorio.po || null,
                    temp_super: relatorio.temp_super || null,
                    intemperismo: relatorio.intemperismo || null,
                    descontaminacao: relatorio.descontaminacao || null,
                    poeira_tam: relatorio.poeira_tam || null,
                    poeira_quant: relatorio.poeira_quant || null,
                    teor_sais: relatorio.teor_sais || null,
                    ambiente_pintura: relatorio.ambiente_pintura || null,
                    rugosidade: relatorio.rugosidade || null,
                    laudo: !!relatorio.laudo,
                    rnc_n: !!relatorio.rnc_n,
                    obs_inst: relatorio.obs_inst || null,
                    obs_final: relatorio.obs_final || null,
                    aprovado: !!relatorio.aprovado,
                    m2: relatorio.m2 || null,
                    checklist_n: relatorio.checklist_n || null,
                    relatorios: etapas.map(etapa => ({
                        tinta: etapa.tinta || null,
                        lote_a: etapa.lote_a || null,
                        val_a: etapa.val_a || null,
                        lote_b: etapa.lote_b || null,
                        val_b: etapa.val_b || null,
                        lote_c: etapa.lote_c || null,
                        val_c: etapa.val_c || null,
                        cor_munsell: etapa.cor_munsell || null,
                        temp_amb: etapa.temp_amb || null,
                        ura: etapa.ura || null,
                        po: etapa.po || null,
                        temp_substrato: etapa.temp_substrato || null,
                        diluente: etapa.diluente || null,
                        met_aplic: etapa.met_aplic || null,
                        inicio: etapa.inicio || null,
                        termino: etapa.termino || null,
                        inter_repintura: etapa.inter_repintura || null,
                        epe: etapa.epe || null,
                        eps: etapa.eps || null,
                        insp_visual: etapa.insp_visual || null,
                        aderencia: etapa.aderencia || null,
                        holiday: etapa.holiday || null,
                        laudo: etapa.laudo || null,
                        data_insp: etapa.data_insp || null,
                        pintor: etapa.pintor || null,
                    })),
                    relatorio: fotos.map(f => ({ photo: f.photo_path })),
                };

                const response = await api.post('api/v1/qualidade/relatorios/', payload);
                const serverId = response.data.id;

                await db.runAsync(
                    'UPDATE relatorios SET sync_status = "synced", server_id = ? WHERE id = ?',
                    [serverId, relatorio.id]
                );
                for (const etapa of etapas) {
                    await db.runAsync(
                        'UPDATE etapas_pintura SET sync_status = "synced" WHERE id = ?',
                        [etapa.id]
                    );
                }
                for (const foto of fotos) {
                    await db.runAsync(
                        'UPDATE photos SET sync_status = "synced" WHERE id = ?',
                        [foto.id]
                    );
                }
                console.log(`Relatório ${relatorio.id} sincronizado com server_id ${serverId}`);
            } catch (error) {
                console.error(`Erro ao sincronizar relatório ${relatorio.id}:`, error.message);
            }
        }

        // Sincronizar relatórios do servidor
        const { data: serverRelatorios } = await api.get('api/v1/qualidade/relatorios/');
        await db.runAsync('DELETE FROM relatorios WHERE sync_status = "synced"');
        await db.runAsync('DELETE FROM etapas_pintura WHERE sync_status = "synced"');
        await db.runAsync('DELETE FROM photos WHERE sync_status = "synced"');

        for (const serverRelatorio of serverRelatorios) {
            let unidadeLocalId = null;
            if (serverRelatorio.unidade) {
                const area = await db.getFirstAsync(
                    'SELECT id FROM areas WHERE server_id = ?',
                    [serverRelatorio.unidade]
                );
                unidadeLocalId = area ? area.id : null;
            }

            const result = await db.runAsync(
                `INSERT INTO relatorios (
                    id, cliente, data, rec, nota, tag, tipo_serv, unidade, contrato, setor,
                    corrosividade, fiscal, inspetor, inicio, termino, tratamento, tipo_subs,
                    temp_ambiente, ura, po, temp_super, intemperismo, descontaminacao,
                    poeira_tam, poeira_quant, teor_sais, ambiente_pintura, rugosidade,
                    laudo, rnc_n, obs_inst, obs_final, aprovado, m2, checklist_n, sync_status, server_id
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    serverRelatorio.id,
                    serverRelatorio.cliente || null,
                    serverRelatorio.data || null,
                    serverRelatorio.rec || null,
                    serverRelatorio.nota || null,
                    serverRelatorio.tag || null,
                    serverRelatorio.tipo_serv || null,
                    unidadeLocalId,
                    serverRelatorio.contrato || null,
                    serverRelatorio.setor || null,
                    serverRelatorio.corrosividade || null,
                    serverRelatorio.fiscal || null,
                    serverRelatorio.inspetor || null,
                    serverRelatorio.inicio || null,
                    serverRelatorio.termino || null,
                    serverRelatorio.tratamento || null,
                    serverRelatorio.tipo_subs || null,
                    serverRelatorio.temp_ambiente || null,
                    serverRelatorio.ura || null,
                    serverRelatorio.po || null,
                    serverRelatorio.temp_super || null,
                    serverRelatorio.intemperismo || null,
                    serverRelatorio.descontaminacao || null,
                    serverRelatorio.poeira_tam || null,
                    serverRelatorio.poeira_quant || null,
                    serverRelatorio.teor_sais || null,
                    serverRelatorio.ambiente_pintura || null,
                    serverRelatorio.rugosidade || null,
                    serverRelatorio.laudo ? 1 : 0,
                    serverRelatorio.rnc_n ? 1 : 0,
                    serverRelatorio.obs_inst || null,
                    serverRelatorio.obs_final || null,
                    serverRelatorio.aprovado ? 1 : 0,
                    serverRelatorio.m2 || null,
                    serverRelatorio.checklist_n || null,
                    'synced',
                    serverRelatorio.id,
                ]
            );

            const relatorioId = result.lastInsertRowId || serverRelatorio.id;

            for (const etapa of serverRelatorio.relatorios || []) {
                await db.runAsync(
                    `INSERT INTO etapas_pintura (
                        relatorio_id, tinta, lote_a, val_a, lote_b, val_b, lote_c, val_c,
                        cor_munsell, temp_amb, ura, po, temp_substrato, diluente, met_aplic,
                        inicio, termino, inter_repintura, epe, eps, insp_visual, aderencia,
                        holiday, laudo, data_insp, pintor, sync_status
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        relatorioId,
                        etapa.tinta || null,
                        etapa.lote_a || null,
                        etapa.val_a || null,
                        etapa.lote_b || null,
                        etapa.val_b || null,
                        etapa.lote_c || null,
                        etapa.val_c || null,
                        etapa.cor_munsell || null,
                        etapa.temp_amb || null,
                        etapa.ura || null,
                        etapa.po || null,
                        etapa.temp_substrato || null,
                        etapa.diluente || null,
                        etapa.met_aplic || null,
                        etapa.inicio || null,
                        etapa.termino || null,
                        etapa.inter_repintura || null,
                        etapa.epe || null,
                        etapa.eps || null,
                        etapa.insp_visual || null,
                        etapa.aderencia || null,
                        etapa.holiday || null,
                        etapa.laudo || null,
                        etapa.data_insp || null,
                        etapa.pintor || null,
                        'synced'
                    ]
                );
            }

            for (const foto of serverRelatorio.relatorio || []) {
                await db.runAsync(
                    `INSERT INTO photos (relatorio_id, photo_path, sync_status) VALUES (?, ?, ?)`,
                    [relatorioId, foto.photo, 'synced']
                );
            }
        }
    } catch (error) {
        console.error('Erro ao sincronizar relatórios:', error.message);
    }
}

async function syncChecklists(db) {
    // Implementação semelhante
}

async function syncRelatoriosGarantia(db) {
    // Implementação semelhante
}