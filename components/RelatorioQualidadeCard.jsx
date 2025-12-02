import React, { useState, useCallback, useMemo, useRef } from 'react';
import { Text, StyleSheet, ScrollView, TouchableOpacity, View, RefreshControl } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { listarRelatorios, listarAreas } from '../services/relatorioQualidadeService';

const RelatorioQualidadeCard = React.memo(() => {
    const navigation = useNavigation();
    const [relatorios, setRelatorios] = useState([]);
    const [areas, setAreas] = useState([]);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const isLoadingRef = useRef(false);

    const loadRelatorios = useCallback(async (isRefresh = false) => {
        if (isLoadingRef.current && !isRefresh) return;

        try {
            isLoadingRef.current = true;
            if (isRefresh) setRefreshing(true);
            else setLoading(true);

            // Carregar áreas e relatórios diretamente da API
            const [areasData, relatoriosData] = await Promise.all([
                listarAreas(),
                listarRelatorios(),
            ]);
            setAreas(areasData || []);
            setRelatorios(relatoriosData || []);
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
            setRelatorios([]);
            setAreas([]);
        } finally {
            isLoadingRef.current = false;
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    const onRefresh = useCallback(() => {
        loadRelatorios(true);
    }, [loadRelatorios]);

    useFocusEffect(
        useCallback(() => {
            loadRelatorios();
            return () => { };
        }, [loadRelatorios])
    );

    const getUnidadeNome = useCallback((unidadeId) => {
        const area = areas.find(a => a.id === unidadeId || a.id === parseInt(unidadeId));
        return area ? area.area : '-';
    }, [areas]);

    const renderRelatorios = useMemo(() => {
        if (loading && relatorios.length === 0) {
            return (
                <View style={styles.loadingContainer}>
                    <Text style={styles.loadingText}>Carregando relatórios...</Text>
                </View>
            );
        }

        if (!loading && relatorios.length === 0) {
            return (
                <Text style={styles.noDataText}>
                    Nenhum relatório encontrado. Clique no botão "+" para adicionar um novo.
                </Text>
            );
        }

        return relatorios.map((item) => (
            <TouchableOpacity
                key={`relatorio-${item.id}`}
                style={styles.card}
                onPress={() =>
                    navigation.navigate('EditarRelatorioQualidade', {
                        id: item.id,
                        numero: `#S${String(item.id).padStart(4, '0')}/${item.data?.split('-')[0]}`
                    })
                } activeOpacity={0.7}
            >
                <View>
                    <Text style={styles.reportNumber}>#S{String(item.id).padStart(4, '0')}/{item.data?.split('-')[0]}</Text>
                </View>
                <View style={styles.row}>
                    <View style={styles.half}>
                        <Text style={styles.label}>Cliente:</Text>
                        <Text style={styles.value}>{item.cliente || '-'}</Text>
                    </View>
                    <View style={styles.half}>
                        <Text style={styles.label}>Data:</Text>
                        <Text style={styles.value}>{item.data || '-'}</Text>
                    </View>
                </View>
                <Text style={styles.label}>Rec:</Text>
                <Text style={styles.value}>{item.rec || '-'}</Text>
                <View style={styles.row}>
                    <View style={styles.half}>
                        <Text style={styles.label}>Tipo de Serviço:</Text>
                        <Text style={styles.value}>{item.tipo_serv || '-'}</Text>
                    </View>
                    <View style={styles.half}>
                        <Text style={styles.label}>Unidade/Área:</Text>
                        <Text style={styles.value}>{getUnidadeNome(item.unidade)}</Text>
                    </View>
                </View>
                <Text style={styles.label}>Inspetor:</Text>
                <Text style={styles.value}>{item.inspetor || '-'}</Text>
                <Text style={styles.label}>Fiscal:</Text>
                <Text style={styles.value}>{item.fiscal || '-'}</Text>
            </TouchableOpacity>
        ));
    }, [relatorios, loading, navigation, getUnidadeNome]);

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
            {renderRelatorios}
        </ScrollView>
    );
});

RelatorioQualidadeCard.displayName = 'RelatorioQualidadeCard';

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
    label: { fontWeight: 'bold', color: '#555' },
    value: { marginBottom: 8, fontSize: 16 },
    row: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
        marginBottom: 8,
        gap: 20,
    },
    half: { flex: 1 },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 50 },
    loadingText: { fontSize: 16, color: '#666' },
    noDataText: { textAlign: 'center', marginTop: 50, fontSize: 16, color: '#666' },
    reportNumber: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 10,
        color: '#00315c',
    },
});

export default RelatorioQualidadeCard;