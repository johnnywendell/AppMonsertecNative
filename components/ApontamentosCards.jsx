import React, { useState, useCallback, useMemo, useRef } from 'react';
import { Text, StyleSheet, ScrollView, TouchableOpacity, View, RefreshControl, ActivityIndicator } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { listarApontamentos, fetchColaboradores } from '../services/apontamentosService';

// Adicionei a prop "filtro" para receber a busca da tela pai
const ApontamentosCards = React.memo(({ filtro = "" }) => {
    const navigation = useNavigation();
    const [apontamentos, setApontamentos] = useState([]);
    const [colaboradores, setColaboradores] = useState([]);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const isLoadingRef = useRef(false);

    const loadData = useCallback(async (isRefresh = false) => {
        if (isLoadingRef.current && !isRefresh) return;

        try {
            isLoadingRef.current = true;
            if (isRefresh) setRefreshing(true);
            else setLoading(true);

            // Passamos o filtro (termo de busca) para o service
            const [apontRes, colabData] = await Promise.all([
                listarApontamentos(1, filtro), 
                fetchColaboradores(),
            ]);

            // CORREÇÃO AQUI: Acessamos o .results se existir (paginação)
            // Caso contrário, tenta usar o dado direto (retrocompatibilidade)
            const listaApontamentos = apontRes?.results || (Array.isArray(apontRes) ? apontRes : []);
            
            setApontamentos(listaApontamentos);
            setColaboradores(colabData || []);
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
            setApontamentos([]);
        } finally {
            isLoadingRef.current = false;
            setLoading(false);
            setRefreshing(false);
        }
    }, [filtro]); // Recarrega quando o filtro mudar

    const onRefresh = useCallback(() => {
        loadData(true);
    }, [loadData]);

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [loadData])
    );

    // Otimização: Memoizar a função de busca de nome para não re-processar em cada render
    const getColaboradorName = useCallback(
        (colaboradorId) => {
            if (!colaboradores.length) return 'Carregando...';
            const colaborador = colaboradores.find((col) => String(col.id) === String(colaboradorId));
            return colaborador ? colaborador.nome : 'Desconhecido';
        },
        [colaboradores]
    );

    const renderApontamentos = useMemo(() => {
        if (loading && apontamentos.length === 0) {
            return (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#00315c" />
                    <Text style={styles.loadingText}>Carregando apontamentos...</Text>
                </View>
            );
        }

        if (apontamentos.length === 0) {
            return (
                <Text style={styles.noDataText}>
                    {filtro ? 'Nenhum resultado para esta busca.' : 'Nenhum apontamento encontrado.'}
                </Text>
            );
        }

        return apontamentos.map((item) => (
            <TouchableOpacity
                key={`apontamento-${item.id}`}
                style={styles.card}
                onPress={() => navigation.navigate('EditarApontamentosScreen', {
                        id: item.id,
                        numero: `#${String(item.id).padStart(4, '0')}/${item.data?.split('-')[0]}`
                    })}
                activeOpacity={0.7}
            >
                <View style={styles.headerRow}>
                    <Text style={styles.reportNumber}>#{String(item.id).padStart(4, '0')}/{item.data?.split('-')[0]}</Text>
                    {/* Exibe o nome da área se o serializer trouxer, senão exibe o ID */}
            
                </View>

                <View style={styles.cardRow}>
                    <Text style={styles.label}>Data:</Text>
                    <Text style={styles.value}>{item.data || '-'}</Text>
                </View>
                <View style={styles.cardRow}>
                    <Text style={styles.label}>Projeto:</Text>
                    <Text style={styles.value}>{item.projeto_nome || item.projeto_cod || '-'}</Text>
                </View>
                <View style={styles.cardRow}>
                    <Text style={styles.label}>Disciplina:</Text>
                    <Text style={styles.value}>{item.disciplina || '-'}</Text>
                </View>
                
                <View style={styles.divider} />

                <Text style={[styles.label, { marginBottom: 5 }]}>Efetivo ({item.apontamentos?.length || 0}):</Text>
                {item.apontamentos && item.apontamentos.length > 0 ? (
                    item.apontamentos.slice(0, 5).map((efetivo, index) => (
                        <View key={`efetivo-${index}`} style={styles.efetivoContainer}>
                            <Text style={styles.efetivoText} numberOfLines={1}>
                                • {getColaboradorName(efetivo.colaborador)} - {efetivo.status}
                                {efetivo.lider === '1' || efetivo.lider === 1 ? ' ⭐' : ''}
                            </Text>
                        </View>
                    ))
                ) : (
                    <Text style={styles.noEfetivoText}>Nenhum colaborador registrado</Text>
                )}
                {item.apontamentos?.length > 5 && (
                    <Text style={styles.maisItens}>+ {item.apontamentos.length - 5} colaboradores...</Text>
                )}
            </TouchableOpacity>
        ));
    }, [apontamentos, loading, navigation, getColaboradorName, filtro]);

    return (
        <ScrollView
            contentContainerStyle={styles.container}
            refreshControl={
                <RefreshControl
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    colors={['#00315c']}
                    tintColor="#00315c"
                />
            }
        >
            {renderApontamentos}
        </ScrollView>
    );
});

// Estilos adicionais para melhorar o visual
const styles = StyleSheet.create({
    // ... seus estilos anteriores ...
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        marginBottom: 10,
        paddingBottom: 5
    },
    areaBadge: {
        backgroundColor: '#e6f0fa',
        color: '#00315c',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
        fontSize: 12,
        fontWeight: 'bold'
    },
    divider: {
        height: 1,
        backgroundColor: '#eee',
        marginVertical: 10
    },
    maisItens: {
        fontSize: 12,
        color: '#888',
        fontStyle: 'italic',
        marginLeft: 10,
        marginTop: 2
    },
    // Mantendo e ajustando os que você já tinha:
    container: { padding: 10, flexGrow: 1 },
    card: {
        backgroundColor: 'white',
        padding: 15,
        marginVertical: 8,
        borderRadius: 8,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
    },
    cardRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
    label: { fontWeight: 'bold', color: '#555', fontSize: 13 },
    value: { fontSize: 14, color: '#333' },
    efetivoText: { fontSize: 13, color: '#444' },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 100 },
    noDataText: { textAlign: 'center', marginTop: 100, fontSize: 15, color: '#999', paddingHorizontal: 40 },
    reportNumber: { fontSize: 16, fontWeight: 'bold', color: '#00315c' },
});

export default ApontamentosCards;