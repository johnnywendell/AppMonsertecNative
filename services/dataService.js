import NetInfo from '@react-native-community/netinfo';

import { api } from './api';// Importe sua instância configurada do Axios

import {
    listarProjetoCodigosCache,
    atualizarProjetoCodigosCache
} from './projetoCodigoService';

import {
    listarAprovadoresCache,
    atualizarAprovadoresCache
} from './aprovadorService';

import {
    listarSolicitantesCache,
    atualizarSolicitantesCache
} from './solicitanteService';

import {
    listarAreasCache,
    atualizarAreasCache
} from './areaService';

import {
    listarItensBmCache,
    atualizarItensBmCache
} from './itembmService';

import {
    listarColaboradoresCache,
    atualizarColaboradoresCache
} from './colaboradorService';

// --- Funções de Fetch para o RDC Principal ---

// --- SOLICITANTES ---
export const fetchSolicitantes =
    async () => {

        // -------------------------------------------------
        // VERIFICA CONECTIVIDADE
        // -------------------------------------------------

        const netInfo =
            await NetInfo.fetch();


        const offline =
            !netInfo.isConnected ||
            netInfo.isInternetReachable === false;


        // =================================================
        // OFFLINE
        // =================================================

        if (offline) {

            console.log(
                'Sem internet - carregando Solicitantes do SQLite'
            );


            const locais =
                await listarSolicitantesCache();


            return locais.map(
                item => ({

                    label:
                        item.solicitante,

                    value:
                        item.server_id
                })
            );
        }


        // =================================================
        // ONLINE
        // =================================================

        try {

            const {
                data
            } = await api.get(
                'api/v1/geral/solicitantes/'
            );


            // ---------------------------------------------
            // LISTA DIRETA OU PAGINADA
            // ---------------------------------------------

            const solicitantes =
                data?.results ||
                data ||
                [];


            // ---------------------------------------------
            // ATUALIZA CACHE
            // ---------------------------------------------

            try {

                await atualizarSolicitantesCache(
                    solicitantes
                );

            } catch (cacheError) {

                console.warn(
                    'API de Solicitantes carregou, mas o cache não pôde ser atualizado:',
                    cacheError.message
                );
            }


            // ---------------------------------------------
            // RETORNO PARA PICKERS
            // ---------------------------------------------

            return solicitantes.map(
                item => ({

                    label:
                        item.solicitante,

                    value:
                        item.id
                })
            );


        } catch (error) {

            // =================================================
            // INTERNET CAIU DURANTE A REQUISIÇÃO
            // =================================================

            if (
                !error.response
            ) {

                console.warn(
                    'API de Solicitantes indisponível - usando SQLite'
                );


                const locais =
                    await listarSolicitantesCache();


                return locais.map(
                    item => ({

                        label:
                            item.solicitante,

                        value:
                            item.server_id
                    })
                );
            }


            // =================================================
            // ERRO REAL DA API
            // =================================================

            console.error(
                'Erro da API ao buscar Solicitantes:',
                error.response?.data ||
                error.message
            );


            return [];
        }
    };

// --- APROVADORES ---
export const fetchAprovadores =
    async () => {

        // -------------------------------------------------
        // VERIFICA CONECTIVIDADE
        // -------------------------------------------------

        const netInfo =
            await NetInfo.fetch();


        const offline =
            !netInfo.isConnected ||
            netInfo.isInternetReachable === false;


        // =================================================
        // OFFLINE
        // =================================================

        if (offline) {

            console.log(
                'Sem internet - carregando Aprovadores do SQLite'
            );


            const locais =
                await listarAprovadoresCache();


            return locais.map(
                item => ({

                    label:
                        item.aprovador,

                    value:
                        item.server_id
                })
            );
        }


        // =================================================
        // ONLINE
        // =================================================

        try {

            const {
                data
            } = await api.get(
                'api/v1/geral/aprovadores/'
            );


            // ---------------------------------------------
            // ACEITA LISTA DIRETA OU PAGINADA
            // ---------------------------------------------

            const aprovadores =
                data?.results ||
                data ||
                [];


            // ---------------------------------------------
            // ATUALIZA CACHE
            // ---------------------------------------------

            try {

                await atualizarAprovadoresCache(
                    aprovadores
                );

            } catch (cacheError) {

                console.warn(
                    'API de Aprovadores carregou, mas o cache não pôde ser atualizado:',
                    cacheError.message
                );
            }


            // ---------------------------------------------
            // RETORNO PARA PICKERS
            // ---------------------------------------------

            return aprovadores.map(
                item => ({

                    label:
                        item.aprovador,

                    value:
                        item.id
                })
            );


        } catch (error) {

            // =================================================
            // INTERNET CAIU DEPOIS DO NETINFO
            // =================================================

            if (
                !error.response
            ) {

                console.warn(
                    'API de Aprovadores indisponível - usando SQLite'
                );


                const locais =
                    await listarAprovadoresCache();


                return locais.map(
                    item => ({

                        label:
                            item.aprovador,

                        value:
                            item.server_id
                    })
                );
            }


            // =================================================
            // ERRO REAL DA API
            // =================================================

            console.error(
                'Erro da API ao buscar Aprovadores:',
                error.response?.data ||
                error.message
            );


            return [];
        }
    };

// --- UNIDADES (ÁREA) ---
export const fetchUnidades =
    async () => {

        // -------------------------------------------------
        // VERIFICA CONECTIVIDADE
        // -------------------------------------------------

        const netInfo =
            await NetInfo.fetch();


        const offline =
            !netInfo.isConnected ||
            netInfo.isInternetReachable === false;


        // =================================================
        // OFFLINE
        // =================================================

        if (offline) {

            console.log(
                'Sem internet - carregando Áreas do SQLite'
            );


            const locais =
                await listarAreasCache();


            return locais.map(
                item => ({

                    label:
                        item.area,

                    value:
                        item.server_id
                })
            );
        }


        // =================================================
        // ONLINE
        // =================================================

        try {

            const {
                data
            } = await api.get(
                'api/v1/geral/areas/'
            );


            // ---------------------------------------------
            // LISTA DIRETA OU PAGINADA
            // ---------------------------------------------

            const areas =
                data?.results ||
                data ||
                [];


            // ---------------------------------------------
            // ATUALIZA CACHE
            // ---------------------------------------------

            try {

                await atualizarAreasCache(
                    areas
                );

            } catch (cacheError) {

                console.warn(
                    'API de Áreas carregou, mas o cache não pôde ser atualizado:',
                    cacheError.message
                );
            }


            // ---------------------------------------------
            // RETORNO PARA PICKERS
            // ---------------------------------------------

            return areas.map(
                item => ({

                    label:
                        item.area,

                    value:
                        item.id
                })
            );


        } catch (error) {

            // =================================================
            // INTERNET CAIU DURANTE A REQUISIÇÃO
            // =================================================

            if (
                !error.response
            ) {

                console.warn(
                    'API de Áreas indisponível - usando SQLite'
                );


                const locais =
                    await listarAreasCache();


                return locais.map(
                    item => ({

                        label:
                            item.area,

                        value:
                            item.server_id
                    })
                );
            }


            // =================================================
            // ERRO REAL DA API
            // =================================================

            console.error(
                'Erro da API ao buscar Áreas:',
                error.response?.data ||
                error.message
            );


            return [];
        }
    };

export const fetchASOptions = async () => {
    try {
        const { data } = await api.get('api/v1/planejamento/as/');

        // 1. Pega os resultados de dentro de 'results' (padrão do Django paginado)
        // Se 'data.results' não existir, tenta usar o próprio 'data' (caso a API mude)
        // Se nenhum existir, usa um array vazio []
        const listaAS = data.results || data || [];

        // 2. Agora o .map vai funcionar porque 'listaAS' é um array
        return listaAS.map(item => ({ 
            // Verifique se o campo no seu Django é 'numero', 'numero_as' ou 'codigo'
            label: item.numero || item.codigo || `AS #${item.id}`, 
            value: item.id 
        }));

    } catch (error) {
        console.error('Erro ao buscar AS:', error);
        return []; // Retorna vazio para o Picker não travar a tela
    }
};

export const fetchProjetoCodigos =
    async () => {

        // -------------------------------------------------
        // VERIFICA CONECTIVIDADE
        // -------------------------------------------------

        const netInfo =
            await NetInfo.fetch();


        const offline =
            !netInfo.isConnected ||
            netInfo.isInternetReachable === false;


        // =================================================
        // OFFLINE
        // =================================================

        if (offline) {

            console.log(
                'Sem internet - carregando Projetos do SQLite'
            );


            const locais =
                await listarProjetoCodigosCache();


            return locais.map(
                item => ({

                    label:
                        item.projeto_nome,

                    // IMPORTANTE:
                    // sempre usamos o ID do Django.
                    value:
                        item.server_id
                })
            );
        }


        // =================================================
        // ONLINE
        // =================================================

        try {

            const {
                data
            } = await api.get(
                'api/v1/planejamento/projetocodigo/'
            );


            // ---------------------------------------------
            // Aceita API paginada ou lista simples
            // ---------------------------------------------

            const projetos =
                data?.results ||
                data ||
                [];


            // ---------------------------------------------
            // ATUALIZA CACHE LOCAL
            // ---------------------------------------------

            try {

                await atualizarProjetoCodigosCache(
                    projetos
                );

            } catch (cacheError) {

                // Problema no SQLite não deve impedir
                // o uso dos dados que chegaram da API.

                console.warn(
                    'API de Projetos carregou, mas o cache não pôde ser atualizado:',
                    cacheError.message
                );
            }


            // ---------------------------------------------
            // RETORNO PADRÃO DOS PICKERS
            // ---------------------------------------------

            return projetos.map(
                item => ({

                    label:
                        item.projeto_nome,

                    value:
                        item.id
                })
            );


        } catch (error) {

            // =================================================
            // INTERNET CAIU DEPOIS DO NETINFO
            // =================================================

            if (
                !error.response
            ) {

                console.warn(
                    'API de Projetos indisponível - usando SQLite'
                );


                const locais =
                    await listarProjetoCodigosCache();


                return locais.map(
                    item => ({

                        label:
                            item.projeto_nome,

                        value:
                            item.server_id
                    })
                );
            }


            // =================================================
            // ERRO REAL DA API
            // =================================================

            console.error(
                'Erro da API ao buscar Códigos de Projeto:',
                error.response?.data ||
                error.message
            );


            return [];
        }
    };

// --- Funções de Fetch para Itens Filhos ---

// Colaborador (para ItemMedicaohh)
export const fetchColaboradores =
    async () => {

        const netInfo =
            await NetInfo.fetch();


        const offline =
            !netInfo.isConnected ||
            netInfo.isInternetReachable === false;


        // =================================================
        // OFFLINE
        // =================================================

        if (offline) {

            console.log(
                'Sem internet - carregando Colaboradores do SQLite'
            );


            const locais =
                await listarColaboradoresCache();


            return locais.map(
                item => ({

                    label:
                        `${item.matricula || ''} - ${item.nome}`,

                    value:
                        item.server_id
                })
            );
        }


        // =================================================
        // ONLINE
        // =================================================

        try {

            const {
                data
            } = await api.get(
                'api/v1/efetivo/colaboradores/'
            );


            const colaboradores =
                data?.results ||
                data ||
                [];


            // -------------------------------------------------
            // ATUALIZA CACHE GERAL
            // -------------------------------------------------

            try {

                await atualizarColaboradoresCache(
                    colaboradores
                );

            } catch (cacheError) {

                console.warn(
                    'API de Colaboradores carregou, mas o cache não pôde ser atualizado:',
                    cacheError.message
                );
            }


            return colaboradores.map(
                item => ({

                    label:
                        `${item.matricula || ''} - ${item.nome}`,

                    value:
                        item.id
                })
            );


        } catch (error) {

            // =================================================
            // FALHA DE REDE
            // =================================================

            if (
                !error.response
            ) {

                console.warn(
                    'API de Colaboradores indisponível - usando SQLite'
                );


                const locais =
                    await listarColaboradoresCache();


                return locais.map(
                    item => ({

                        label:
                            `${item.matricula || ''} - ${item.nome}`,

                        value:
                            item.server_id
                    })
                );
            }


            // =================================================
            // ERRO REAL DA API
            // =================================================

            console.error(
                'Erro da API ao buscar Colaboradores:',
                error.response?.data ||
                error.message
            );


            return [];
        }
    };

export const fetchColaboradoresDisponiveisHoje = async () => {

    try {

        const { data } =
            await api.get(
                'api/v1/efetivo/colaboradores-hoje/'
            );


        return data.map(item => ({

            label:
                `${item.matricula || ''} - ${item.nome}`,

            value:
                item.id
        }));

    } catch (error) {

        console.error(
            'Erro ao buscar Colaboradores:',
            error
        );

        return [];
    }
};

export const fetchColaboradoresList = async () => {

    try {

        const { data } =
            await api.get(
                'api/v1/efetivo/colaboradores/'
            );


        return data.map(item => ({

            label:
                `${item.matricula || ''} - ${item.nome}`,

            value:
                item.id
        }));

    } catch (error) {

        console.error(
            'Erro ao buscar Colaboradores:',
            error
        );

        return [];
    }
};


// Item Contrato (ItemBm - para HH e PIN)
export const fetchItemContratoOptions = async () => {
    try {
        // Você pode precisar de lógica de filtragem aqui (como o ItemBm.objects.filter no Django)
        const { data } = await api.get('api/v1/geral/itens-bm/');
        // Assumindo que o ItemBm tem 'descricao' e 'id'
        return data.map(item => ({ label: item.item_ref + item.descricao, value: item.id }));
    } catch (error) {
        console.error('Erro ao buscar Itens Contrato:', error);
        throw error;
    }
};

// --- MOCK para Choices (Ainda não é fetch, mas necessário para o Forms) ---
export const MOCK_OPTIONS_CHOICES = {
    tipo: [{ label: 'MONTAGEM', value: 'MONTAGEM' }, { label: 'MANUTENÇÃO', value: 'MANUTENÇÃO' }],
    disciplina: [{ label: 'PINTURA', value: 'PIN' }, { label: 'ANDAIME', value: 'AND' }],
    clima: [{ label: 'Sol', value: 'SOL' }, { label: 'Chuva', value: 'CHUVA' }, { label: 'Nublado', value: 'NUBLADO' }],
    bm: [{ label: 'BM 2024-05', value: 50 }, { label: 'BM 2024-06', value: 51 }], // Assumindo que BM é Choice ou um FK simples sem service dedicado
    tipo_serv_hh: [{ label: 'Interno', value: 'INT' }, { label: 'Externo', value: 'EXT' }],
    material_pin: [{ label: 'Tinta Base', value: 501 }, { label: 'Lixa Fina', value: 502 }],
};