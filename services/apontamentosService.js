import { api } from './api';
import NetInfo from '@react-native-community/netinfo';

export const listarApontamentos = async (page = 1, search = "") => {
  try {
    // Adicionamos page e search na URL
    const url = `api/v1/efetivo/apontamentos/?page=${page}&search=${search}`;
    const { data } = await api.get(url);
    
    // IMPORTANTE: Retornamos os resultados e o total para controle da paginação
    return {
      results: data.results, // Os 20 itens
      count: data.count,     // Total no banco
      next: data.next        // Próxima página
    };
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
    // 1. Chamamos a listagem passando o parâmetro de ordenação do Django (?ordering=-data,-id)
    // Isso já traz o mais recente no topo da lista
    const response = await listarApontamentos(1, "", "-data,-id");
    
    // 2. Extraímos a lista de dentro de .results (devido à paginação)
    const lista = response?.results || (Array.isArray(response) ? response : []);

    if (lista.length === 0) {
      return null;
    }

    // 3. O primeiro item já é o mais recente graças ao "ordering" da API
    const ultimoApontamento = lista[0];

    // 4. Busca os detalhes completos (efetivos/colaboradores) desse ID
    const apontamentoCompleto = await buscarApontamentoPorId(ultimoApontamento.id);
    
    return apontamentoCompleto;
  } catch (error) {
    console.error('Erro ao buscar último apontamento:', error);
    throw error;
  }
};