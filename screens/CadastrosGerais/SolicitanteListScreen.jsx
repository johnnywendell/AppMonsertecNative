import React, {
    useCallback,
    useState
} from 'react';

import {
    View,
    Text,
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
    listarSolicitantesCache
} from '../../services/solicitanteService';


const PRIMARY =
    '#00315c';


export default function SolicitanteListScreen() {

    // =====================================================
    // ESTADOS
    // =====================================================

    const [
        solicitantes,
        setSolicitantes
    ] = useState([]);


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

    const carregarSolicitantes =
        useCallback(async () => {

            try {

                const data =
                    await listarSolicitantesCache();


                setSolicitantes(
                    data || []
                );


            } catch (error) {

                console.error(
                    'Erro ao buscar cache de Solicitantes:',
                    error
                );


            } finally {

                setLoading(false);

                setIsRefreshing(false);
            }

        }, []);


    // =====================================================
    // RECARREGA AO ENTRAR NA TELA
    // =====================================================

    useFocusEffect(

        useCallback(() => {

            setLoading(true);

            carregarSolicitantes();

        }, [
            carregarSolicitantes
        ])
    );


    // =====================================================
    // REFRESH
    // =====================================================

    const handleRefresh = () => {

        setIsRefreshing(true);

        carregarSolicitantes();
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
                    styles.iconContainer
                }
            >

                <MaterialIcons
                    name="person"
                    size={22}
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
                        styles.itemName
                    }
                    numberOfLines={2}
                >
                    {item.solicitante || '-'}
                </Text>


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
        solicitantes.length === 0
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
                    Carregando solicitantes...
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
                    solicitantes
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

                    solicitantes.length === 0 &&
                    styles.emptyList
                ]}

                refreshing={
                    isRefreshing
                }

                onRefresh={
                    handleRefresh
                }

                ListHeaderComponent={

                    solicitantes.length > 0
                        ? (

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
                                    Solicitantes
                                </Text>


                                <Text
                                    style={
                                        styles.headerSubtitle
                                    }
                                >
                                    {solicitantes.length}
                                    {' '}
                                    {
                                        solicitantes.length === 1
                                            ? 'solicitante disponível'
                                            : 'solicitantes disponíveis'
                                    }
                                </Text>

                            </View>
                        )
                        : null
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
                                    name="person-off"
                                    size={48}
                                    color="#bbb"
                                />


                                <Text
                                    style={
                                        styles.emptyTitle
                                    }
                                >
                                    Nenhum solicitante disponível
                                </Text>


                                <Text
                                    style={
                                        styles.emptyText
                                    }
                                >
                                    O cache local ainda não possui Solicitantes.
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
                14,
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
        // ITEM
        // -------------------------------------------------

        itemContainer: {

            flexDirection:
                'row',

            alignItems:
                'center',

            backgroundColor:
                '#fff',

            borderRadius:
                10,

            padding:
                14,

            marginBottom:
                9,

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
                12,
        },


        textContainer: {

            flex:
                1,
        },


        itemName: {

            fontSize:
                14,

            fontWeight:
                '600',

            color:
                '#333',
        },


        itemId: {

            marginTop:
                3,

            fontSize:
                11,

            color:
                '#999',
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