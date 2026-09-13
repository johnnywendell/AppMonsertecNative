import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, TextInput } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { listarRDCs } from '../../services/rdcService';
import { MaterialIcons } from '@expo/vector-icons';
import { format, parseISO } from 'date-fns'; 
import { ptBR } from 'date-fns/locale';

export default function RdcListScreen() {
    const navigation = useNavigation();
    const [rdcs, setRdcs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    
    // --- ESTADOS PARA BUSCA E PAGINAÇÃO ---
    const [searchText, setSearchText] = useState(""); // Novo estado para busca
    const [page, setPage] = useState(1);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(false);


    const fetchRdcs = async (
            pageNum = 1,
            shouldRefresh = false
        ) => {

            if (pageNum > 1) {
                setLoadingMore(true);
            } else {
                // Enquanto carrega a primeira página,
                // impede o FlatList de tentar página 2 prematuramente
                setHasMore(false);
            }

            try {

                const response = await listarRDCs({
                    page: pageNum,
                    search: searchText,
                });

                const data = response.results || [];

                console.log(
                    `📡 API retornou ${data.length} RDC(s). Total: ${response.count ?? 'N/A'}`
                );

                // O próprio DRF informa se existe próxima página
                setHasMore(Boolean(response.next));

                if (shouldRefresh || pageNum === 1) {
                    setRdcs(data);
                } else {
                    setRdcs(prev => [
                        ...prev,
                        ...data,
                    ]);
                }

            } catch (error) {

                console.error(
                    '❌ Erro ao buscar lista de RDCs:',
                    error.response?.data || error.message
                );

            } finally {

                setLoading(false);
                setLoadingMore(false);
                setIsRefreshing(false);
            }
        };

    // Efeito para disparar a busca quando o usuário digita (Debounce simples)
    useFocusEffect(
        useCallback(() => {
            if (searchText === "") {
                setPage(1);
                fetchRdcs(1, true);
            }
        }, []) // Removido searchText daqui para não entrar em loop
    );

    // 2. Debounce apenas para quando o usuário digita
    useEffect(() => {
        // Se o campo estiver vazio, não faz nada (o FocusEffect acima cuida disso)
        if (searchText === "") return;

        const delayDebounce = setTimeout(() => {
            setPage(1);
            fetchRdcs(1, true);
        }, 800); // Aumentei um pouco para dar mais tempo ao usuário

        return () => clearTimeout(delayDebounce);
    }, [searchText]);

    const handleRefresh = () => {
        setIsRefreshing(true);
        setPage(1);
        fetchRdcs(1, true);
    };

    const handleLoadMore = () => {

        if (loadingMore || !hasMore) {
            return;
        }

        const nextPage = page + 1;

        setPage(nextPage);
        fetchRdcs(nextPage);
    };

    // --- RENDERIZAÇÃO ---
    const renderFooter = () => {
        if (!loadingMore) return null;
        return (
            <View style={styles.loadingMore}>
                <ActivityIndicator size="small" color="#00315c" />
            </View>
        );
    };

    const renderItem = ({ item }) => {
            let rdcData = item.data
                ? format(
                    parseISO(item.data),
                    'dd/MM/yyyy',
                    { locale: ptBR }
                )
                : 'S/ Data';

            return (
                <TouchableOpacity
                    style={styles.itemContainer}
                    onPress={() =>
                        navigation.navigate(
                            'RdcForm',
                            { id: item.id }
                        )
                    }
                    activeOpacity={0.8}
                >
                    <View style={styles.textContainer}>

                        <Text style={styles.rdcTitle}>
                            RDC N° {String(item.id).padStart(5, '0')}
                        </Text>

                        <Text style={styles.detailText}>
                            Data: {rdcData} | Local: {item.local}
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
                    placeholder="Pesquisar por local ou disciplina..."
                    value={searchText}
                    onChangeText={setSearchText}
                    clearButtonMode="while-editing"
                />
            </View>

            <FlatList
                data={rdcs}
                renderItem={renderItem}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={styles.listContent}
                onEndReached={handleLoadMore}
                onEndReachedThreshold={0.3}
                ListFooterComponent={renderFooter}
                refreshing={isRefreshing}
                onRefresh={handleRefresh}
                ListEmptyComponent={() => (
                    !loading && <Text style={styles.emptyText}>Nenhum RDC encontrado.</Text>
                )}
            />
            
            <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('RdcForm')}>
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
        height: 45
    },
    searchIcon: { marginRight: 8 },
    searchInput: { flex: 1, fontSize: 16 },
    listContent: { paddingBottom: 80 },
    itemContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        marginHorizontal: 10,
        marginVertical: 5,
        padding: 15,
        borderRadius: 5,
        borderLeftWidth: 5,
        elevation: 1
    },
    textContainer: { flex: 1 },
    rdcTitle: { fontSize: 16, fontWeight: 'bold', color: '#333' },
    detailText: { fontSize: 14, color: '#666', marginTop: 2 },
    syncStatusText: { fontSize: 12, fontWeight: 'bold', marginTop: 5 },
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
    loading: { flex: 1, justifyContent: 'center' },
    loadingMore: { paddingVertical: 20 },
    emptyText: { textAlign: 'center', marginTop: 50, color: '#999' }
});