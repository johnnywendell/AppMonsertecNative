import React, { useState, useCallback, useEffect } from 'react';
import {
    View, Text, StyleSheet, FlatList,
    TouchableOpacity, ActivityIndicator, TextInput
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { listarBoletinsMedicao } from '../../services/boletimMedicaoService';
import { MaterialIcons } from '@expo/vector-icons';

const formatPeriodo = (dateString) => {
    if (!dateString) return 'S/ Data';

    try {
        const [year, month, day] = dateString.split('-');
        return `${day}/${month}/${year}`;
    } catch {
        return dateString;
    }
};

export default function BoletimMedicaoListScreen() {
    const navigation = useNavigation();

    const [bms, setBMs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const [searchText, setSearchText] = useState('');
    const [page, setPage] = useState(1);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(false);

    const fetchBMs = async (pageNum = 1, shouldRefresh = false) => {
        if (pageNum > 1) {
            setLoadingMore(true);
        } else {
            setHasMore(false);
        }

        try {
            console.log(`🌐 Buscando BMs na API - página ${pageNum} - busca "${searchText}"`);

            const response = await listarBoletinsMedicao({
                page: pageNum,
                search: searchText,
            });

            const data = response.results || [];

            console.log(
                `📡 API retornou ${data.length} BM(s). Total: ${response.count ?? 'N/A'}`
            );

            setHasMore(Boolean(response.next));

            if (shouldRefresh || pageNum === 1) {
                setBMs(data);
            } else {
                setBMs(prev => [...prev, ...data]);
            }

        } catch (error) {
            console.error(
                '❌ Erro ao buscar lista de BMs:',
                error.response?.data || error.message
            );
        } finally {
            setLoading(false);
            setLoadingMore(false);
            setIsRefreshing(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            if (searchText === '') {
                setPage(1);
                setHasMore(false);
                fetchBMs(1, true);
            }
        }, [])
    );

    useEffect(() => {
        if (searchText === '') return;

        const delayDebounce = setTimeout(() => {
            setPage(1);
            setHasMore(false);
            fetchBMs(1, true);
        }, 800);

        return () => clearTimeout(delayDebounce);
    }, [searchText]);

    const handleRefresh = () => {
        setIsRefreshing(true);
        setPage(1);
        setHasMore(false);
        fetchBMs(1, true);
    };

    const handleLoadMore = () => {
        if (loadingMore || loading || !hasMore) return;

        const nextPage = page + 1;
        setPage(nextPage);
        fetchBMs(nextPage);
    };

    const renderFooter = () => {
        if (!loadingMore) return null;

        return (
            <View style={styles.loadingMore}>
                <ActivityIndicator size="small" color="#00315c" />
            </View>
        );
    };

    const renderItem = ({ item }) => {
        return (
            <TouchableOpacity
                style={styles.itemContainer}
                onPress={() =>
                    navigation.navigate('BoletimMedicaoForm', { id: item.id })
                }
                activeOpacity={0.8}
            >
                <View style={styles.textContainer}>
                    <Text style={styles.title}>
                        BM Nº {String(item.id).padStart(5, '0')} - {formatPeriodo(item.periodo_inicio)}
                    </Text>

                    <Text style={styles.subtitle}>
                        Status: {item.b_status || 'EM LANÇAMENTO'}
                    </Text>

                    <Text style={styles.subtitle} numberOfLines={1}>
                        Descrição: {item.descricao || 'Sem descrição'}
                    </Text>
                </View>

                <MaterialIcons name="chevron-right" size={30} color="#00315c" />
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.searchContainer}>
                <MaterialIcons
                    name="search"
                    size={24}
                    color="#666"
                    style={styles.searchIcon}
                />

                <TextInput
                    style={styles.searchInput}
                    placeholder="Pesquisar por Descrição, Nº ou ID..."
                    value={searchText}
                    onChangeText={setSearchText}
                    clearButtonMode="while-editing"
                />
            </View>

            <FlatList
                data={bms}
                renderItem={renderItem}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={styles.listContent}
                onEndReached={handleLoadMore}
                onEndReachedThreshold={0.3}
                ListFooterComponent={renderFooter}
                refreshing={isRefreshing}
                onRefresh={handleRefresh}
                ListEmptyComponent={() =>
                    !loading && (
                        <Text style={styles.emptyText}>
                            Nenhum boletim encontrado.
                        </Text>
                    )
                }
            />

            <TouchableOpacity
                style={styles.fab}
                onPress={() => navigation.navigate('BoletimMedicaoForm')}
            >
                <MaterialIcons name="add" size={28} color="white" />
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f5f5f5' },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        margin: 10,
        paddingHorizontal: 10,
        borderRadius: 8,
        elevation: 2,
        height: 48
    },
    searchIcon: { marginRight: 8 },
    searchInput: { flex: 1, fontSize: 16 },
    listContent: { paddingBottom: 100, paddingHorizontal: 10 },
    itemContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        marginVertical: 5,
        padding: 15,
        borderRadius: 8,
        borderLeftWidth: 6,
        elevation: 1
    },
    textContainer: { flex: 1 },
    title: { fontSize: 15, fontWeight: 'bold', color: '#00315c' },
    subtitle: { fontSize: 13, color: '#444', marginTop: 2 },
    syncStatusText: { fontSize: 11, fontWeight: 'bold', marginTop: 6, textTransform: 'uppercase' },
    fab: {
        position: 'absolute',
        right: 20,
        bottom: 25,
        backgroundColor: '#00315c',
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 8,
    },
    loadingMore: { paddingVertical: 20 },
    emptyText: { textAlign: 'center', marginTop: 50, color: '#999', fontSize: 16 }
});