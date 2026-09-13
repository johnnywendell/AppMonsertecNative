import React, {
    useState,
    useCallback,
    useEffect
} from 'react';

import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    TextInput
} from 'react-native';

import {
    useFocusEffect,
    useNavigation
} from '@react-navigation/native';

import {
    listarRelatorios
} from '../services/relatorioQualidadeService';

import {
    MaterialIcons
} from '@expo/vector-icons';

import {
    format,
    parseISO
} from 'date-fns';

import {
    ptBR
} from 'date-fns/locale';

const PRIMARY = '#00315c';

export default function QualidadeScreen() {
    const navigation = useNavigation();

    const [relatorios, setRelatorios] =
        useState([]);

    const [loading, setLoading] =
        useState(true);

    const [isRefreshing, setIsRefreshing] =
        useState(false);

    const [searchText, setSearchText] =
        useState('');

    const [page, setPage] =
        useState(1);

    const [loadingMore, setLoadingMore] =
        useState(false);

    const [hasMore, setHasMore] =
        useState(false);

    // =========================================================
    // BUSCAR RELATÓRIOS
    // =========================================================

    const fetchRelatorios = async (
        pageNum = 1,
        shouldRefresh = false
    ) => {
        if (pageNum > 1) {
            setLoadingMore(true);
        } else {
            setHasMore(false);
        }

        try {
            const response =
                await listarRelatorios({
                    page: pageNum,
                    search: searchText,
                });

            const data =
                response.results || [];

            setHasMore(
                Boolean(response.next)
            );

            if (
                shouldRefresh ||
                pageNum === 1
            ) {
                setRelatorios(data);
            } else {
                setRelatorios(prev => [
                    ...prev,
                    ...data
                ]);
            }

        } catch (error) {
            console.error(
                'Erro ao buscar relatórios:',
                error.response?.data ||
                error.message
            );

        } finally {
            setLoading(false);
            setLoadingMore(false);
            setIsRefreshing(false);
        }
    };

    // =========================================================
    // CARREGAR AO ENTRAR NA TELA
    // =========================================================

    useFocusEffect(
        useCallback(() => {
            if (searchText === '') {
                setPage(1);
                setHasMore(false);

                fetchRelatorios(
                    1,
                    true
                );
            }
        }, [])
    );

    // =========================================================
    // BUSCA COM DEBOUNCE
    // =========================================================

    useEffect(() => {
        if (searchText === '') return;

        const delayDebounce =
            setTimeout(() => {
                setPage(1);
                setHasMore(false);

                fetchRelatorios(
                    1,
                    true
                );
            }, 800);

        return () =>
            clearTimeout(
                delayDebounce
            );

    }, [searchText]);

    // =========================================================
    // REFRESH
    // =========================================================

    const handleRefresh = () => {
        setIsRefreshing(true);
        setPage(1);
        setHasMore(false);

        fetchRelatorios(
            1,
            true
        );
    };

    // =========================================================
    // PAGINAÇÃO
    // =========================================================

    const handleLoadMore = () => {
        if (
            loadingMore ||
            loading ||
            !hasMore
        ) {
            return;
        }

        const nextPage =
            page + 1;

        setPage(nextPage);

        fetchRelatorios(
            nextPage
        );
    };

    // =========================================================
    // FOOTER
    // =========================================================

    const renderFooter = () => {
        if (!loadingMore) {
            return null;
        }

        return (
            <View style={styles.loadingMore}>
                <ActivityIndicator
                    size="small"
                    color={PRIMARY}
                />
            </View>
        );
    };

    // =========================================================
    // ITEM
    // =========================================================

    const renderItem = ({
        item
    }) => {
        const dataFormatada =
            item.data
                ? format(
                    parseISO(item.data),
                    'dd/MM/yyyy',
                    {
                        locale: ptBR
                    }
                )
                : 'S/ Data';

        const ano =
            item.data
                ? String(
                    item.data
                ).substring(0, 4)
                : '----';

        const numero =
            `S${String(item.id)
                .padStart(4, '0')}/${ano}`;

        return (
            <TouchableOpacity
                style={
                    styles.itemContainer
                }
                activeOpacity={0.8}
                onPress={() =>
                    navigation.navigate(
                        'RelatorioForm',
                        {
                            id: item.id
                        }
                    )
                }
            >
                <View
                    style={
                        styles.textContainer
                    }
                >
                    <Text
                        style={
                            styles.relatorioTitle
                        }
                    >
                        Relatório Nº {numero}
                    </Text>

                    <Text
                        style={
                            styles.detailText
                        }
                    >
                        Data: {dataFormatada}
                    </Text>

                    <Text
                        style={
                            styles.detailText
                        }
                        numberOfLines={1}
                    >
                        Cliente: {
                            item.cliente ||
                            'Não informado'
                        }
                    </Text>

                    <Text
                        style={
                            styles.detailText
                        }
                        numberOfLines={1}
                    >
                        Inspetor: {
                            item.inspetor ||
                            'Não informado'
                        }
                    </Text>
                </View>

                <MaterialIcons
                    name="chevron-right"
                    size={30}
                    color={PRIMARY}
                />
            </TouchableOpacity>
        );
    };

    // =========================================================
    // RENDER
    // =========================================================

    return (
        <View
            style={
                styles.container
            }
        >
            {/* BUSCA */}

            <View
                style={
                    styles.searchContainer
                }
            >
                <MaterialIcons
                    name="search"
                    size={24}
                    color="#666"
                    style={
                        styles.searchIcon
                    }
                />

                <TextInput
                    style={
                        styles.searchInput
                    }
                    placeholder="Pesquisar relatório..."
                    value={searchText}
                    onChangeText={
                        setSearchText
                    }
                    clearButtonMode="while-editing"
                />
            </View>

            {/* LISTA */}

            <FlatList
                data={relatorios}

                renderItem={
                    renderItem
                }

                keyExtractor={
                    item =>
                        String(item.id)
                }

                contentContainerStyle={
                    styles.listContent
                }

                onEndReached={
                    handleLoadMore
                }

                onEndReachedThreshold={
                    0.3
                }

                ListFooterComponent={
                    renderFooter
                }

                refreshing={
                    isRefreshing
                }

                onRefresh={
                    handleRefresh
                }

                ListEmptyComponent={() =>
                    !loading ? (
                        <Text
                            style={
                                styles.emptyText
                            }
                        >
                            Nenhum relatório encontrado.
                        </Text>
                    ) : null
                }
            />

            {/* FAB */}

            <TouchableOpacity
                style={
                    styles.fab
                }
                onPress={() =>
                    navigation.navigate(
                        'RelatorioForm'
                    )
                }
            >
                <MaterialIcons
                    name="add"
                    size={28}
                    color="#fff"
                />
            </TouchableOpacity>
        </View>
    );
}

// =========================================================
// STYLES
// =========================================================

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },

    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        margin: 12,
        marginBottom: 6,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#ddd',
        paddingHorizontal: 10,
    },

    searchIcon: {
        marginRight: 6,
    },

    searchInput: {
        flex: 1,
        height: 46,
        fontSize: 15,
        color: '#333',
    },

    listContent: {
        padding: 12,
        paddingTop: 6,
        paddingBottom: 90,
    },

    itemContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 8,
        padding: 14,
        marginBottom: 10,

        elevation: 2,

        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 3,
        shadowOffset: {
            width: 0,
            height: 1
        },
    },

    textContainer: {
        flex: 1,
    },

    relatorioTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: PRIMARY,
        marginBottom: 5,
    },

    detailText: {
        fontSize: 13,
        color: '#666',
        marginTop: 2,
    },

    emptyText: {
        textAlign: 'center',
        color: '#777',
        marginTop: 40,
        fontSize: 14,
    },

    loadingMore: {
        paddingVertical: 20,
    },

    fab: {
        position: 'absolute',
        right: 20,
        bottom: 20,
        width: 58,
        height: 58,
        borderRadius: 29,
        backgroundColor: PRIMARY,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 6,
    },
});