import { api } from './api';
import NetInfo from '@react-native-community/netinfo';

// Campos obrigatórios para enviar checklist
const requiredFields = ['cliente', 'tag', 'unidade', 'data'];

// Validar campos obrigatórios
const validateRequiredFields = (checklist) => {
    const missingFields = requiredFields.filter(
        field => checklist[field] === null || checklist[field] === undefined || checklist[field] === ''
    );
    return missingFields;
};

// --- Áreas ---
export const listarAreas = async () => {
    try {
        const { data } = await api.get('api/v1/geral/areas/');
        return data;
    } catch (error) {
        console.error('Erro ao buscar áreas:', error);
        return [];
    }
};

// --- Buscar checklist por ID ---
export const buscarChecklistPorId = async (id) => {
    const netInfo = await NetInfo.fetch();

    if (!netInfo.isConnected) {
        console.error('Sem conexão de internet. Não é possível buscar checklist.');
        return null;
    }

    try {
        const { data } = await api.get(`api/v1/qualidade/checklists/${id}/`);
        return data;
    } catch (error) {
        console.error('Erro ao buscar checklist online:', error);
        return null;
    }
};

// --- Inserir checklist ---
// --- Inserir checklist ---
export const inserirChecklist = async (checklist) => {
    const netInfo = await NetInfo.fetch();

    const missingFields = validateRequiredFields(checklist);
    if (missingFields.length) {
        console.error('Campos obrigatórios faltando:', missingFields);
        return { error: 'Campos obrigatórios faltando', missingFields };
    }

    if (!netInfo.isConnected) {
        console.error('Sem conexão de internet. Não é possível inserir checklist.');
        return { error: 'Sem conexão de internet' };
    }

    try {
        // Log para debug (remova em produção)
        console.log('Enviando payload:', JSON.stringify(checklist, null, 2));

        const { data } = await api.post('api/v1/qualidade/checklists/', checklist);
        console.log('Checklist inserido com sucesso:', data);
        return data;
    } catch (error) {
        console.error('Erro ao inserir checklist na API:', error);

        // Melhor tratamento de erro
        if (error.response) {
            console.error('Resposta do servidor:', error.response.data);
            console.error('Status do erro:', error.response.status);

            return {
                error: 'Falha ao inserir checklist',
                details: error.response.data,
                status: error.response.status
            };
        }

        return { error: 'Falha ao inserir checklist', details: error.message };
    }
};


// --- Atualizar checklist ---
export const atualizarChecklist = async (id, checklist) => {
    const netInfo = await NetInfo.fetch();

    if (!netInfo.isConnected) {
        console.error('Sem conexão de internet. Não é possível atualizar checklist.');
        return { error: 'Sem conexão de internet' };
    }

    try {

        const { data } = await api.put(`api/v1/qualidade/checklists/${id}/`, checklist);
        console.log('Checklist atualizado com sucesso (json):', data);
        return data;
    } catch (error) {
        console.error('Erro ao atualizar checklist na API:', error);

        if (error.response) {
            console.error('Resposta do servidor:', error.response.data);
            console.error('Status do erro:', error.response.status);

            if (error.response.status === 403) {
                return {
                    error: 'Acesso não autorizado. Token pode ter expirado.',
                    details: error.response.data,
                    status: error.response.status
                };
            }

            return {
                error: 'Falha ao atualizar checklist',
                details: error.response.data,
                status: error.response.status
            };
        }

        return { error: 'Falha ao atualizar checklist', details: error.message };
    }
};



// --- Listar checklists ---
export const listarChecklists = async (page = 1) => { // Adicionei suporte a passar a página
    const netInfo = await NetInfo.fetch();

    if (!netInfo.isConnected) {
        console.error('Sem conexão de internet.');
        return { results: [], count: 0 }; // Retorno consistente
    }

    try {
        // Passamos o parâmetro 'page' para a API
        const { data } = await api.get(`api/v1/qualidade/checklists/?page=${page}`);
        
        // IMPORTANTE: Agora retornamos data.results para manter compatibilidade 
        // ou o objeto todo se você precisar do 'count' para criar um scroll infinito.
        return data.results || []; 
    } catch (error) {
        console.error('Erro ao listar checklists online:', error);
        return [];
    }
};

// --- Buscar colaboradores ---
export const fetchColaboradores = async () => {
    const netInfo = await NetInfo.fetch();

    if (!netInfo.isConnected) {
        console.error('Sem conexão de internet. Não é possível listar colaboradores.');
        return [];
    }

    try {
        const { data } = await api.get('api/v1/efetivo/colaboradores/');
        return data;
    } catch (error) {
        console.error('Erro ao buscar colaboradores online:', error);
        return [];
    }
};
