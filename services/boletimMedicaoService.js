import NetInfo from '@react-native-community/netinfo';
import { api } from './api';
import { addOfflineOperation } from '../offlineQueue';

const BM_ENDPOINT = 'api/v1/planejamento/boletimmedicao/';

export async function listarBoletinsMedicao({ page = 1, search = '' } = {}) {
    const response = await api.get(BM_ENDPOINT, { params: { page, search } });
    return response.data;
}

export async function buscarBoletimMedicao(serverId) {
    const response = await api.get(`${BM_ENDPOINT}${serverId}/`);
    return response.data;
}

export async function editarBoletimMedicao(serverId, dados) {
    const payload = montarPayloadBoletimMedicao(dados);
    const netInfo = await NetInfo.fetch();

    const offline = !netInfo.isConnected || netInfo.isInternetReachable === false;
    if (offline) throw new Error('Não é possível editar um Boletim de Medição sem conexão com a internet.');

    const response = await api.put(`${BM_ENDPOINT}${serverId}/`, payload);
    return response.data;
}

function montarPayloadBoletimMedicao(dados) {
    return {
        periodo_inicio: dados.periodo_inicio,
        periodo_fim: dados.periodo_fim,
        status_pgt: dados.status_pgt || null,
        status_med: dados.status_med || null,

        d_numero: dados.d_numero || null,
        d_data: dados.d_data || null,
        d_status: dados.d_status || null,

        b_numero: dados.b_numero || null,
        b_data: dados.b_data || null,
        b_status: dados.b_status || null,

        descricao: dados.descricao,
        valor: dados.valor !== '' && dados.valor !== null && dados.valor !== undefined
            ? Number(dados.valor)
            : null,

        follow_up: dados.follow_up || null,
        rev: dados.rev !== '' && dados.rev !== null && dados.rev !== undefined
            ? Number(dados.rev)
            : 0,

        unidade_id: dados.unidade || null,
        projeto_cod_id: dados.projeto_cod || null,
        d_aprovador_id: dados.d_aprovador || null,
        b_aprovador_id: dados.b_aprovador || null,
    };
}

export async function criarBoletimMedicao(dados) {
    const payload = montarPayloadBoletimMedicao(dados);
    const netInfo = await NetInfo.fetch();

    const offline = !netInfo.isConnected || netInfo.isInternetReachable === false;

    if (offline) {
        await addOfflineOperation({
            entity: 'boletim_medicao',
            operation: 'POST',
            endpoint: BM_ENDPOINT,
            payload,
        });

        return { offline: true, pending: true };
    }

    try {
        const response = await api.post(BM_ENDPOINT, payload);
        return { offline: false, pending: false, data: response.data };
    } catch (error) {
        if (!error.response) {
            await addOfflineOperation({
                entity: 'boletim_medicao',
                operation: 'POST',
                endpoint: BM_ENDPOINT,
                payload,
            });

            return { offline: true, pending: true };
        }

        throw error;
    }
}