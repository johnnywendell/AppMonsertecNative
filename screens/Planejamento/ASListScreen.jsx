import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, TextInput } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { listarASs } from '../../services/asService';
import { MaterialIcons } from '@expo/vector-icons';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function ASListScreen() {
    const navigation = useNavigation();

    const [ass, setASs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const [searchText, setSearchText] = useState('');
    const [page, setPage] = useState(1);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(false);

    const fetchASs = async (pageNum = 1, shouldRefresh = false) => {
        if (pageNum > 1) {
            setLoadingMore(true);
        } else {
            setHasMore(false);
        }

        try {
            console.log(`🌐 Buscando ASs na API - página ${pageNum} - busca "${searchText}"`);

            const response = await listarASs({
                page: pageNum,
                search: searchText,
            });

            const data = response.results || [];

            console.log(`📡 API retornou ${data.length} AS(s). Total: ${response.count ?? 'N/A'}`);

            setHasMore(Boolean(response.next));

            if (shouldRefresh || pageNum === 1) {
                setASs(data);
            } else {
                setASs(prev => [...prev, ...data]);
            }

        } catch (error) {
            console.error(
                '❌ Erro ao buscar lista de ASs:',
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
                fetchASs(1, true);
            }
        }, [])
    );

    useEffect(() => {
        if (searchText === '') return;

        const delayDebounce = setTimeout(() => {
            setPage(1);
            setHasMore(false);
            fetchASs(1, true);
        }, 800);

        return () => clearTimeout(delayDebounce);
    }, [searchText]);

    const handleRefresh = () => {
        setIsRefreshing(true);
        setPage(1);
        setHasMore(false);
        fetchASs(1, true);
    };

    const handleLoadMore = () => {
        if (loadingMore || loading || !hasMore) return;

        const nextPage = page + 1;
        setPage(nextPage);
        fetchASs(nextPage);
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
        let asData = 'S/ Data';

        try {
            if (item.data) {
                asData = format(parseISO(item.data), 'dd/MM/yyyy', { locale: ptBR });
            }
        } catch (e) {
            console.warn('Erro data AS:', e);
        }

        return (
            <TouchableOpacity
                style={styles.itemContainer}
                onPress={() => navigation.navigate('ASForm', { id: item.id })}
                activeOpacity={0.8}
            >
                <View style={styles.textContainer}>
                    <Text style={styles.asTitle}>
                        AS Nº {item.as_sap || String(item.id).padStart(5, '0')}
                    </Text>

                    <Text style={styles.detailText}>
                        Data: {asData} | Local: {item.local || 'N/A'}
                    </Text>

                    <Text style={styles.detailText}>
                        Status: {item.status_as || 'Pendente'}
                    </Text>
                </View>

                <MaterialIcons name="chevron-right" size={30} color="#00315c" />
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.searchContainer}>
                <MaterialIcons name="search" size={24} color="#666" style={styles.searchIcon} />

                <TextInput
                    style={styles.searchInput}
                    placeholder="Pesquisar por Local, OS ou ID..."
                    value={searchText}
                    onChangeText={setSearchText}
                    clearButtonMode="while-editing"
                />
            </View>

            <FlatList
                data={ass}
                renderItem={renderItem}
                keyExtractor={item => item.id.toString()}
                contentContainerStyle={styles.listContent}
                onEndReached={handleLoadMore}
                onEndReachedThreshold={0.3}
                ListFooterComponent={renderFooter}
                refreshing={isRefreshing}
                onRefresh={handleRefresh}
                ListEmptyComponent={() =>
                    !loading && <Text style={styles.emptyText}>Nenhuma AS encontrada.</Text>
                }
            />

            <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('ASForm')}>
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
    listContent: { paddingBottom: 100 },
    itemContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        marginHorizontal: 10,
        marginVertical: 5,
        padding: 15,
        borderRadius: 8,
        borderLeftWidth: 6,
        elevation: 1
    },
    textContainer: { flex: 1 },
    asTitle: { fontSize: 16, fontWeight: 'bold', color: '#00315c' },
    detailText: { fontSize: 14, color: '#444', marginTop: 2 },
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
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 4.65,
    },
    loadingMore: { paddingVertical: 20 },
    emptyText: { textAlign: 'center', marginTop: 50, color: '#999', fontSize: 16 }
});