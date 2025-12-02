import React, { useState, useCallback, useMemo, useRef } from 'react';
import { Text, StyleSheet, ScrollView, TouchableOpacity, View, RefreshControl } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { listarApontamentos, fetchColaboradores } from '../services/apontamentosService';

const ApontamentosCards = React.memo(() => {
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

            const [apontData, colabData] = await Promise.all([
                listarApontamentos(),
                fetchColaboradores(),
            ]);
            setApontamentos(apontData || []);
            setColaboradores(colabData || []);
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
            setApontamentos([]);
            setColaboradores([]);
        } finally {
            isLoadingRef.current = false;
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    const onRefresh = useCallback(() => {
        loadData(true);
    }, [loadData]);

    useFocusEffect(
        useCallback(() => {
            loadData();
            return () => {};
        }, [loadData])
    );

    const getColaboradorName = useCallback(
        (colaboradorId) => {
            const colaborador = colaboradores.find((col) => col.id === colaboradorId);
            return colaborador ? colaborador.nome : 'Desconhecido';
        },
        [colaboradores]
    );

    const renderApontamentos = useMemo(() => {
        if (loading && apontamentos.length === 0) {
            return (
                <View style={styles.loadingContainer}>
                    <Text style={styles.loadingText}>Carregando apontamentos...</Text>
                </View>
            );
        }

        if (!loading && apontamentos.length === 0) {
            return (
                <Text style={styles.noDataText}>
                    Nenhum apontamento encontrado. Clique no botão "+" para adicionar um novo.
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
                <View>
                    <Text style={styles.reportNumber}>#{String(item.id).padStart(4, '0')}/{item.data?.split('-')[0]}</Text>
                </View>
                <View style={styles.cardRow}>
                    <Text style={styles.label}>Data:</Text>
                    <Text style={styles.value}>{item.data || '-'}</Text>
                </View>
                <View style={styles.cardRow}>
                    <Text style={styles.label}>Projeto:</Text>
                    <Text style={styles.value}>{item.projeto_cod || '-'}</Text>
                </View>
                <View style={styles.cardRow}>
                    <Text style={styles.label}>Disciplina:</Text>
                    <Text style={styles.value}>{item.disciplina || '-'}</Text>
                </View>
                <View style={styles.cardRow}>
                    <Text style={styles.label}>Área:</Text>
                    <Text style={styles.value}>{item.area || '-'}</Text>
                </View>
                <View style={styles.cardRow}>
                    <Text style={styles.label}>Observação:</Text>
                    <Text style={styles.value}>{item.obs || '-'}</Text>
                </View>
                <Text style={styles.label}>Colaboradores:</Text>
                {item.apontamentos && item.apontamentos.length > 0 ? (
                    item.apontamentos.map((efetivo, index) => (
                        <View key={`efetivo-${index}`} style={styles.efetivoContainer}>
                            <Text style={styles.efetivoText}>
                                {getColaboradorName(efetivo.colaborador)} - {efetivo.status}
                                {efetivo.lider === '1' ? ' (Líder)' : ''}
                            </Text>
                        </View>
                    ))
                ) : (
                    <Text style={styles.noEfetivoText}>Nenhum colaborador registrado</Text>
                )}
            </TouchableOpacity>
        ));
    }, [apontamentos, loading, navigation, getColaboradorName]);

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

ApontamentosCards.displayName = 'ApontamentosCards';

const styles = StyleSheet.create({
    container: { padding: 10, flexGrow: 1 },
    card: {
        backgroundColor: 'white',
        padding: 15,
        marginVertical: 8,
        borderRadius: 8,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    cardRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    label: {
        fontWeight: 'bold',
        color: '#555',
        flex: 1,
    },
    value: {
        fontSize: 16,
        color: '#333',
        flex: 2,
        textAlign: 'right',
    },
    efetivoContainer: {
        marginLeft: 10,
        marginTop: 4,
    },
    efetivoText: {
        fontSize: 14,
        color: '#444',
    },
    noEfetivoText: {
        fontSize: 14,
        color: '#666',
        marginLeft: 10,
        marginTop: 4,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 50,
    },
    loadingText: {
        fontSize: 16,
        color: '#666',
    },
    noDataText: {
        textAlign: 'center',
        marginTop: 50,
        fontSize: 16,
        color: '#666',
    },
    reportNumber: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 10,
        color: '#00315c',
    },
});

export default ApontamentosCards;