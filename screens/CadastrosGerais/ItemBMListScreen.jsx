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
    listarItensBmCache
} from '../../services/itembmService';

import {
    fetchItemContratoOptions
} from '../../services/dataService';

const PRIMARY =
    '#00315c';


export default function ItemBmListScreen() {

    // =====================================================
    // ESTADOS
    // =====================================================

    const [
        itensBm,
        setItensBm
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

    const carregarItens =
        useCallback(async () => {

            try {

                const data =
                    await listarItensBmCache();


                setItensBm(
                    data || []
                );


            } catch (error) {

                console.error(
                    'Erro ao buscar cache de Itens BM:',
                    error
                );


            } finally {

                setLoading(false);

                setIsRefreshing(false);
            }

        }, []);


    // =====================================================
    // RECARREGA AO ENTRAR
    // =====================================================

    useFocusEffect(

        useCallback(() => {

            setLoading(true);

            carregarItens();

        }, [
            carregarItens
        ])
    );


    // =====================================================
    // REFRESH
    // =====================================================

    const handleRefresh =
    async () => {

        setIsRefreshing(true);

        try {

            // =================================================
            // BUSCA API E ATUALIZA CACHE
            // =================================================

            await fetchItemContratoOptions();


            // =================================================
            // RECARREGA A LISTA A PARTIR DO CACHE ATUALIZADO
            // =================================================

            const data =
                await listarItensBmCache();


            setItensBm(
                data || []
            );


        } catch (error) {

            console.error(
                'Erro ao atualizar cache de Itens BM:',
                error
            );


        } finally {

            setIsRefreshing(false);
        }
    };


    // =====================================================
    // FILTRO LOCAL
    // =====================================================

    const itensFiltrados =
        useMemo(() => {

            const termo =
                search
                    .trim()
                    .toLowerCase();


            if (!termo) {

                return itensBm;
            }


            return itensBm.filter(
                item => {

                    const itemRef =
                        String(
                            item.item_ref || ''
                        ).toLowerCase();


                    const descricao =
                        String(
                            item.descricao || ''
                        ).toLowerCase();


                    return (
                        itemRef.includes(
                            termo
                        ) ||
                        descricao.includes(
                            termo
                        )
                    );
                }
            );

        }, [
            itensBm,
            search
        ]);


    // =====================================================
    // PREÇO
    // =====================================================

    const formatarPreco =
        value => {

            const numero =
                Number(value);


            if (
                !Number.isFinite(numero)
            ) {

                return '-';
            }


            return numero.toLocaleString(
                'pt-BR',
                {
                    style: 'currency',
                    currency: 'BRL'
                }
            );
        };


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
                    styles.cardHeader
                }
            >

                <View
                    style={
                        styles.iconContainer
                    }
                >

                    <MaterialIcons
                        name="receipt-long"
                        size={22}
                        color={PRIMARY}
                    />

                </View>


                <View
                    style={
                        styles.headerText
                    }
                >

                    <Text
                        style={
                            styles.itemRef
                        }
                        numberOfLines={1}
                    >
                        {item.item_ref || '-'}
                    </Text>


                    <Text
                        style={
                            styles.descricao
                        }
                        numberOfLines={3}
                    >
                        {item.descricao || '-'}
                    </Text>

                </View>

            </View>


            <View
                style={
                    styles.divider
                }
            />


            <View
                style={
                    styles.detailsContainer
                }
            >

                <View
                    style={
                        styles.detailRow
                    }
                >

                    <Text
                        style={
                            styles.detailLabel
                        }
                    >
                        Disciplina:
                    </Text>


                    <Text
                        style={
                            styles.detailValue
                        }
                    >
                        {item.disciplina || '-'}
                    </Text>

                </View>


                <View
                    style={
                        styles.detailRow
                    }
                >

                    <Text
                        style={
                            styles.detailLabel
                        }
                    >
                        Unidade:
                    </Text>


                    <Text
                        style={
                            styles.detailValue
                        }
                    >
                        {item.und || '-'}
                    </Text>

                </View>


                <View
                    style={
                        styles.detailRow
                    }
                >

                    <Text
                        style={
                            styles.detailLabel
                        }
                    >
                        Preço:
                    </Text>


                    <Text
                        style={
                            styles.precoValue
                        }
                    >
                        {formatarPreco(
                            item.preco_item
                        )}
                    </Text>

                </View>

            </View>


            <Text
                style={
                    styles.itemId
                }
            >
                ID: {item.server_id}
            </Text>

        </View>
    );


    // =====================================================
    // LOADING
    // =====================================================

    if (
        loading &&
        itensBm.length === 0
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
                    Carregando itens de contrato...
                </Text>

            </View>
        );
    }


    // =====================================================
    // RENDER
    // =====================================================

    return (

        <View
            style={
                styles.container
            }
        >

            <FlatList

                data={
                    itensFiltrados
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

                contentContainerStyle={[
                    styles.listContent,

                    itensFiltrados.length === 0 &&
                    styles.emptyList
                ]}

                refreshing={
                    isRefreshing
                }

                onRefresh={
                    handleRefresh
                }

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
                                Itens de Contrato
                            </Text>


                            <Text
                                style={
                                    styles.headerSubtitle
                                }
                            >
                                {itensBm.length}
                                {' '}
                                {
                                    itensBm.length === 1
                                        ? 'item disponível'
                                        : 'itens disponíveis'
                                }
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

                                placeholder="Pesquisar por item ou descrição..."

                                placeholderTextColor="#999"

                                autoCorrect={
                                    false
                                }

                                autoCapitalize="none"

                                clearButtonMode="while-editing"

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
                                            : 'receipt-long'
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
                                            ? 'Nenhum item encontrado'
                                            : 'Nenhum item disponível'
                                    }

                                </Text>


                                <Text
                                    style={
                                        styles.emptyText
                                    }
                                >

                                    {
                                        search
                                            ? 'Nenhum item corresponde à pesquisa informada.'
                                            : 'O cache local ainda não possui Itens BM.'
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

            backgroundColor:
                '#f5f5f5',
        },


        listContent: {

            padding:
                16,

            paddingBottom:
                30,
        },


        emptyList: {

            flexGrow: 1,
        },


        // -------------------------------------------------
        // HEADER
        // -------------------------------------------------

        header: {

            marginBottom:
                12,
        },


        headerTitle: {

            fontSize:
                18,

            fontWeight:
                '700',

            color:
                PRIMARY,
        },


        headerSubtitle: {

            marginTop:
                3,

            fontSize:
                12,

            color:
                '#777',
        },


        // -------------------------------------------------
        // SEARCH
        // -------------------------------------------------

        searchContainer: {

            flexDirection:
                'row',

            alignItems:
                'center',

            backgroundColor:
                '#fff',

            borderRadius:
                9,

            paddingHorizontal:
                12,

            marginBottom:
                14,

            elevation:
                1,

            shadowColor:
                '#000',

            shadowOpacity:
                0.05,

            shadowRadius:
                2,

            shadowOffset: {
                width: 0,
                height: 1
            },
        },


        searchInput: {

            flex:
                1,

            height:
                46,

            marginLeft:
                8,

            fontSize:
                14,

            color:
                '#333',
        },


        // -------------------------------------------------
        // CARD
        // -------------------------------------------------

        itemContainer: {

            backgroundColor:
                '#fff',

            borderRadius:
                10,

            padding:
                14,

            marginBottom:
                10,

            elevation:
                1,

            shadowColor:
                '#000',

            shadowOpacity:
                0.06,

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

            alignItems:
                'flex-start',
        },


        iconContainer: {

            width:
                40,

            height:
                40,

            borderRadius:
                20,

            backgroundColor:
                '#eef4f8',

            justifyContent:
                'center',

            alignItems:
                'center',

            marginRight:
                11,
        },


        headerText: {

            flex:
                1,
        },


        itemRef: {

            fontSize:
                15,

            fontWeight:
                '700',

            color:
                PRIMARY,
        },


        descricao: {

            marginTop:
                3,

            fontSize:
                13,

            lineHeight:
                18,

            color:
                '#444',
        },


        divider: {

            height:
                1,

            backgroundColor:
                '#eee',

            marginVertical:
                11,
        },


        // -------------------------------------------------
        // DETAILS
        // -------------------------------------------------

        detailsContainer: {

            backgroundColor:
                '#f8f9fa',

            borderRadius:
                7,

            paddingHorizontal:
                10,

            paddingVertical:
                7,
        },


        detailRow: {

            flexDirection:
                'row',

            alignItems:
                'center',

            minHeight:
                22,
        },


        detailLabel: {

            width:
                75,

            fontSize:
                12,

            fontWeight:
                '600',

            color:
                '#666',
        },


        detailValue: {

            flex:
                1,

            fontSize:
                12,

            color:
                '#333',
        },


        precoValue: {

            flex:
                1,

            fontSize:
                12,

            fontWeight:
                '600',

            color:
                '#333',
        },


        itemId: {

            marginTop:
                7,

            fontSize:
                10,

            color:
                '#aaa',

            textAlign:
                'right',
        },


        // -------------------------------------------------
        // LOADING
        // -------------------------------------------------

        loadingContainer: {

            flex: 1,

            justifyContent:
                'center',

            alignItems:
                'center',

            backgroundColor:
                '#f5f5f5',
        },


        loadingText: {

            marginTop:
                10,

            fontSize:
                13,

            color:
                '#777',
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


        emptyTitle: {

            marginTop:
                12,

            fontSize:
                16,

            fontWeight:
                '600',

            color:
                '#666',
        },


        emptyText: {

            marginTop:
                5,

            fontSize:
                13,

            color:
                '#999',

            textAlign:
                'center',
        },
    });