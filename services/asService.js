import NetInfo from '@react-native-community/netinfo';
import { api } from './api';
import { addOfflineOperation } from '../offlineQueue';

const AS_ENDPOINT = 'api/v1/planejamento/as/';

export async function listarASs({ page = 1, search = '' } = {}) {
    const response = await api.get(AS_ENDPOINT, { params: { page, search } });
    return response.data;
}

export async function buscarAS(serverId) {
    const response = await api.get(`${AS_ENDPOINT}${serverId}/`);
    return response.data;
}

export async function editarAS(serverId, dados) {
    const payload = montarPayloadAS(dados);
    const netInfo = await NetInfo.fetch();

    const offline = !netInfo.isConnected || netInfo.isInternetReachable === false;
    if (offline) throw new Error('Não é possível editar uma AS sem conexão com a internet.');

    const response = await api.put(`${AS_ENDPOINT}${serverId}/`, payload);
    return response.data;
}

function montarPayloadAS(dados) {
    return {
        data: dados.data,
        tipo: dados.tipo,
        disciplina: dados.disciplina,
        escopo: dados.escopo || null,
        local: dados.local || null,
        obs: dados.obs || null,
        rev: dados.rev !== '' && dados.rev !== null && dados.rev !== undefined ? Number(dados.rev) : 0,
        as_sap: dados.as_sap || null,
        as_antiga: dados.as_antiga || null,
        status_as: dados.status_as,

        unidade_id: dados.unidade || null,
        solicitante_id: dados.solicitante,
        aprovador_id: dados.aprovador || null,
        projeto_cod_id: dados.projeto_cod || null,
    };
}

export async function criarAS(dados) {
    const payload = montarPayloadAS(dados);
    const netInfo = await NetInfo.fetch();

    const offline = !netInfo.isConnected || netInfo.isInternetReachable === false;

    if (offline) {
        await addOfflineOperation({
            entity: 'as',
            operation: 'POST',
            endpoint: AS_ENDPOINT,
            payload,
        });

        return { offline: true, pending: true };
    }

    try {
        const response = await api.post(AS_ENDPOINT, payload);
        return { offline: false, pending: false, data: response.data };
    } catch (error) {
        if (!error.response) {
            await addOfflineOperation({
                entity: 'as',
                operation: 'POST',
                endpoint: AS_ENDPOINT,
                payload,
            });

            return { offline: true, pending: true };
        }

        throw error;
    }
}