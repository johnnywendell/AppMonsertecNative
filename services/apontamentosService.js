import { api } from './api';
import NetInfo from '@react-native-community/netinfo';

export const listarApontamentos = async () => {
  try {
    const { data } = await api.get('api/v1/efetivo/apontamentos');
    return data;
  } catch (error) {
    console.error('Erro ao listar apontamentos:', error);
    throw error;
  }
};

export const inserirApontamento = async (apontamento, efetivos, callback) => {
  try {
    const response = await api.post('api/v1/efetivo/apontamentos/', apontamento);
    callback(response.data);
    return response.data;
  } catch (error) {
    console.error('Erro ao inserir apontamento:', error);
    throw error;
  }
};

export const fetchAreas = async () => {
  try {
    const { data } = await api.get('api/v1/geral/areas/');
    return data;
  } catch (error) {
    console.error('Erro ao buscar áreas:', error);
    throw error;
  }
};

export const fetchProjetos = async () => {
  try {
    const { data } = await api.get('/api/v1/planejamento/projetocodigo/');
    return data;
  } catch (error) {
    console.error('Erro ao buscar projetos:', error);
    throw error;
  }
};

export const fetchColaboradores = async () => {
  try {
    const { data } = await api.get('api/v1/efetivo/colaboradores/');
    return data;
  } catch (error) {
    console.error('Erro ao buscar colaboradores:', error);
    throw error;
  }
};

export const buscarApontamentoPorId = async (id) => {
  try {
    const { data } = await api.get(`api/v1/efetivo/apontamentos/${id}`);
    
    // Mapear os campos da API para o formato esperado pelo frontend
    return {
      id: data.id,
      data: data.data,
      area: data.area,
      projeto: data.projeto_cod,  // Mapeando projeto_cod para projeto
      disciplina: data.disciplina,
      observacoes: data.obs,      // Mapeando obs para observacoes
      apontamentos: data.apontamentos || []
    };
  } catch (error) {
    console.error('Erro ao buscar apontamento:', error);
    throw error;
  }
};

export const atualizarApontamento = async (apontamento, efetivos) => {
  try {
    const response = await api.put(
      `api/v1/efetivo/apontamentos/${apontamento.id}/`,
      apontamento
    );
    return response.data;
  } catch (error) {
    console.error('Erro ao atualizar apontamento:', error);
    throw error;
  }
};

export const buscarUltimoApontamentoCompleto = async () => {
  try {
    // Busca todos os apontamentos
    const apontamentos = await listarApontamentos();
    
    if (!apontamentos || apontamentos.length === 0) {
      return null;
    }

    // Ordena por data (mais recente primeiro) e por ID (caso as datas sejam iguais)
    apontamentos.sort((a, b) => {
      const dateA = new Date(a.data);
      const dateB = new Date(b.data);
      
      if (dateB.getTime() !== dateA.getTime()) {
        return dateB.getTime() - dateA.getTime();
      }
      
      // Se as datas forem iguais, ordena pelo ID mais recente
      return b.id - a.id;
    });

    // Pega o apontamento mais recente
    const ultimoApontamento = apontamentos[0];

    // Busca os detalhes completos do apontamento
    const apontamentoCompleto = await buscarApontamentoPorId(ultimoApontamento.id);
    
    return apontamentoCompleto;
  } catch (error) {
    console.error('Erro ao buscar último apontamento:', error);
    throw error;
  }
};
