import React, { useState, useCallback, useRef } from 'react';
import { 
    View, TouchableOpacity, StyleSheet, Text, FlatList, 
    ActivityIndicator, RefreshControl, SafeAreaView 
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { listarRelatorios } from '../services/relatorioQualidadeService';

export default function QualidadeScreen() {
    const navigation = useNavigation();
    
    const [relatorios, setRelatorios] = useState([]);
    const [loading, setLoading] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [page, setPage] = useState(1);
    const [hasNextPage, setHasNextPage] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Trava de segurança para evitar múltiplas chamadas simultâneas
    const isFetching = useRef(false);

    const carregarDados = useCallback(async (paginaAlvo = 1, isRefreshing = false) => {
        // Regras para ignorar a chamada
        if (isFetching.current) return;
        if (paginaAlvo > 1 && !hasNextPage) return;

        try {
            isFetching.current = true;
            
            if (paginaAlvo === 1) {
                if (!isRefreshing) setLoading(true);
            } else {
                setLoadingMore(true);
            }

            console.log(`Buscando página: ${paginaAlvo}`); // Para debug no log
            const data = await listarRelatorios(paginaAlvo);
            
            // Tratamento do retorno da API (Garante que novosRelatorios seja um array)
            const novosRelatorios = data?.results || [];
            
            setRelatorios(prev => {
                if (paginaAlvo === 1) return novosRelatorios;
                // Evita duplicados comparando IDs
                const idsExistentes = new Set(prev.map(r => r.id));
                const filtrados = novosRelatorios.filter(r => !idsExistentes.has(r.id));
                return [...prev, ...filtrados];
            });

            setHasNextPage(!!data?.next); // Se data.next for null, hasNextPage vira false
            setPage(paginaAlvo);

        } catch (error) {
            console.error("Erro na busca:", error);
        } finally {
            isFetching.current = false;
            setLoading(false);
            setLoadingMore(false);
            setRefreshing(false);
        }
    }, [hasNextPage]);

    // useFocusEffect dispara ao entrar na tela.
    useFocusEffect(
        useCallback(() => {
            carregarDados(1);
            // Retorno vazio para limpeza
            return () => {};
        }, [carregarDados])
    );

    const handleRefresh = () => {
        setHasNextPage(true); // Reseta a paginação no refresh
        carregarDados(1, true);
    };

    const handleLoadMore = () => {
        // Só dispara se não estiver carregando nada e se houver próxima página
        if (!isFetching.current && hasNextPage && !loading && !loadingMore) {
            carregarDados(page + 1);
        }
    };

    // --- RENDER ITEM ---
    const renderItem = ({ item }) => {
        const ano = item.data ? item.data.split('-')[0] : '---';
        const numeroFormatado = `#S${String(item.id).padStart(4, '0')}/${ano}`;

        return (
            <TouchableOpacity
                style={styles.card}
                onPress={() => navigation.navigate('EditarRelatorioQualidade', { id: item.id, numero: numeroFormatado })}
            >
                <View style={styles.cardHeader}>
                    <View style={styles.badge}><Text style={styles.badgeText}>{numeroFormatado}</Text></View>
                    <Text style={styles.dateText}>{item.data}</Text>
                </View>
                <View style={styles.infoRow}>
                    <View style={styles.infoCol}>
                        <Text style={styles.label}>CLIENTE</Text>
                        <Text style={styles.value} numberOfLines={1}>{item.cliente || '-'}</Text>
                    </View>
                    <View style={styles.infoCol}>
                        <Text style={styles.label}>INSPETOR</Text>
                        <Text style={styles.value} numberOfLines={1}>{item.inspetor || '-'}</Text>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            {loading && page === 1 ? (
                <View style={styles.center}><ActivityIndicator size="large" color="#00315c" /></View>
            ) : (
                <FlatList
                    data={relatorios}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderItem}
                    onEndReached={handleLoadMore}
                    onEndReachedThreshold={0.1} // Reduzido para evitar disparos precoces
                    contentContainerStyle={styles.listContent}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
                    ListFooterComponent={() => loadingMore ? <ActivityIndicator style={{ margin: 20 }} color="#00315c" /> : null}
                />
            )}
            <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('CriarRelatorioQualidade')}>
                <Text style={styles.fabIcon}>＋</Text>
            </TouchableOpacity>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F9FA' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    listContent: { padding: 16, paddingBottom: 100 },
    card: { backgroundColor: '#FFF', borderRadius: 10, padding: 16, marginBottom: 12, elevation: 3 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
    badge: { backgroundColor: '#E7F0FD', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
    badgeText: { color: '#00315c', fontWeight: 'bold' },
    dateText: { color: '#6C757D' },
    infoRow: { flexDirection: 'row' },
    infoCol: { flex: 1 },
    label: { color: '#ADB5BD', fontSize: 10, fontWeight: 'bold' },
    value: { color: '#343A40', fontSize: 14, fontWeight: '500' },
    fab: { position: 'absolute', right: 20, bottom: 20, backgroundColor: '#00315c', width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', elevation: 5 },
    fabIcon: { color: 'white', fontSize: 24 }
});