import { api } from './api';
import * as FileSystem from 'expo-file-system';
import NetInfo from '@react-native-community/netinfo';

export const fetchAreas = async () => {
    try {
        const { data } = await api.get('api/v1/geral/areas/');
        return data;
    } catch (error) {
        console.error('Erro ao buscar áreas:', error);
        if (error.response?.status === 403) {
            throw new Error('Você não tem permissão para visualizar áreas.');
        }
        return [];
    }
};

export const listarRelatorios = async (page = 1, search = '') => {
    try {
        // Adicionamos page e search como query params
        // O Django usará esses valores para filtrar e paginar
        const url = `api/v1/qualidade/relatorios/?page=${page}&search=${search}`;
        const { data } = await api.get(url);

        // Retornamos o objeto completo (que contém .results e .next)
        return data; 
    } catch (error) {
        console.error('Erro ao listar relatórios:', error);
        
        if (error.response?.status === 403) {
            throw new Error('Você não tem permissão para visualizar relatórios.');
        }

        // Retornamos um formato padrão de erro para não quebrar a tela
        return { results: [], next: null, count: 0 };
    }
};

export const criarRelatorio = async (relatorio, callback) => {
    try {
        const fotosBase64 = [];
        if (relatorio.relatorio && relatorio.relatorio.length > 0) {
            for (const foto of relatorio.relatorio) {
                const base64 = await FileSystem.readAsStringAsync(foto.photo, {
                    encoding: FileSystem.EncodingType.Base64,
                });
                fotosBase64.push({ photo: `data:image/jpeg;base64,${base64}` });
            }
        }
        const payload = { ...relatorio, relatorio: fotosBase64 };
        const response = await api.post('api/v1/qualidade/relatorios/', payload, {
            headers: { 'Content-Type': 'application/json' }
        });
        callback(response.data);
        return response.data;
    } catch (error) {
        console.error('Erro ao criar relatório:', error);
        if (error.response?.status === 403) {
            throw new Error('Você não tem permissão para criar relatórios.');
        }
        throw error;
    }
};

export const atualizarRelatorio = async (id, relatorio, callback) => {
    try {
        // Processar as fotos para o formato base64 sem prefixo
        const fotosProcessadas = [];
        if (relatorio.relatorio && relatorio.relatorio.length > 0) {
            for (const foto of relatorio.relatorio) {
                // Se a foto é um objeto com propriedade photo (base64 com prefixo)
                if (foto.photo && typeof foto.photo === 'string' && foto.photo.startsWith('data:image')) {
                    const base64Data = foto.photo.split(',')[1];
                    fotosProcessadas.push({ photo: base64Data });
                }
                // Se é um objeto com URI (arquivo local)
                else if (foto.photo && typeof foto.photo === 'object' && foto.photo.uri) {
                    const base64 = await FileSystem.readAsStringAsync(foto.photo.uri, {
                        encoding: FileSystem.EncodingType.Base64,
                    });
                    fotosProcessadas.push({ photo: base64 });
                }
                // Se já é base64 sem prefixo
                else if (foto.photo && typeof foto.photo === 'string') {
                    fotosProcessadas.push({ photo: foto.photo });
                }
            }
        }

        // Preparar o payload no formato exato esperado pela API
        const payload = {
            cliente: relatorio.cliente || '',
            data: relatorio.data || '',
            rec: relatorio.rec || '',
            nota: relatorio.nota || '',
            tag: relatorio.tag || '',
            tipo_serv: relatorio.tipo_serv || '',
            unidade: relatorio.unidade || null,
            contrato: relatorio.contrato || null,
            setor: relatorio.setor || '',
            corrosividade: relatorio.corrosividade || '',
            fiscal: relatorio.fiscal || '',
            inspetor: relatorio.inspetor || '',
            inicio: relatorio.inicio || '',
            termino: relatorio.termino || '',
            tratamento: relatorio.tratamento || '',
            tipo_subs: relatorio.tipo_subs || '',
            temp_ambiente: relatorio.temp_ambiente || '',
            ura: relatorio.ura || '',
            po: relatorio.po || '',
            temp_super: relatorio.temp_super || '',
            intemperismo: relatorio.intemperismo || '',
            descontaminacao: relatorio.descontaminacao || '',
            poeira_tam: relatorio.poeira_tam || '',
            poeira_quant: relatorio.poeira_quant || '',
            teor_sais: relatorio.teor_sais || '',
            ambiente_pintura: relatorio.ambiente_pintura || '',
            rugosidade: relatorio.rugosidade || '',
            laudo: Boolean(relatorio.laudo),
            rnc_n: Boolean(relatorio.rnc_n),
            obs_inst: relatorio.obs_inst || '',
            obs_final: relatorio.obs_final || '',
            aprovado: Boolean(relatorio.aprovado),
            m2: relatorio.m2 ? parseFloat(relatorio.m2).toFixed(2) : null,
            checklist_n: relatorio.checklist_n || null,
            relatorios: relatorio.relatorios || [],
            relatorio: fotosProcessadas,
        };

        const response = await api.put(`api/v1/qualidade/relatorios/${id}/`, payload, {
            headers: { 'Content-Type': 'application/json' }
        });

        if (callback) {
            callback(response.data);
        }

        return response.data;
    } catch (error) {
        console.error('Erro ao atualizar relatório:', error);
        console.log('Erro detalhes:', error.response?.data);

        if (error.response?.status === 403) {
            throw new Error('Você não tem permissão para atualizar relatórios.');
        }

        // Log detalhado do erro para debugging
        if (error.response) {
            console.error('Detalhes do erro:', error.response.data);
            console.error('Status do erro:', error.response.status);
        }

        throw error;
    }
};

export async function listarAreas() {
    return await fetchAreas();
}

export const deletarRelatorioLocal = async (id) => {
    try {
        await api.delete(`api/v1/qualidade/relatorios/${id}/`);
    } catch (error) {
        console.error('Erro ao deletar relatório:', error);
        if (error.response?.status === 403) {
            throw new Error('Você não tem permissão para deletar relatórios.');
        }
        throw error;
    }
};

export const buscarRelatorioPorId = async (id, callback = () => { }) => {
    try {
        const { data } = await api.get(`api/v1/qualidade/relatorios/${id}/`);
        callback(data);
        return data;
    } catch (error) {
        console.error('Erro ao buscar relatório:', error);
        if (error.response?.status === 403) {
            throw new Error('Você não tem permissão para visualizar este relatório.');
        }
        callback(null);
        throw error;
    }
};

export const fetchColaboradores = async () => {
    try {
        const { data } = await api.get('api/v1/efetivo/colaboradores/');
        return data;
    } catch (error) {
        console.error('Erro ao buscar colaboradores:', error);
        if (error.response?.status === 403) {
            throw new Error('Você não tem permissão para visualizar colaboradores.');
        }
        return [];
    }
};