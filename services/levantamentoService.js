import NetInfo from '@react-native-community/netinfo';
import { api } from './api';
import { addOfflineOperation } from '../offlineQueue';

const LVT_ENDPOINT = 'api/v1/planejamento/levantamento/';

export async function listarLevantamentos({ page = 1, search = '' } = {}) {
    const response = await api.get(LVT_ENDPOINT, { params: { page, search } });
    return response.data;
}

export async function buscarLevantamento(serverId) {
    const response = await api.get(`${LVT_ENDPOINT}${serverId}/`);
    return response.data;
}

export async function editarLevantamento(serverId, dados) {
    const payload = montarPayloadLevantamento(dados);
    const netInfo = await NetInfo.fetch();

    const offline = !netInfo.isConnected || netInfo.isInternetReachable === false;
    if (offline) {
        throw new Error('Não é possível editar um Levantamento sem conexão com a internet.');
    }

    const response = await api.put(`${LVT_ENDPOINT}${serverId}/`, payload);
    return response.data;
}

function montarPayloadLevantamento(dados) {
    return {
        auth_serv: dados.auth_serv || null,
        data: dados.data,
        unidade: dados.unidade || null,
        projeto_cod: dados.projeto_cod || null,
        escopo: dados.escopo || null,
        local: dados.local || null,
        doc: dados.doc || null,
        itens_pintura: dados.itens_pintura || [],
    };
}

export async function criarLevantamento(dados) {
    const payload = montarPayloadLevantamento(dados);
    const netInfo = await NetInfo.fetch();

    const offline = !netInfo.isConnected || netInfo.isInternetReachable === false;

    if (offline) {
        await addOfflineOperation({
            entity: 'levantamento',
            operation: 'POST',
            endpoint: LVT_ENDPOINT,
            payload,
        });

        return { offline: true, pending: true };
    }

    try {
        const response = await api.post(LVT_ENDPOINT, payload);
        return { offline: false, pending: false, data: response.data };
    } catch (error) {
        if (!error.response) {
            await addOfflineOperation({
                entity: 'levantamento',
                operation: 'POST',
                endpoint: LVT_ENDPOINT,
                payload,
            });

            return { offline: true, pending: true };
        }

        throw error;
    }
}