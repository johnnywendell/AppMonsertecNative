import React, {
    useCallback,
    useMemo,
    useState
} from 'react';

import {
    View,
    Text,
    TextInput,
    StyleSheet,
    FlatList,
    ActivityIndicator
} from 'react-native';

import {
    useFocusEffect
} from '@react-navigation/native';

import {
    MaterialIcons
} from '@expo/vector-icons';

import {
    listarColaboradoresCache
} from '../../services/colaboradorService';

import {
    fetchColaboradores
} from '../../services/dataService';


const PRIMARY =
    '#00315c';


export default function ColaboradorListScreen() {

    const [
        colaboradores,
        setColaboradores
    ] = useState([]);


    const [
        search,
        setSearch
    ] = useState('');


    const [
        loading,
        setLoading
    ] = useState(true);


    const [
        isRefreshing,
        setIsRefreshing
    ] = useState(false);


    // =====================================================
    // CARREGAR CACHE
    // =====================================================

    const carregarColaboradores =
        useCallback(async () => {

            try {

                const data =
                    await listarColaboradoresCache();


                setColaboradores(
                    data || []
                );


            } catch (error) {

                console.error(
                    'Erro ao carregar cache de Colaboradores:',
                    error
                );


            } finally {

                setLoading(false);

                setIsRefreshing(false);
            }

        }, []);


    // =====================================================
    // AO ENTRAR NA TELA
    // =====================================================

    useFocusEffect(

        useCallback(() => {

            setLoading(true);

            carregarColaboradores();

        }, [
            carregarColaboradores
        ])
    );


    // =====================================================
    // ATUALIZAR CACHE
    // =====================================================

    const handleRefresh =
        async () => {

            setIsRefreshing(true);

            try {

                // Busca API e atualiza SQLite
                await fetchColaboradores();


                // Relê cache atualizado
                const data =
                    await listarColaboradoresCache();


                setColaboradores(
                    data || []
                );


            } catch (error) {

                console.error(
                    'Erro ao atualizar cache de Colaboradores:',
                    error
                );


            } finally {

                setIsRefreshing(false);
            }
        };


    // =====================================================
    // PESQUISA
    // =====================================================

    const colaboradoresFiltrados =
        useMemo(() => {

            const termo =
                search
                    .trim()
                    .toLowerCase();


            if (!termo) {

                return colaboradores;
            }


            return colaboradores.filter(
                item => {

                    const nome =
                        String(
                            item.nome || ''
                        ).toLowerCase();


                    const matricula =
                        String(
                            item.matricula || ''
                        ).toLowerCase();


                    const funcao =
                        String(
                            item.funcao || ''
                        ).toLowerCase();


                    const disciplina =
                        String(
                            item.disciplina || ''
                        ).toLowerCase();


                    return (
                        nome.includes(termo) ||
                        matricula.includes(termo) ||
                        funcao.includes(termo) ||
                        disciplina.includes(termo)
                    );
                }
            );

        }, [
            colaboradores,
            search
        ]);


    // =====================================================
    // ITEM
    // =====================================================

    const renderItem = ({
        item
    }) => (

        <View
            style={
                styles.itemContainer
            }
        >

            <View
                style={
                    styles.iconContainer
                }
            >

                <MaterialIcons
                    name="person"
                    size={23}
                    color={PRIMARY}
                />

            </View>


            <View
                style={
                    styles.textContainer
                }
            >

                <Text
                    style={
                        styles.nome
                    }
                >
                    {item.nome || '-'}
                </Text>


                <Text
                    style={
                        styles.matricula
                    }
                >
                    Matrícula: {item.matricula || '-'}
                </Text>


                <View
                    style={
                        styles.detailsRow
                    }
                >

                    <Text
                        style={
                            styles.detail
                        }
                    >
                        {item.funcao || '-'}
                    </Text>


                    <Text
                        style={
                            styles.separator
                        }
                    >
                        •
                    </Text>


                    <Text
                        style={
                            styles.detail
                        }
                    >
                        {item.disciplina || '-'}
                    </Text>

                </View>


                <Text
                    style={
                        styles.itemId
                    }
                >
                    ID: {item.server_id}
                </Text>

            </View>

        </View>
    );


    // =====================================================
    // LOADING
    // =====================================================

    if (
        loading &&
        colaboradores.length === 0
    ) {

        return (

            <View
                style={
                    styles.loadingContainer
                }
            >

                <ActivityIndicator
                    size="large"
                    color={PRIMARY}
                />


                <Text
                    style={
                        styles.loadingText
                    }
                >
                    Carregando colaboradores...
                </Text>

            </View>
        );
    }


    return (

        <View
            style={
                styles.container
            }
        >

            <FlatList

                data={
                    colaboradoresFiltrados
                }

                renderItem={
                    renderItem
                }

                keyExtractor={
                    item =>
                        String(
                            item.server_id
                        )
                }

                refreshing={
                    isRefreshing
                }

                onRefresh={
                    handleRefresh
                }

                contentContainerStyle={[
                    styles.listContent,

                    colaboradoresFiltrados.length === 0 &&
                    styles.emptyList
                ]}

                ListHeaderComponent={

                    <View>

                        <View
                            style={
                                styles.header
                            }
                        >

                            <Text
                                style={
                                    styles.headerTitle
                                }
                            >
                                Colaboradores
                            </Text>


                            <Text
                                style={
                                    styles.headerSubtitle
                                }
                            >
                                {colaboradores.length}
                                {' '}
                                {
                                    colaboradores.length === 1
                                        ? 'colaborador disponível'
                                        : 'colaboradores disponíveis'
                                }
                                {' • '}
                                puxe para atualizar
                            </Text>

                        </View>


                        <View
                            style={
                                styles.searchContainer
                            }
                        >

                            <MaterialIcons
                                name="search"
                                size={21}
                                color="#777"
                            />


                            <TextInput
                                style={
                                    styles.searchInput
                                }

                                value={
                                    search
                                }

                                onChangeText={
                                    setSearch
                                }

                                placeholder="Nome, matrícula, função ou disciplina..."

                                placeholderTextColor="#999"

                                autoCorrect={
                                    false
                                }
                            />

                        </View>

                    </View>
                }

                ListEmptyComponent={

                    !loading
                        ? (

                            <View
                                style={
                                    styles.emptyContainer
                                }
                            >

                                <MaterialIcons
                                    name={
                                        search
                                            ? 'search-off'
                                            : 'people'
                                    }
                                    size={48}
                                    color="#bbb"
                                />


                                <Text
                                    style={
                                        styles.emptyTitle
                                    }
                                >
                                    {
                                        search
                                            ? 'Nenhum colaborador encontrado'
                                            : 'Nenhum colaborador disponível'
                                    }
                                </Text>

                            </View>
                        )
                        : null
                }

            />

        </View>
    );
}


// =========================================================
// STYLES
// =========================================================

const styles =
    StyleSheet.create({

        container: {
            flex: 1,
            backgroundColor: '#f5f5f5',
        },

        listContent: {
            padding: 16,
            paddingBottom: 30,
        },

        emptyList: {
            flexGrow: 1,
        },

        header: {
            marginBottom: 12,
        },

        headerTitle: {
            fontSize: 18,
            fontWeight: '700',
            color: PRIMARY,
        },

        headerSubtitle: {
            marginTop: 3,
            fontSize: 12,
            color: '#777',
        },

        searchContainer: {
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: '#fff',
            borderRadius: 9,
            paddingHorizontal: 12,
            marginBottom: 14,
            elevation: 1,
        },

        searchInput: {
            flex: 1,
            height: 46,
            marginLeft: 8,
            fontSize: 14,
            color: '#333',
        },

        itemContainer: {
            flexDirection: 'row',
            backgroundColor: '#fff',
            borderRadius: 10,
            padding: 14,
            marginBottom: 9,
            elevation: 1,
        },

        iconContainer: {
            width: 42,
            height: 42,
            borderRadius: 21,
            backgroundColor: '#eef4f8',
            justifyContent: 'center',
            alignItems: 'center',
            marginRight: 12,
        },

        textContainer: {
            flex: 1,
        },

        nome: {
            fontSize: 15,
            fontWeight: '700',
            color: '#333',
        },

        matricula: {
            marginTop: 3,
            fontSize: 12,
            color: PRIMARY,
            fontWeight: '600',
        },

        detailsRow: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            alignItems: 'center',
            marginTop: 4,
        },

        detail: {
            fontSize: 12,
            color: '#666',
        },

        separator: {
            marginHorizontal: 6,
            color: '#aaa',
        },

        itemId: {
            marginTop: 6,
            fontSize: 10,
            color: '#aaa',
        },

        loadingContainer: {
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
        },

        loadingText: {
            marginTop: 10,
            color: '#777',
        },

        emptyContainer: {
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            padding: 30,
        },

        emptyTitle: {
            marginTop: 12,
            fontSize: 15,
            fontWeight: '600',
            color: '#666',
        },
    });