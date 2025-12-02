import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { Text, StyleSheet, ScrollView, TouchableOpacity, View, RefreshControl } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { listarMedicoes } from '../services/medicaoService';

const MedicaoCard = React.memo(({ onDataChanged }) => {
    const navigation = useNavigation();
    const [medicoes, setMedicoes] = useState([]);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    
    // CORREÇÃO: Usar useRef para evitar dependências no useCallback
    const isLoadingRef = useRef(false);

    // CORREÇÃO: Remover 'loading' das dependências para evitar loop
    const loadMedicoes = useCallback(async (isRefresh = false) => {
        // Evitar múltiplas chamadas simultâneas
        if (isLoadingRef.current && !isRefresh) {
            console.log('MedicaoCard: Carregamento já em andamento, ignorando...');
            return;
        }
        
        try {
            isLoadingRef.current = true;
            
            if (isRefresh) {
                setRefreshing(true);
                console.log('MedicaoCard: Iniciando refresh...');
            } else {
                setLoading(true);
                console.log('MedicaoCard: Iniciando carregamento...');
            }
            
            const data = await listarMedicoes();
            setMedicoes(data || []);
            console.log('MedicaoCard: Medições carregadas com sucesso:', data?.length || 0);
        } catch (error) {
            console.error('MedicaoCard: Erro ao carregar medições:', error);
            setMedicoes([]);
        } finally {
            isLoadingRef.current = false;
            setLoading(false);
            setRefreshing(false);
            console.log('MedicaoCard: Carregamento finalizado');
        }
    }, []); // CORREÇÃO: Array de dependências vazio

    const onRefresh = useCallback(() => {
        console.log('MedicaoCard: Pull-to-refresh acionado');
        loadMedicoes(true);
    }, [loadMedicoes]);

    // CORREÇÃO: Usar useFocusEffect sem dependências problemáticas
    useFocusEffect(
        useCallback(() => {
            console.log('MedicaoCard: Tela focada, carregando dados...');
            loadMedicoes();
            
            // Cleanup function (opcional)
            return () => {
                console.log('MedicaoCard: Tela desfocada');
            };
        }, []) // CORREÇÃO: Dependências vazias para evitar loop
    );

    const formatarValor = useCallback((valor) => {
        if (!valor) return 'R$ 0,00';
        try {
            const numero = parseFloat(valor);
            if (isNaN(numero)) return 'R$ 0,00';
            return `R$ ${numero.toFixed(2).replace('.', ',').replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.')}`;
        } catch (error) {
            console.error('Erro ao formatar valor:', error);
            return 'R$ 0,00';
        }
    }, []);

    const renderMedicoes = useMemo(() => {
        if (loading && medicoes.length === 0) {
            return (
                <View style={medicaoCardStyles.loadingContainer}>
                    <Text style={medicaoCardStyles.loadingText}>Carregando medições...</Text>
                </View>
            );
        }

        if (!loading && medicoes.length === 0) {
            return (
                <Text style={medicaoCardStyles.noDataText}>
                    Nenhum boletim de medição encontrado. Clique no botão "+" para adicionar um novo.
                </Text>
            );
        }

        return medicoes.map(item => (
            <TouchableOpacity
                key={`medicao-${item.id}`} // CORREÇÃO: Key mais específica
                style={medicaoCardStyles.card}
                activeOpacity={0.8}
                onPress={() => {
                    console.log('MedicaoCard: Navegando para EditarMedicao com ID:', item.id);
                    navigation.navigate('EditarMedicao', { id: item.id });
                }}
            >
                <View style={medicaoCardStyles.row}>
                    <View style={medicaoCardStyles.half}>
                        <Text style={medicaoCardStyles.label}>Data:</Text>
                        <Text style={medicaoCardStyles.value}>{item.data || '-'}</Text>
                    </View>
                    <View style={medicaoCardStyles.half}>
                        <Text style={medicaoCardStyles.label}>Nº BM:</Text>
                        <Text style={medicaoCardStyles.value}>{item.bmNumber || '-'}</Text>
                    </View>
                </View>

                <Text style={medicaoCardStyles.label}>CIP:</Text>
                <Text style={medicaoCardStyles.value}>{item.cip || '-'}</Text>

                <View style={medicaoCardStyles.row}>
                    <View style={medicaoCardStyles.half}>
                        <Text style={medicaoCardStyles.label}>Unidade:</Text>
                        <Text style={medicaoCardStyles.value}>{item.unidade || '-'}</Text>
                    </View>
                    <View style={medicaoCardStyles.half}>
                        <Text style={medicaoCardStyles.label}>Aprovador:</Text>
                        <Text style={medicaoCardStyles.value}>{item.aprovador || '-'}</Text>
                    </View>
                </View>

                <View style={medicaoCardStyles.row}>
                    <View style={medicaoCardStyles.half}>
                        <Text style={medicaoCardStyles.label}>DMS:</Text>
                        <Text style={medicaoCardStyles.value}>{item.dmsNumero || '-'}</Text>
                    </View>
                    <View style={medicaoCardStyles.half}>
                        <Text style={medicaoCardStyles.label}>BMS:</Text>
                        <Text style={medicaoCardStyles.value}>{item.bmsNumero || '-'}</Text>
                    </View>
                </View>

                <View style={medicaoCardStyles.valorRow}>
                    <Text style={medicaoCardStyles.label}>Valor:</Text>
                    <Text style={medicaoCardStyles.value}>
                        {formatarValor(item.valor)}
                    </Text>
                </View>
            </TouchableOpacity>
        ));
    }, [medicoes, loading, navigation, formatarValor]);

    return (
        <ScrollView 
            contentContainerStyle={medicaoCardStyles.container}
            showsVerticalScrollIndicator={false}
            refreshControl={
                <RefreshControl
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    colors={['#00315c']}
                    tintColor="#00315c"
                />
            }
        >
            {renderMedicoes}
        </ScrollView>
    );
});

MedicaoCard.displayName = 'MedicaoCard';

const medicaoCardStyles = StyleSheet.create({
    container: { 
        padding: 16,
        flexGrow: 1
    },
    card: {
        backgroundColor: '#f9f9f9',
        padding: 16,
        marginBottom: 16,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#ddd',
    },
    label: { 
        fontWeight: 'bold', 
        color: '#333',
        fontSize: 14
    },
    value: { 
        marginBottom: 8, 
        fontSize: 16, 
        color: '#444' 
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 20,
        marginBottom: 8,
    },
    half: { flex: 1 },
    valorRow: { marginTop: 8 },
    noDataText: {
        textAlign: 'center',
        marginTop: 50,
        fontSize: 16,
        color: '#666'
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
});

export default MedicaoCard;