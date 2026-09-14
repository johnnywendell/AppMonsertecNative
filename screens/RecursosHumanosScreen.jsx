import React, {
    useCallback,
    useEffect,
    useState
} from 'react';

import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    FlatList,
    StyleSheet,
    ActivityIndicator,
    RefreshControl
} from 'react-native';

import {
    useFocusEffect,
    useNavigation
} from '@react-navigation/native';

import {
    MaterialIcons
} from '@expo/vector-icons';

import {
    listarApontamentos
} from '../services/apontamentosService';

import {
    fetchUnidades,
    fetchProjetoCodigos,
    fetchColaboradoresList
} from '../services/dataService';


const PRIMARY = '#00315c';


// =========================================================
// DISCIPLINAS
// =========================================================

const DISCIPLINA_LABELS = {

    AND:
        'ANDAIME',

    PIN:
        'PINTURA',

    ISO:
        'ISOLAMENTO',
};


// =========================================================
// SCREEN
// =========================================================

export default function ApontamentosScreen() {

    const navigation =
        useNavigation();


    // =====================================================
    // ESTADOS
    // =====================================================

    const [
        apontamentos,
        setApontamentos
    ] = useState([]);


    const [
        searchText,
        setSearchText
    ] = useState('');


    const [
        search,
        setSearch
    ] = useState('');


    const [
        loading,
        setLoading
    ] = useState(false);


    const [
        loadingMore,
        setLoadingMore
    ] = useState(false);


    const [
        refreshing,
        setRefreshing
    ] = useState(false);


    const [
        page,
        setPage
    ] = useState(1);


    const [
        hasMore,
        setHasMore
    ] = useState(false);


    // =====================================================
    // DADOS AUXILIARES
    // =====================================================

    const [
        options,
        setOptions
    ] = useState({

        unidades:
            [],

        projetos:
            [],

        colaboradores:
            [],
    });


    // =====================================================
    // DEBOUNCE BUSCA
    // =====================================================

    useEffect(() => {

        const timeout =
            setTimeout(() => {

                setSearch(
                    searchText.trim()
                );

            }, 800);


        return () =>
            clearTimeout(
                timeout
            );

    }, [
        searchText
    ]);


    // =====================================================
    // CARREGAR DADOS AUXILIARES
    // =====================================================

    const carregarOptions =
        useCallback(async () => {

            try {

                const [
                    unidades,
                    projetos,
                    colaboradores
                ] = await Promise.all([

                    fetchUnidades(),

                    fetchProjetoCodigos(),

                    fetchColaboradoresList(),
                ]);


                setOptions({

                    unidades:
                        unidades || [],

                    projetos:
                        projetos || [],

                    colaboradores:
                        colaboradores || [],
                });


            } catch (error) {

                console.error(
                    'Erro carregando opções dos apontamentos:',
                    error.response?.data ||
                    error.message
                );
            }

        }, []);


    // =====================================================
    // CARREGA OPÇÕES UMA VEZ
    // =====================================================

    useEffect(() => {

        carregarOptions();

    }, [
        carregarOptions
    ]);


    // =====================================================
    // CARREGAR APONTAMENTOS
    // =====================================================

    const carregarApontamentos =
        useCallback(
            async (
                pagina = 1,
                append = false
            ) => {

                try {

                    if (
                        pagina === 1
                    ) {

                        setLoading(true);

                        setHasMore(false);

                    } else {

                        setLoadingMore(true);
                    }


                    const response =
                        await listarApontamentos({

                            page:
                                pagina,

                            search,
                        });


                    const novos =
                        response?.results ||
                        [];


                    if (append) {

                        setApontamentos(
                            prev => [
                                ...prev,
                                ...novos
                            ]
                        );

                    } else {

                        setApontamentos(
                            novos
                        );
                    }


                    setPage(
                        pagina
                    );


                    setHasMore(
                        Boolean(
                            response?.next
                        )
                    );


                } catch (error) {

                    console.error(
                        'Erro carregando apontamentos:',
                        error.response?.data ||
                        error.message
                    );


                } finally {

                    setLoading(false);

                    setLoadingMore(false);

                    setRefreshing(false);
                }

            },
            [
                search
            ]
        );


    // =====================================================
    // RECARREGAR AO ENTRAR NA TELA
    // =====================================================

    useFocusEffect(

        useCallback(() => {

            carregarApontamentos(
                1,
                false
            );

        }, [
            carregarApontamentos
        ])
    );


    // =====================================================
    // LOAD MORE
    // =====================================================

    const carregarMais = () => {

        if (
            loadingMore ||
            loading ||
            !hasMore
        ) {
            return;
        }


        carregarApontamentos(
            page + 1,
            true
        );
    };


    // =====================================================
    // REFRESH
    // =====================================================

    const atualizarLista = () => {

        setRefreshing(true);


        carregarApontamentos(
            1,
            false
        );


        carregarOptions();
    };


    // =====================================================
    // DATA
    // =====================================================

    const formatarData =
        value => {

            if (!value) {

                return '-';
            }


            const date =
                String(value)
                    .substring(0, 10)
                    .split('-');


            if (
                date.length !== 3
            ) {

                return value;
            }


            return (
                `${date[2]}/${date[1]}/${date[0]}`
            );
        };


    // =====================================================
    // BUSCAR LABEL PELO ID
    // =====================================================

    const getLabel = (
        lista,
        value
    ) => {

        if (
            value === null ||
            value === undefined ||
            value === ''
        ) {

            return '-';
        }


        const encontrado =
            lista.find(
                item =>
                    item.value ==
                    value
            );


        return (
            encontrado?.label ||
            '-'
        );
    };


    // =====================================================
    // CARD
    // =====================================================

    const renderItem = ({
        item
    }) => {

        // ---------------------------------------------
        // ÁREA / UNIDADE
        // ---------------------------------------------

        const area =
            getLabel(
                options.unidades,
                item.area
            );


        // ---------------------------------------------
        // PROJETO
        // ---------------------------------------------

        const projeto =
            getLabel(
                options.projetos,
                item.projeto_cod
            );


        // ---------------------------------------------
        // DISCIPLINA
        // ---------------------------------------------

        const disciplina =
            DISCIPLINA_LABELS[
                item.disciplina
            ] ||
            item.disciplina ||
            '-';


        // ---------------------------------------------
        // COLABORADORES
        // ---------------------------------------------

        const colaboradores =
            item.apontamentos ||
            [];


        return (

            <TouchableOpacity

                style={
                    styles.card
                }

                activeOpacity={
                    0.75
                }

                onPress={() =>
                    navigation.navigate(
                        'ApontamentoForm',
                        {
                            id:
                                item.id
                        }
                    )
                }
            >

                {/* ================================= */}
                {/* HEADER */}
                {/* ================================= */}

                <View
                    style={
                        styles.cardHeader
                    }
                >

                    <View
                        style={
                            styles.headerInfo
                        }
                    >

                        <Text
                            style={
                                styles.cardTitle
                            }
                        >
                            Apontamento #{item.id}
                        </Text>


                        <Text
                            style={
                                styles.cardDate
                            }
                        >
                            {formatarData(
                                item.data
                            )}
                        </Text>

                    </View>


                    <MaterialIcons
                        name="chevron-right"
                        size={26}
                        color="#999"
                    />

                </View>


                {/* ================================= */}
                {/* DADOS COMPACTOS */}
                {/* ================================= */}

                <View
                    style={
                        styles.metaContainer
                    }
                >

                    {/* UNIDADE */}

                    <View
                        style={
                            styles.metaRow
                        }
                    >

                        <MaterialIcons
                            name="business"
                            size={15}
                            color="#777"
                        />


                        <Text
                            style={
                                styles.metaLabel
                            }
                        >
                            Área:
                        </Text>


                        <Text

                            style={
                                styles.metaValue
                            }

                            numberOfLines={
                                1
                            }
                        >
                            {area}
                        </Text>

                    </View>


                    {/* PROJETO */}

                    <View
                        style={
                            styles.metaRow
                        }
                    >

                        <MaterialIcons
                            name="folder-open"
                            size={15}
                            color="#777"
                        />


                        <Text
                            style={
                                styles.metaLabel
                            }
                        >
                            Projeto:
                        </Text>


                        <Text

                            style={
                                styles.metaValue
                            }

                            numberOfLines={
                                1
                            }
                        >
                            {projeto}
                        </Text>

                    </View>


                    {/* DISCIPLINA */}

                    <View
                        style={
                            styles.metaRow
                        }
                    >

                        <MaterialIcons
                            name="construction"
                            size={15}
                            color="#777"
                        />


                        <Text
                            style={
                                styles.metaLabel
                            }
                        >
                            Disciplina:
                        </Text>


                        <Text
                            style={
                                styles.metaValue
                            }
                        >
                            {disciplina}
                        </Text>

                    </View>

                </View>


                {/* ================================= */}
                {/* DIVISOR */}
                {/* ================================= */}

                {
                    colaboradores.length >
                    0 &&
                    (
                        <View
                            style={
                                styles.divider
                            }
                        />
                    )
                }


                {/* ================================= */}
                {/* COLABORADORES */}
                {/* ================================= */}

                {
                    colaboradores.length >
                    0 &&
                    (

                        <View
                            style={
                                styles.colaboradoresContainer
                            }
                        >

                            <View
                                style={
                                    styles.colaboradoresHeader
                                }
                            >

                                <MaterialIcons
                                    name="groups"
                                    size={16}
                                    color="#666"
                                />


                                <Text
                                    style={
                                        styles.colaboradoresTitle
                                    }
                                >
                                    Colaboradores
                                </Text>

                            </View>


                            {
                                colaboradores.map(
                                    (
                                        colaborador,
                                        index
                                    ) => {

                                        const nome =
                                            getLabel(
                                                options.colaboradores,
                                                colaborador.colaborador
                                            );


                                        return (

                                            <View

                                                key={
                                                    `${item.id}-${colaborador.colaborador}-${index}`
                                                }

                                                style={
                                                    styles.colaboradorRow
                                                }
                                            >

                                                <View
                                                    style={
                                                        styles.bullet
                                                    }
                                                />


                                                <Text

                                                    style={
                                                        styles.colaboradorNome
                                                    }

                                                    numberOfLines={
                                                        1
                                                    }
                                                >
                                                    {nome}
                                                </Text>

                                            </View>
                                        );
                                    }
                                )
                            }

                        </View>
                    )
                }

            </TouchableOpacity>
        );
    };


    // =====================================================
    // RENDER
    // =====================================================

    return (

        <View
            style={
                styles.container
            }
        >

            {/* ========================================= */}
            {/* PESQUISA */}
            {/* ========================================= */}

            <View
                style={
                    styles.searchContainer
                }
            >

                <MaterialIcons
                    name="search"
                    size={22}
                    color="#777"
                />


                <TextInput

                    style={
                        styles.searchInput
                    }

                    placeholder="Pesquisar apontamentos..."

                    placeholderTextColor="#999"

                    value={
                        searchText
                    }

                    onChangeText={
                        setSearchText
                    }

                    returnKeyType="search"
                />

            </View>


            {/* ========================================= */}
            {/* LISTA */}
            {/* ========================================= */}

            {
                loading
                    ? (

                        <View
                            style={
                                styles.center
                            }
                        >

                            <ActivityIndicator
                                size="large"
                                color={PRIMARY}
                            />

                        </View>

                    )
                    : (

                        <FlatList

                            data={
                                apontamentos
                            }

                            keyExtractor={
                                item =>
                                    String(
                                        item.id
                                    )
                            }

                            renderItem={
                                renderItem
                            }

                            contentContainerStyle={[

                                styles.listContent,

                                apontamentos.length ===
                                0 &&
                                styles.emptyList
                            ]}

                            refreshControl={

                                <RefreshControl

                                    refreshing={
                                        refreshing
                                    }

                                    onRefresh={
                                        atualizarLista
                                    }

                                />
                            }

                            onEndReached={
                                carregarMais
                            }

                            onEndReachedThreshold={
                                0.3
                            }

                            ListEmptyComponent={

                                <View
                                    style={
                                        styles.emptyContainer
                                    }
                                >

                                    <MaterialIcons
                                        name="assignment"
                                        size={48}
                                        color="#bbb"
                                    />


                                    <Text
                                        style={
                                            styles.emptyText
                                        }
                                    >
                                        Nenhum apontamento encontrado.
                                    </Text>

                                </View>
                            }

                            ListFooterComponent={

                                loadingMore
                                    ? (

                                        <ActivityIndicator

                                            style={{
                                                marginVertical:
                                                    20
                                            }}

                                            color={
                                                PRIMARY
                                            }
                                        />

                                    )
                                    : null
                            }

                        />
                    )
            }


            {/* ========================================= */}
            {/* FAB */}
            {/* ========================================= */}

            <TouchableOpacity

                style={
                    styles.fab
                }

                activeOpacity={
                    0.8
                }

                onPress={() =>
                    navigation.navigate(
                        'ApontamentoForm'
                    )
                }
            >

                <MaterialIcons
                    name="add"
                    size={30}
                    color="#fff"
                />

            </TouchableOpacity>

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

            backgroundColor:
                '#f5f5f5',
        },


        // -------------------------------------------------
        // SEARCH
        // -------------------------------------------------

        searchContainer: {

            flexDirection:
                'row',

            alignItems:
                'center',

            marginHorizontal:
                16,

            marginTop:
                14,

            marginBottom:
                8,

            paddingHorizontal:
                14,

            backgroundColor:
                '#fff',

            borderRadius:
                10,

            borderWidth:
                1,

            borderColor:
                '#ddd',

            height:
                48,
        },


        searchInput: {

            flex: 1,

            marginLeft:
                8,

            fontSize:
                15,

            color:
                '#333',
        },


        // -------------------------------------------------
        // LIST
        // -------------------------------------------------

        listContent: {

            padding:
                16,

            paddingTop:
                8,

            paddingBottom:
                100,
        },


        emptyList: {

            flexGrow: 1,
        },


        center: {

            flex: 1,

            justifyContent:
                'center',

            alignItems:
                'center',
        },


        // -------------------------------------------------
        // CARD
        // -------------------------------------------------

        card: {

            backgroundColor:
                '#fff',

            borderRadius:
                10,

            padding:
                15,

            marginBottom:
                12,

            elevation:
                2,

            shadowColor:
                '#000',

            shadowOpacity:
                0.08,

            shadowRadius:
                3,

            shadowOffset: {
                width: 0,
                height: 1
            },
        },


        cardHeader: {

            flexDirection:
                'row',

            justifyContent:
                'space-between',

            alignItems:
                'center',
        },


        headerInfo: {

            flex:
                1,
        },


        cardTitle: {

            fontSize:
                16,

            fontWeight:
                '600',

            color:
                PRIMARY,
        },


        cardDate: {

            marginTop:
                3,

            fontSize:
                12,

            color:
                '#777',
        },


        // -------------------------------------------------
        // META
        // -------------------------------------------------

        metaContainer: {

            marginTop:
                10,

            backgroundColor:
                '#f8f9fa',

            borderRadius:
                7,

            paddingHorizontal:
                10,

            paddingVertical:
                7,
        },


        metaRow: {

            flexDirection:
                'row',

            alignItems:
                'center',

            minHeight:
                22,
        },


        metaLabel: {

            marginLeft:
                6,

            marginRight:
                4,

            fontSize:
                12,

            fontWeight:
                '600',

            color:
                '#666',
        },


        metaValue: {

            flex:
                1,

            fontSize:
                12,

            color:
                '#333',
        },


        divider: {

            height:
                1,

            backgroundColor:
                '#eee',

            marginVertical:
                10,
        },


        // -------------------------------------------------
        // COLABORADORES
        // -------------------------------------------------

        colaboradoresContainer: {

            paddingHorizontal:
                2,
        },


        colaboradoresHeader: {

            flexDirection:
                'row',

            alignItems:
                'center',

            marginBottom:
                5,
        },


        colaboradoresTitle: {

            marginLeft:
                5,

            fontSize:
                12,

            fontWeight:
                '700',

            color:
                '#666',
        },


        colaboradorRow: {

            flexDirection:
                'row',

            alignItems:
                'center',

            minHeight:
                20,

            paddingLeft:
                3,
        },


        bullet: {

            width:
                4,

            height:
                4,

            borderRadius:
                2,

            backgroundColor:
                '#999',

            marginRight:
                7,
        },


        colaboradorNome: {

            flex:
                1,

            fontSize:
                12,

            color:
                '#444',
        },


        // -------------------------------------------------
        // EMPTY
        // -------------------------------------------------

        emptyContainer: {

            flex: 1,

            justifyContent:
                'center',

            alignItems:
                'center',

            padding:
                30,
        },


        emptyText: {

            marginTop:
                12,

            color:
                '#888',

            fontSize:
                15,

            textAlign:
                'center',
        },


        // -------------------------------------------------
        // FAB
        // -------------------------------------------------

        fab: {

            position:
                'absolute',

            right:
                22,

            bottom:
                22,

            width:
                58,

            height:
                58,

            borderRadius:
                29,

            backgroundColor:
                PRIMARY,

            justifyContent:
                'center',

            alignItems:
                'center',

            elevation:
                5,
        },
    });