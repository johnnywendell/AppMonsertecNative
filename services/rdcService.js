import NetInfo from '@react-native-community/netinfo';
import { api } from './api';
import { addOfflineOperation } from '../offlineQueue';

const RDC_ENDPOINT = 'api/v1/planejamento/rdc/';

export async function listarRDCs({
    page = 1,
    search = '',
} = {}) {
    const response = await api.get(RDC_ENDPOINT, {
        params: {
            page,
            search,
        },
    });

    return response.data;
}

export async function buscarRdc(serverId) {
    const response = await api.get(
        `${RDC_ENDPOINT}${serverId}/`
    );

    return response.data;
}

export async function editarRdc(serverId, dados) {
    const payload = montarPayloadRdc(dados);

    const netInfo = await NetInfo.fetch();

    const offline =
        !netInfo.isConnected ||
        netInfo.isInternetReachable === false;

    if (offline) {
        throw new Error(
            'Não é possível editar um RDC sem conexão com a internet.'
        );
    }

    const response = await api.put(
        `${RDC_ENDPOINT}${serverId}/`,
        payload
    );

    return response.data;
}

function montarPayloadRdc(dados) {
    return {
        data: dados.data,
        local: dados.local,
        tipo: dados.tipo,
        disciplina: dados.disciplina,
        clima: dados.clima,
        obs: dados.obs,
        aprovado: !!dados.aprovado,
        encarregado: dados.encarregado,
        inicio: dados.inicio,
        termino: dados.termino,

        unidade: dados.unidade,
        solicitante: dados.solicitante,
        aprovador: dados.aprovador,
        projeto_cod: dados.projeto_cod,
        AS: dados.AS,
        bm: dados.bm,

        rdcsserv: dados.rdcsserv || [],
        rdcshh: dados.rdcshh || [],
        rdcspupin: dados.rdcspupin || [],
    };
}

export async function criarRdc(dados) {

    const payload = montarPayloadRdc(dados);

    const netInfo = await NetInfo.fetch();

    const offline =
        !netInfo.isConnected ||
        netInfo.isInternetReachable === false;


    if (offline) {

        await addOfflineOperation({
            entity: 'rdc',
            operation: 'POST',
            endpoint: RDC_ENDPOINT,
            payload,
        });

        return {
            offline: true,
            pending: true,
        };
    }

    try {

        const response = await api.post(
            RDC_ENDPOINT,
            payload
        );

        return {
            offline: false,
            pending: false,
            data: response.data,
        };

    } catch (error) {

        if (!error.response) {

            await addOfflineOperation({
                entity: 'rdc',
                operation: 'POST',
                endpoint: RDC_ENDPOINT,
                payload,
            });

            return {
                offline: true,
                pending: true,
            };
        }

        throw error;
    }
}