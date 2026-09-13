import NetInfo from '@react-native-community/netinfo';
import * as FileSystem from 'expo-file-system/legacy';

import { api } from './api';
import { addOfflineOperation } from '../offlineQueue';

const RELATORIO_ENDPOINT = 'api/v1/qualidade/relatorios/';

// =========================================================
// LISTAR
// =========================================================

export async function listarRelatorios({ page = 1, search = '' } = {}) {
    const response = await api.get(RELATORIO_ENDPOINT, {
        params: { page, search }
    });

    return response.data;
}

// =========================================================
// BUSCAR
// =========================================================

export async function buscarRelatorioPorId(id) {
    const response = await api.get(`${RELATORIO_ENDPOINT}${id}/`);
    return response.data;
}

// =========================================================
// FOTOS
// =========================================================

async function arquivoParaBase64(uri) {
    return await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
    });
}

async function processarFotosCriacao(fotos = []) {
    const resultado = [];

    for (const foto of fotos || []) {
        const photo = foto?.photo ?? foto;

        if (!photo) continue;

        // { photo: { uri: 'file://...' } }
        if (typeof photo === 'object' && photo.uri) {
            const base64 = await arquivoParaBase64(photo.uri);

            resultado.push({
                photo: `data:image/jpeg;base64,${base64}`
            });

            continue;
        }

        if (typeof photo !== 'string') continue;

        // Já veio convertido
        if (photo.startsWith('data:image')) {
            resultado.push({ photo });
            continue;
        }

        // Arquivo local
        if (
            photo.startsWith('file://') ||
            photo.startsWith('content://')
        ) {
            const base64 = await arquivoParaBase64(photo);

            resultado.push({
                photo: `data:image/jpeg;base64,${base64}`
            });

            continue;
        }

        // Base64 puro
        resultado.push({
            photo: `data:image/jpeg;base64,${photo}`
        });
    }

    return resultado;
}

async function processarFotosEdicao(fotos = []) {
    const resultado = [];

    for (const foto of fotos || []) {
        const photo = foto?.photo ?? foto;

        if (!photo) continue;

        // Foto antiga já salva no servidor.
        // NÃO reenviar, pois o update do Django apenas adiciona fotos.
        if (
            typeof photo === 'string' &&
            (
                photo.startsWith('http://') ||
                photo.startsWith('https://') ||
                photo.startsWith('/media/')
            )
        ) {
            continue;
        }

        // Nova foto no formato { photo: { uri } }
        if (typeof photo === 'object' && photo.uri) {
            const base64 = await arquivoParaBase64(photo.uri);

            resultado.push({
                photo: base64
            });

            continue;
        }

        if (typeof photo !== 'string') continue;

        // Nova foto já convertida em data:image...
        if (photo.startsWith('data:image')) {
            const base64 = photo.split(',')[1];

            if (base64) {
                resultado.push({
                    photo: base64
                });
            }

            continue;
        }

        // Nova foto local
        if (
            photo.startsWith('file://') ||
            photo.startsWith('content://')
        ) {
            const base64 = await arquivoParaBase64(photo);

            resultado.push({
                photo: base64
            });

            continue;
        }

        // Já está em base64 puro
        resultado.push({
            photo
        });
    }

    return resultado;
}

// =========================================================
// PAYLOAD
// =========================================================

async function montarPayloadRelatorio(dados, isEditing = false) {
    const fotos = isEditing
        ? await processarFotosEdicao(dados.relatorio || [])
        : await processarFotosCriacao(dados.relatorio || []);

    return {
        cliente: dados.cliente || '',
        data: dados.data || null,
        rec: dados.rec || '',
        nota: dados.nota || '',
        tag: dados.tag || '',
        tipo_serv: dados.tipo_serv || '',

        unidade: dados.unidade || null,
        contrato: dados.contrato || null,

        setor: dados.setor || '',
        corrosividade: dados.corrosividade || '',
        fiscal: dados.fiscal || '',
        inspetor: dados.inspetor || '',

        inicio: dados.inicio || null,
        termino: dados.termino || null,

        tratamento: dados.tratamento || '',
        tipo_subs: dados.tipo_subs || '',

        temp_ambiente: dados.temp_ambiente || null,
        ura: dados.ura || null,
        po: dados.po || null,
        temp_super: dados.temp_super || null,

        intemperismo: dados.intemperismo || '',
        descontaminacao: dados.descontaminacao || '',

        poeira_tam: dados.poeira_tam || '',
        poeira_quant: dados.poeira_quant || '',
        teor_sais: dados.teor_sais || null,

        ambiente_pintura: dados.ambiente_pintura || '',
        rugosidade: dados.rugosidade || null,

        laudo: !!dados.laudo,
        rnc_n: !!dados.rnc_n,

        obs_inst: dados.obs_inst || '',
        obs_final: dados.obs_final || '',

        aprovado: !!dados.aprovado,

        m2:
            dados.m2 !== '' &&
            dados.m2 !== null &&
            dados.m2 !== undefined
                ? Number(String(dados.m2).replace(',', '.'))
                : null,

        checklist_n: dados.checklist_n || null,

        // Etapas
        relatorios: dados.relatorios || [],

        // Fotos
        relatorio: fotos,
    };
}

// =========================================================
// CRIAR
// Online -> POST
// Offline -> fila genérica
// =========================================================

export async function criarRelatorio(dados) {
    // IMPORTANTE:
    // convertemos as fotos ANTES de colocar na fila.
    const payload = await montarPayloadRelatorio(dados, false);

    const netInfo = await NetInfo.fetch();

    const offline =
        !netInfo.isConnected ||
        netInfo.isInternetReachable === false;

    if (offline) {
        await addOfflineOperation({
            entity: 'relatorio',
            operation: 'POST',
            endpoint: RELATORIO_ENDPOINT,
            payload,
        });

        return {
            offline: true,
            pending: true
        };
    }

    try {
        const response = await api.post(
            RELATORIO_ENDPOINT,
            payload
        );

        return {
            offline: false,
            pending: false,
            data: response.data
        };

    } catch (error) {

        // Falha de transporte:
        // internet pode ter caído depois do NetInfo.fetch()
        if (!error.response) {
            await addOfflineOperation({
                entity: 'relatorio',
                operation: 'POST',
                endpoint: RELATORIO_ENDPOINT,
                payload,
            });

            return {
                offline: true,
                pending: true
            };
        }

        if (error.response?.status === 403) {
            throw new Error(
                'Você não tem permissão para criar relatórios.'
            );
        }

        throw error;
    }
}

// =========================================================
// EDITAR
// Somente online
// =========================================================

export async function editarRelatorio(id, dados) {
    const netInfo = await NetInfo.fetch();

    const offline =
        !netInfo.isConnected ||
        netInfo.isInternetReachable === false;

    if (offline) {
        throw new Error(
            'Não é possível editar um Relatório sem conexão com a internet.'
        );
    }

    const payload = await montarPayloadRelatorio(
        dados,
        true
    );

    try {
        const response = await api.put(
            `${RELATORIO_ENDPOINT}${id}/`,
            payload
        );

        return response.data;

    } catch (error) {
        console.error(
            'Erro ao editar relatório:',
            error.response?.data || error.message
        );

        if (error.response?.status === 403) {
            throw new Error(
                'Você não tem permissão para atualizar relatórios.'
            );
        }

        throw error;
    }
}
