import NetInfo from '@react-native-community/netinfo';

import { api } from './api';
import { addOfflineOperation } from '../offlineQueue';


const APONTAMENTO_ENDPOINT =
    'api/v1/efetivo/apontamentos/';


// =========================================================
// PAYLOAD
// =========================================================

function montarPayloadApontamento(dados) {

    return {

        data:
            dados.data || null,

        area:
            dados.area || null,

        projeto_cod:
            dados.projeto_cod || null,

        disciplina:
            dados.disciplina || '',

        obs:
            dados.obs || '',

        apontamentos:
            (dados.apontamentos || []).map(
                item => ({

                    colaborador:
                        item.colaborador || null,

                    status:
                        item.status || '',

                    lider:
                        String(
                            item.lider ?? '0'
                        ),
                })
            ),
    };
}


// =========================================================
// LISTAR
// =========================================================

export async function listarApontamentos({
    page = 1,
    search = '',
} = {}) {

    const response = await api.get(
        APONTAMENTO_ENDPOINT,
        {
            params: {
                page,
                search,
            },
        }
    );

    return response.data;
}


// =========================================================
// BUSCAR POR ID
// =========================================================

export async function buscarApontamentoPorId(
    id
) {

    const response = await api.get(
        `${APONTAMENTO_ENDPOINT}${id}/`
    );

    return response.data;
}


// =========================================================
// CRIAR
// =========================================================

export async function criarApontamento(
    dados
) {

    const payload =
        montarPayloadApontamento(dados);


    const netInfo =
        await NetInfo.fetch();


    const offline =
        !netInfo.isConnected ||
        netInfo.isInternetReachable === false;


    // -----------------------------------------------------
    // OFFLINE CONHECIDO
    // -----------------------------------------------------

    if (offline) {

        await addOfflineOperation({

            entity:
                'apontamento',

            operation:
                'POST',

            endpoint:
                APONTAMENTO_ENDPOINT,

            payload,
        });


        return {

            offline: true,

            pending: true,
        };
    }


    // -----------------------------------------------------
    // ONLINE
    // -----------------------------------------------------

    try {

        const response =
            await api.post(
                APONTAMENTO_ENDPOINT,
                payload
            );


        return {

            offline: false,

            pending: false,

            data:
                response.data,
        };

    } catch (error) {

        // -------------------------------------------------
        // ERRO DE TRANSPORTE
        //
        // NetInfo podia dizer online e a conexão cair
        // antes do POST.
        // -------------------------------------------------

        if (!error.response) {

            await addOfflineOperation({

                entity:
                    'apontamento',

                operation:
                    'POST',

                endpoint:
                    APONTAMENTO_ENDPOINT,

                payload,
            });


            return {

                offline: true,

                pending: true,
            };
        }


        // -------------------------------------------------
        // ERRO HTTP
        //
        // 400, 403, 500 etc.
        // NÃO entra na fila.
        // -------------------------------------------------

        console.error(
            'Erro ao criar apontamento:',
            error.response?.data ||
            error.message
        );


        if (
            error.response?.status === 403
        ) {

            throw new Error(
                'Você não tem permissão para criar apontamentos.'
            );
        }


        throw error;
    }
}


// =========================================================
// EDITAR
// =========================================================

export async function editarApontamento(
    id,
    dados
) {

    const netInfo =
        await NetInfo.fetch();


    const offline =
        !netInfo.isConnected ||
        netInfo.isInternetReachable === false;


    if (offline) {

        throw new Error(
            'Não é possível editar um Apontamento sem conexão com a internet.'
        );
    }


    const payload =
        montarPayloadApontamento(dados);


    try {

        const response =
            await api.put(
                `${APONTAMENTO_ENDPOINT}${id}/`,
                payload
            );


        return response.data;

    } catch (error) {

        console.error(
            'Erro ao editar apontamento:',
            error.response?.data ||
            error.message
        );


        if (
            error.response?.status === 403
        ) {

            throw new Error(
                'Você não tem permissão para atualizar apontamentos.'
            );
        }


        throw error;
    }
}