import NetInfo from '@react-native-community/netinfo';
import * as FileSystem from 'expo-file-system/legacy';

import { api } from './api';
import { addOfflineOperation } from '../offlineQueue';

const CHECKLIST_ENDPOINT =
    'api/v1/qualidade/checklists/';


// =========================================================
// LISTAR
// =========================================================

export async function listarChecklists({
    page = 1,
    search = '',
} = {}) {

    const response = await api.get(
        CHECKLIST_ENDPOINT,
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
// BUSCAR
// =========================================================

export async function buscarChecklistPorId(id) {

    const response = await api.get(
        `${CHECKLIST_ENDPOINT}${id}/`
    );

    return response.data;
}

// =========================================================
// FOTOS
// =========================================================

async function arquivoParaBase64(uri) {

    return await FileSystem.readAsStringAsync(
        uri,
        {
            encoding:
                FileSystem.EncodingType.Base64,
        }
    );
}


async function processarFotosCriacao(
    fotos = []
) {

    const resultado = [];

    for (const foto of fotos || []) {

        const photo =
            foto?.photo ?? foto;

        if (!photo) {
            continue;
        }


        // ---------------------------------------------
        // Formato:
        // { photo: { uri: 'file://...' } }
        // ---------------------------------------------

        if (
            typeof photo === 'object' &&
            photo.uri
        ) {

            const base64 =
                await arquivoParaBase64(
                    photo.uri
                );

            resultado.push({
                photo:
                    `data:image/jpeg;base64,${base64}`
            });

            continue;
        }


        if (
            typeof photo !== 'string'
        ) {
            continue;
        }


        // ---------------------------------------------
        // Já convertido
        // ---------------------------------------------

        if (
            photo.startsWith(
                'data:image'
            )
        ) {

            resultado.push({
                photo
            });

            continue;
        }


        // ---------------------------------------------
        // Arquivo local
        // ---------------------------------------------

        if (
            photo.startsWith('file://') ||
            photo.startsWith('content://')
        ) {

            const base64 =
                await arquivoParaBase64(
                    photo
                );

            resultado.push({
                photo:
                    `data:image/jpeg;base64,${base64}`
            });

            continue;
        }


        // ---------------------------------------------
        // URL remota
        //
        // Na criação não deveria acontecer,
        // mas se acontecer não reenviamos.
        // ---------------------------------------------

        if (
            photo.startsWith('http://') ||
            photo.startsWith('https://') ||
            photo.startsWith('/media/') ||
            photo.startsWith(
                '/geral/api/media/'
            )
        ) {
            continue;
        }


        // ---------------------------------------------
        // Base64 puro
        // ---------------------------------------------

        resultado.push({
            photo:
                `data:image/jpeg;base64,${photo}`
        });
    }

    return resultado;
}


async function processarFotosEdicao(
    fotos = []
) {

    const resultado = [];

    for (const foto of fotos || []) {

        const photo =
            foto?.photo ?? foto;

        if (!photo) {
            continue;
        }


        // ---------------------------------------------
        // FOTO JÁ EXISTENTE NO SERVIDOR
        //
        // NÃO reenviar.
        //
        // O update do Django NÃO apaga as fotos
        // antigas, apenas adiciona as recebidas.
        // ---------------------------------------------

        if (
            typeof photo === 'string' &&
            (
                photo.startsWith('http://') ||
                photo.startsWith('https://') ||
                photo.startsWith('/media/') ||
                photo.startsWith(
                    '/geral/api/media/'
                )
            )
        ) {
            continue;
        }


        // ---------------------------------------------
        // NOVA FOTO
        // { photo: { uri } }
        // ---------------------------------------------

        if (
            typeof photo === 'object' &&
            photo.uri
        ) {

            const base64 =
                await arquivoParaBase64(
                    photo.uri
                );

            resultado.push({
                photo:
                    `data:image/jpeg;base64,${base64}`
            });

            continue;
        }


        if (
            typeof photo !== 'string'
        ) {
            continue;
        }


        // ---------------------------------------------
        // Já veio como Data URL
        // ---------------------------------------------

        if (
            photo.startsWith(
                'data:image'
            )
        ) {

            resultado.push({
                photo
            });

            continue;
        }


        // ---------------------------------------------
        // Arquivo local
        // ---------------------------------------------

        if (
            photo.startsWith('file://') ||
            photo.startsWith('content://')
        ) {

            const base64 =
                await arquivoParaBase64(
                    photo
                );

            resultado.push({
                photo:
                    `data:image/jpeg;base64,${base64}`
            });

            continue;
        }


        // ---------------------------------------------
        // Base64 puro
        // ---------------------------------------------

        resultado.push({
            photo:
                `data:image/jpeg;base64,${photo}`
        });
    }

    return resultado;
}
// =========================================================
// PAYLOAD
// =========================================================
async function montarPayloadChecklist(
    dados,
    isEditing = false
) {

    const fotos =
        isEditing
            ? await processarFotosEdicao(
                dados.checklistcarimbo || []
            )
            : await processarFotosCriacao(
                dados.checklistcarimbo || []
            );


    const payload = {

        cliente:
            dados.cliente || '',

        tag:
            dados.tag || '',

        unidade:
            dados.unidade || null,

        data:
            dados.data || null,

        rec:
            dados.rec || '',

        nota:
            dados.nota || '',

        setor:
            dados.setor || '',

        tipo_serv:
            dados.tipo_serv || '',

        m2:
            dados.m2 !== '' &&
            dados.m2 !== null &&
            dados.m2 !== undefined
                ? Number(
                    String(
                        dados.m2
                    ).replace(',', '.')
                )
                : null,

        esquema_pintura:
            dados.esquema_pintura || '',

        tratamento:
            dados.tratamento || '',

        laudo:
            !!dados.laudo,

        rnc_n:
            !!dados.rnc_n,

        obs_final:
            dados.obs_final || '',

        aprovado:
            !!dados.aprovado,

        calha_utec:
            dados.calha_utec || '',

        guia_pc:
            dados.guia_pc || '',

        fita_protec:
            dados.fita_protec || '',

        trecho_rec:
            dados.trecho_rec || '',

        elastomero:
            dados.elastomero || '',

        volante_caps:
            dados.volante_caps || '',


        // =============================================
        // FILHOS
        // =============================================

        checklist:
            dados.checklist || [],

        colaboradorchecklist_set:
            dados.colaboradorchecklist_set ||
            [],


        // =============================================
        // FOTOS
        // =============================================

        checklistcarimbo:
            fotos,
    };


    // IMPORTANTE:
    //
    // NÃO mandamos "doc" no JSON.
    //
    // doc é FileField no Django.
    // Na edição ele chega como URL/string,
    // e uma URL não pode ser enviada novamente
    // como se fosse um arquivo.
    //
    // O campo existente continuará intacto
    // porque o serializer só atualiza os campos
    // presentes em validated_data.


    return payload;
}

// =========================================================
// CRIAR
//
// Online  -> POST direto
// Offline -> fila genérica
// =========================================================

export async function criarChecklist(dados) {

    const payload =
    await montarPayloadChecklist(
        dados,
        false
    );

    const netInfo =
        await NetInfo.fetch();

    const offline =
        !netInfo.isConnected ||
        netInfo.isInternetReachable === false;

    // ---------------------------------------------
    // OFFLINE
    // ---------------------------------------------

    if (offline) {

        await addOfflineOperation({
            entity: 'checklist',
            operation: 'POST',
            endpoint: CHECKLIST_ENDPOINT,
            payload,
        });

        return {
            offline: true,
            pending: true,
        };
    }

    // ---------------------------------------------
    // ONLINE
    // ---------------------------------------------

    try {

        const response = await api.post(
            CHECKLIST_ENDPOINT,
            payload
        );

        return {
            offline: false,
            pending: false,
            data: response.data,
        };

    } catch (error) {

        // -----------------------------------------
        // Falha de transporte
        //
        // A conexão pode ter caído depois do
        // NetInfo.fetch().
        // -----------------------------------------

        if (!error.response) {

            await addOfflineOperation({
                entity: 'checklist',
                operation: 'POST',
                endpoint: CHECKLIST_ENDPOINT,
                payload,
            });

            return {
                offline: true,
                pending: true,
            };
        }

        // -----------------------------------------
        // Permissão
        // -----------------------------------------

        if (
            error.response?.status === 403
        ) {
            throw new Error(
                'Você não tem permissão para criar checklists.'
            );
        }

        throw error;
    }
}


// =========================================================
// EDITAR
//
// Somente online
// =========================================================

export async function editarChecklist(
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
            'Não é possível editar um Checklist sem conexão com a internet.'
        );
    }

    const payload =
    await montarPayloadChecklist(
        dados,
        false
    );

    try {

        const response = await api.put(
            `${CHECKLIST_ENDPOINT}${id}/`,
            payload
        );

        return response.data;

    } catch (error) {

        console.error(
            'Erro ao editar checklist:',
            error.response?.data ||
            error.message
        );

        if (
            error.response?.status === 403
        ) {
            throw new Error(
                'Você não tem permissão para atualizar checklists.'
            );
        }

        throw error;
    }
}