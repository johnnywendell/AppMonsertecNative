import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, TextInput } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { listarLevantamentos } from '../../services/levantamentoService';
import { MaterialIcons } from '@expo/vector-icons';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function LevantamentoListScreen() {
    const navigation = useNavigation();

    const [levantamentos, setLevantamentos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const [searchText, setSearchText] = useState('');
    const [page, setPage] = useState(1);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(false);

    const fetchLevantamentos = async (pageNum = 1, shouldRefresh = false) => {
        if (pageNum > 1) {
            setLoadingMore(true);
        } else {
            setHasMore(false);
        }

        try {
            console.log(`🌐 Buscando Levantamentos - página ${pageNum} - busca "${searchText}"`);

            const response = await listarLevantamentos({
                page: pageNum,
                search: searchText,
            });

            const data = response.results || [];

            console.log(
                `📡 API retornou ${data.length} Levantamento(s). Total: ${response.count ?? 'N/A'}`
            );

            setHasMore(Boolean(response.next));

            if (shouldRefresh || pageNum === 1) {
                setLevantamentos(data);
            } else {
                setLevantamentos(prev => [...prev, ...data]);
            }

        } catch (error) {
            console.error(
                '❌ Erro ao buscar lista de Levantamentos:',
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
                fetchLevantamentos(1, true);
            }
        }, [])
    );

    useEffect(() => {
        if (searchText === '') return;

        const delayDebounce = setTimeout(() => {
            setPage(1);
            setHasMore(false);
            fetchLevantamentos(1, true);
        }, 800);

        return () => clearTimeout(delayDebounce);
    }, [searchText]);

    const handleRefresh = () => {
        setIsRefreshing(true);
        setPage(1);
        setHasMore(false);
        fetchLevantamentos(1, true);
    };

    const handleLoadMore = () => {
        if (loadingMore || loading || !hasMore) return;

        const nextPage = page + 1;
        setPage(nextPage);
        fetchLevantamentos(nextPage);
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
        let lvtData = 'S/ Data';

        try {
            if (item.data) {
                lvtData = format(
                    parseISO(item.data),
                    'dd/MM/yyyy',
                    { locale: ptBR }
                );
            }
        } catch (error) {
            console.warn('Erro ao formatar data do Levantamento:', error);
        }

        return (
            <TouchableOpacity
                style={styles.itemContainer}
                onPress={() =>
                    navigation.navigate('LevantamentoForm', { id: item.id })
                }
                activeOpacity={0.8}
            >
                <View style={styles.textContainer}>
                    <Text style={styles.lvtTitle}>
                        LVT N° {String(item.id).padStart(5, '0')}
                    </Text>

                    <Text style={styles.detailText}>
                        Data: {lvtData} | Local: {item.local || 'N/I'}
                    </Text>

                    <Text style={styles.detailText} numberOfLines={1}>
                        Escopo: {item.escopo || 'N/E'}
                    </Text>
                </View>

                <MaterialIcons
                    name="chevron-right"
                    size={30}
                    color="#00315c"
                />
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            {/* BARRA DE PESQUISA */}
            <View style={styles.searchContainer}>
                <MaterialIcons name="search" size={24} color="#666" style={styles.searchIcon} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Pesquisar local, disciplina ou ID..."
                    value={searchText}
                    onChangeText={setSearchText}
                    clearButtonMode="while-editing"
                />
            </View>

            <FlatList
                data={levantamentos}
                renderItem={renderItem}
                keyExtractor={(item) => `lvt-${item.id}`}
                contentContainerStyle={styles.listContent}
                onEndReached={handleLoadMore}
                onEndReachedThreshold={0.3}
                ListFooterComponent={renderFooter}
                refreshing={isRefreshing}
                onRefresh={handleRefresh}
                keyboardShouldPersistTaps="handled"
                ListEmptyComponent={() => (
                    !loading && <Text style={styles.emptyText}>Nenhum levantamento encontrado.</Text>
                )}
            />
            
            <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('LevantamentoForm')}>
                <MaterialIcons name="add" size={28} color="white" />
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f5f7fa' },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        margin: 10,
        paddingHorizontal: 10,
        borderRadius: 8,
        elevation: 2,
        height: 45
    },
    searchIcon: { marginRight: 8 },
    searchInput: { flex: 1, fontSize: 16 },
    listContent: { paddingBottom: 80, paddingHorizontal: 10 },
    itemContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        marginVertical: 4,
        padding: 15,
        borderRadius: 8,
        borderLeftWidth: 5,
        elevation: 1
    },
    textContainer: { flex: 1 },
    lvtTitle: { fontSize: 17, fontWeight: 'bold', color: '#00315c', marginBottom: 2 },
    detailText: { fontSize: 13, color: '#666', marginTop: 1 },
    syncStatusText: { fontSize: 11, fontWeight: 'bold', marginTop: 5 },
    fab: {
        position: 'absolute',
        right: 20,
        bottom: 20,
        backgroundColor: '#00315c',
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 5
    },
    loadingMore: { paddingVertical: 15 },
    emptyText: { textAlign: 'center', marginTop: 50, color: '#999', fontSize: 14 }
});