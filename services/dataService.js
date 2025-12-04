import { api } from './api';// Importe sua instância configurada do Axios

// --- Funções de Fetch para o RDC Principal ---

// --- SOLICITANTES ---
export const fetchSolicitantes = async () => {
    try {
        const { data } = await api.get('api/v1/geral/solicitantes/');
        // O campo que você quer mostrar é 'solicitante'
        return data.map(item => ({ 
            label: item.solicitante, // <-- CORRIGIDO: Usa item.solicitante
            value: item.id 
        }));
    } catch (error) {
        console.error('Erro ao buscar Solicitantes:', error);
        return [];
    }
};

// --- APROVADORES ---
export const fetchAprovadores = async () => {
    try {
        const { data } = await api.get('api/v1/geral/aprovadores/');
        // O campo que você quer mostrar é 'aprovador'
        return data.map(item => ({ 
            label: item.aprovador, // <-- CORRIGIDO: Usa item.aprovador
            value: item.id 
        }));
    } catch (error) {
        console.error('Erro ao buscar Aprovadores:', error);
        return [];
    }
};

// --- UNIDADES (ÁREA) ---
export const fetchUnidades = async () => {
    try {
        const { data } = await api.get('api/v1/geral/areas/');
        // O campo que você quer mostrar é 'area'
        return data.map(item => ({ 
            label: item.area, // <-- CORRIGIDO: Usa item.area
            value: item.id 
        }));
    } catch (error) {
        console.error('Erro ao buscar Unidades:', error);
        return [];
    }
};

export const fetchASOptions = async () => {
    try {
        const { data } = await api.get('api/v1/planejamento/as/');
        // Exemplo: Se o campo do AS for 'numero'
        return data.map(item => ({ 
            label: item.numero || `AS #${item.id}`, // Ajuste para o nome real do campo
            value: item.id 
        }));
    } catch (error) {
        console.error('Erro ao buscar AS:', error);
        return [];
    }
};

export const fetchProjetoCodigos = async () => {
    try {
        const { data } = await api.get('api/v1/planejamento/projetocodigo/');
        // Exemplo: Se o campo do Código de Projeto for 'codigo'
        return data.map(item => ({ 
            label: item.projeto_nome, // Ajuste para o nome real do campo
            value: item.id 
        }));
    } catch (error) {
        console.error('Erro ao buscar Códigos de Projeto:', error);
        return [];
    }
};

// --- Funções de Fetch para Itens Filhos ---

// Colaborador (para ItemMedicaohh)
export const fetchColaboradores = async () => {
    try {
        const { data } = await api.get('api/v1/efetivo/colaboradores/');
        return data.map(item => ({ label: item.nome, value: item.id }));
    } catch (error) {
        console.error('Erro ao buscar Colaboradores:', error);
        throw error;
    }
};

// Item Contrato (ItemBm - para HH e PIN)
export const fetchItemContratoOptions = async () => {
    try {
        // Você pode precisar de lógica de filtragem aqui (como o ItemBm.objects.filter no Django)
        const { data } = await api.get('api/v1/geral/itens-bm/');
        // Assumindo que o ItemBm tem 'descricao' e 'id'
        return data.map(item => ({ label: item.descricao, value: item.id }));
    } catch (error) {
        console.error('Erro ao buscar Itens Contrato:', error);
        throw error;
    }
};

// --- MOCK para Choices (Ainda não é fetch, mas necessário para o Forms) ---
export const MOCK_OPTIONS_CHOICES = {
    tipo: [{ label: 'MONTAGEM', value: 'MONTAGEM' }, { label: 'MANUTENÇÃO', value: 'MANUTENÇÃO' }],
    disciplina: [{ label: 'PINTURA', value: 'PIN' }, { label: 'MECÂNICA', value: 'MEC' }],
    clima: [{ label: 'Sol', value: 'SOL' }, { label: 'Chuva', value: 'CHUVA' }, { label: 'Nublado', value: 'NUBLADO' }],
    bm: [{ label: 'BM 2024-05', value: 50 }, { label: 'BM 2024-06', value: 51 }], // Assumindo que BM é Choice ou um FK simples sem service dedicado
    tipo_serv_hh: [{ label: 'Interno', value: 'INT' }, { label: 'Externo', value: 'EXT' }],
    material_pin: [{ label: 'Tinta Base', value: 501 }, { label: 'Lixa Fina', value: 502 }],
};