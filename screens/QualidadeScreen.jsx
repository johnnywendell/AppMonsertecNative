import React, { useState, useCallback, useRef } from 'react';
import { 
    View, TouchableOpacity, StyleSheet, Text, FlatList, 
    ActivityIndicator, RefreshControl, SafeAreaView 
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { listarRelatorios } from '../services/relatorioQualidadeService';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';

const PRIMARY = '#00315c';
const SECONDARY = '#E7F0FD';

export default function QualidadeScreen() {
    const navigation = useNavigation();
    const [relatorios, setRelatorios] = useState([]);
    const [loading, setLoading] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [page, setPage] = useState(1);
    const [hasNextPage, setHasNextPage] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const isFetching = useRef(false);

    // Função de formatação de data idêntica à do Checklist
    const formatarData = (dataRaw) => {
        if (!dataRaw) return '--/--/--';
        try {
            const dataApenas = dataRaw.substring(0, 10);
            const [ano, mes, dia] = dataApenas.split('-');
            return `${dia}/${mes}/${ano}`;
        } catch (e) {
            return dataRaw;
        }
    };

    const carregarDados = useCallback(async (paginaAlvo = 1, isRefreshing = false) => {
        if (isFetching.current) return;
        if (paginaAlvo > 1 && !hasNextPage) return;

        try {
            isFetching.current = true;
            if (paginaAlvo === 1) {
                if (!isRefreshing) setLoading(true);
            } else {
                setLoadingMore(true);
            }

            const data = await listarRelatorios(paginaAlvo);
            const novosRelatorios = data?.results || [];
            
            setRelatorios(prev => {
                if (paginaAlvo === 1) return novosRelatorios;
                const idsExistentes = new Set(prev.map(r => r.id));
                const filtrados = novosRelatorios.filter(r => !idsExistentes.has(r.id));
                return [...prev, ...filtrados];
            });

            setHasNextPage(!!data?.next);
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

    useFocusEffect(
        useCallback(() => {
            carregarDados(1);
        }, [carregarDados])
    );

    const handleRefresh = () => {
        setHasNextPage(true);
        carregarDados(1, true);
    };

    const handleLoadMore = () => {
        if (!isFetching.current && hasNextPage && !loading && !loadingMore) {
            carregarDados(page + 1);
        }
    };

    const renderItem = ({ item }) => {
    const ano = item.data ? item.data.split('-')[0] : '---';
    const numeroFormatado = `#S${String(item.id).padStart(4, '0')}/${ano}`;
    
    // Como os dados vêm do listarRelatorios (API), eles estão OK.
    // Se o ID for temporário (ex: negativo ou string), seria 'pending'.
    const isPending = item.sync_status === 'pending'; 

    return (
            <TouchableOpacity
                style={styles.card}
                activeOpacity={0.8}
                onPress={() => navigation.navigate('EditarRelatorioQualidade', { id: item.id, numero: numeroFormatado })}
            >
                <View style={styles.cardHeader}>
                    <View style={styles.idBadge}>
                        <FontAwesome5 name="file-alt" size={12} color={PRIMARY} />
                        <Text style={styles.idText}>{numeroFormatado}</Text>
                    </View>
                    <Text style={styles.dateText}>{formatarData(item.data)}</Text>
                </View>

                <View style={styles.cardBody}>
                    <View style={styles.infoRow}>
                        <MaterialIcons name="business" size={16} color="#666" />
                        <View style={styles.infoContent}>
                            <Text style={styles.label}>CLIENTE</Text>
                            <Text style={styles.value} numberOfLines={1}>{item.cliente || 'Não informado'}</Text>
                        </View>
                    </View>

                    <View style={[styles.infoRow, { marginTop: 10 }]}>
                        <MaterialIcons name="person" size={16} color="#666" />
                        <View style={styles.infoContent}>
                            <Text style={styles.label}>INSPETOR</Text>
                            <Text style={styles.value} numberOfLines={1}>{item.inspetor || 'Não atribuído'}</Text>
                        </View>
                    </View>
                </View>

                {/* RODAPÉ COM STATUS DE SINCRONIA */}
                <View style={styles.cardFooter}>
                    <View style={styles.syncIndicator}>
                        <View style={[
                            styles.statusDot, 
                            { backgroundColor: isPending ? '#ff9800' : '#4caf50' }
                        ]} />
                        <Text style={[
                            styles.syncText, 
                            { color: isPending ? '#ff9800' : '#4caf50' }
                        ]}>
                            {isPending ? 'Pendente' : 'Sincronizado'}
                        </Text>
                    </View>
                    <MaterialIcons name="arrow-forward-ios" size={14} color="#CCC" />
                </View>
            </TouchableOpacity>
        );
    };
    return (
        <SafeAreaView style={styles.container}>
            {loading && page === 1 ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={PRIMARY} />
                    <Text style={{marginTop: 10, color: '#666'}}>Buscando relatórios...</Text>
                </View>
            ) : (
                <FlatList
                    data={relatorios}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderItem}
                    onEndReached={handleLoadMore}
                    onEndReachedThreshold={0.3}
                    contentContainerStyle={styles.listContent}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[PRIMARY]} />
                    }
                    ListEmptyComponent={
                        <View style={styles.center}>
                            <MaterialIcons name="insert-drive-file" size={50} color="#CCC" />
                            <Text style={styles.emptyText}>Nenhum relatório encontrado.</Text>
                        </View>
                    }
                    ListFooterComponent={() => loadingMore ? <ActivityIndicator style={{ margin: 20 }} color={PRIMARY} /> : null}
                />
            )}

            <TouchableOpacity 
                style={styles.fab} 
                onPress={() => navigation.navigate('CriarRelatorioQualidade')}
                activeOpacity={0.8}
            >
                <MaterialIcons name="add" size={30} color="white" />
            </TouchableOpacity>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F0F2F5' }, // Fundo cinza suave
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    listContent: { padding: 12, paddingBottom: 100 },
    card: { 
        backgroundColor: '#FFF', 
        borderRadius: 12, 
        padding: 16, 
        marginBottom: 12, 
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    cardHeader: { 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
        paddingBottom: 10,
        marginBottom: 12 
    },
    idBadge: { 
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: SECONDARY, 
        paddingHorizontal: 10, 
        paddingVertical: 5, 
        borderRadius: 6 
    },
    idText: { color: PRIMARY, fontWeight: 'bold', fontSize: 13, marginLeft: 6 },
    dateText: { color: '#666', fontSize: 13, fontWeight: '500' },
    cardBody: { marginBottom: 8 },
    infoRow: { flexDirection: 'row', alignItems: 'flex-start' },
    infoContent: { marginLeft: 10, flex: 1 },
    label: { color: '#9E9E9E', fontSize: 10, fontWeight: 'bold', letterSpacing: 0.5 },
    value: { color: '#333', fontSize: 15, fontWeight: '600', marginTop: 1 },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: '#F0F0F0',
        paddingTop: 10,
        marginTop: 5
    },
    syncIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 6,
    },
    syncText: {
        fontSize: 11,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    footerDetail: { fontSize: 11, color: '#BBB', fontStyle: 'italic' },
    fab: { 
        position: 'absolute', 
        right: 20, 
        bottom: 25, 
        backgroundColor: PRIMARY, 
        width: 60, 
        height: 60, 
        borderRadius: 30, 
        alignItems: 'center', 
        justifyContent: 'center', 
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5
    },
    emptyText: { textAlign: 'center', color: '#999', fontSize: 16, marginTop: 10 }
});