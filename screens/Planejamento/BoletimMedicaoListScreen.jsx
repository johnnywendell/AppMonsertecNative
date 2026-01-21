import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, TextInput } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { listarBoletinsMedicao, buscarBoletinsNaAPI } from '../../services/boletimMedicaoService'; 
import { MaterialIcons } from '@expo/vector-icons';

// Função auxiliar para formatar datas
const formatPeriodo = (dateString) => {
    if (!dateString) return 'S/ Data';
    try {
        const [year, month, day] = dateString.split('-');
        return `${day}/${month}/${year}`;
    } catch (e) {
        return dateString;
    }
};

export default function BoletimMedicaoListScreen() {
    const navigation = useNavigation();
    const [bms, setBMs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    
    // --- ESTADOS PARA BUSCA E PAGINAÇÃO ---
    const [searchText, setSearchText] = useState(""); 
    const [page, setPage] = useState(1);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const PAGE_SIZE = 15;

    const fetchBMs = async (pageNum = 1, shouldRefresh = false) => {
        if (pageNum > 1) setLoadingMore(true);
        
        try {
            // 1. Se tem busca e é a primeira página, tenta buscar no servidor primeiro
            if (searchText.length > 0 && pageNum === 1) {
                console.log("🔍 Buscando BMs na API por:", searchText);
                await buscarBoletinsNaAPI(searchText); 
            }

            // 2. Busca no SQLite local (Padrão de performance offline-first)
            const data = await listarBoletinsMedicao(pageNum, PAGE_SIZE, searchText);
            
            console.log(`📊 SQLite retornou ${data.length} BMs.`);

            // Verifica se ainda há mais páginas para carregar
            if (data.length < PAGE_SIZE) {
                setHasMore(false);
            } else {
                setHasMore(true);
            }

            if (shouldRefresh || pageNum === 1) {
                setBMs(data);
            } else {
                setBMs(prev => [...prev, ...data]);
            }
        } catch (error) {
            console.error('Erro ao buscar lista de BMs:', error);
        } finally {
            setLoading(false);
            setLoadingMore(false);
            setIsRefreshing(false);
        }
    };

    // Recarrega ao ganhar foco (apenas se não estiver pesquisando)
    useFocusEffect(
        useCallback(() => {
            if (searchText === "") {
                setPage(1);
                fetchBMs(1, true);
            }
        }, [])
    );

    // Debounce para a barra de pesquisa (evita chamadas excessivas)
    useEffect(() => {
        if (searchText === "") return;

        const delayDebounce = setTimeout(() => {
            setPage(1);
            fetchBMs(1, true);
        }, 800);

        return () => clearTimeout(delayDebounce);
    }, [searchText]);

    const handleRefresh = () => {
        setIsRefreshing(true);
        setPage(1);
        fetchBMs(1, true);
    };

    const handleLoadMore = () => {
        if (!loadingMore && hasMore && !loading) {
            const nextPage = page + 1;
            setPage(nextPage);
            fetchBMs(nextPage);
        }
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
        const isPending = item.sync_status === 'pending' || item.sync_status === 'update_pending';
        const syncColor = isPending ? '#ffc107' : '#28a745';

        return (
            <TouchableOpacity 
                style={[styles.itemContainer, { borderLeftColor: syncColor }]} 
                onPress={() => navigation.navigate('BoletimMedicaoForm', { id: item.id })}
                activeOpacity={0.8}
            >
                <View style={styles.textContainer}>
                    <Text style={styles.title}>
                        BM Nº {item.server_id || 'LOCAL'} - {formatPeriodo(item.periodo_inicio)}
                    </Text> 
                    <Text style={styles.subtitle}>Status: {item.b_status || 'EM LANÇAMENTO'}</Text>
                    <Text style={styles.subtitle} numberOfLines={1}>
                        Descrição: {item.descricao || 'Sem descrição'}
                    </Text>
                    
                    <Text style={[styles.syncStatusText, { color: syncColor }]}>
                        {isPending ? '🟡 Alterações Pendentes' : '🟢 Sincronizado'}
                    </Text>
                </View>
                <MaterialIcons name="chevron-right" size={30} color="#00315c" />
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
                ListEmptyComponent={() => (
                    !loading && <Text style={styles.emptyText}>Nenhum boletim encontrado.</Text>
                )}
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