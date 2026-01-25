import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl, SafeAreaView } from 'react-native';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { listarChecklists } from '../services/checklistQualidadeService';
import NetInfo from '@react-native-community/netinfo';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';

const PRIMARY = '#16356C';
const SUCCESS = '#28a745';
const DANGER = '#dc3545';
const WARNING = '#ff9800';

const ChecklistListScreen = () => {
    const navigation = useNavigation();
    const isFocused = useIsFocused();
    const [checklists, setChecklists] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [isOnline, setIsOnline] = useState(true);

    const carregarChecklists = useCallback(async () => {
        try {
            setRefreshing(true);
            const netInfo = await NetInfo.fetch();
            setIsOnline(netInfo.isConnected);
            
            const data = await listarChecklists();
            setChecklists(data);
        } catch (error) {
            console.error('Erro ao carregar checklists:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        if (isFocused) {
            carregarChecklists();
        }
    }, [isFocused, carregarChecklists]);

    const formatarData = (dataRaw) => {
        if (!dataRaw) return '--/--/--';
        
        try {
            // Pega apenas os primeiros 10 caracteres (YYYY-MM-DD) 
            // ignorando o T00:00:00-03:00 que o Django enviou
            const dataApenas = dataRaw.substring(0, 10);
            const [ano, mes, dia] = dataApenas.split('-');
            
            if (!dia || !mes || !ano) return dataRaw; // Fallback caso o formato mude
            
            return `${dia}/${mes}/${ano}`;
        } catch (e) {
            console.error("Erro ao formatar data:", e);
            return dataRaw;
        }
    };

    const renderItem = ({ item }) => {
        const idFormatado = `C${String(item.id).padStart(4, '0')}/${item.data?.split('-')[0] || '2024'}`;
        const isPending = item.sync_status === 'pending';

        return (
            <TouchableOpacity
                style={styles.card}
                activeOpacity={0.7}
                onPress={() => navigation.navigate('EditarChecklistQualidade', {
                    id: item.id,
                    numero: idFormatado
                })}
            >
                <View style={styles.cardHeader}>
                    <View style={styles.idContainer}>
                        <FontAwesome5 name="clipboard-check" size={14} color={PRIMARY} />
                        <Text style={styles.idText}>{idFormatado}</Text>
                    </View>
                    <Text style={styles.dateText}>{formatarData(item.data)}</Text>
                </View>

                <View style={styles.cardBody}>
                    <Text style={styles.tagText}>REC:{item.rec || 'Sem Tag'}</Text>
                    
                    <Text style={styles.recText}>TAG: {item.tag || 'N/A'}</Text>
                </View>

                <View style={styles.cardFooter}>
                    <View style={styles.syncIndicator}>
                        <View style={[styles.statusDot, { backgroundColor: isPending ? WARNING : SUCCESS }]} />
                        <Text style={[styles.syncText, { color: isPending ? WARNING : SUCCESS }]}>
                            {isPending ? 'Aguardando Sincronização' : 'Sincronizado'}
                        </Text>
                    </View>
                    <MaterialIcons name="chevron-right" size={24} color="#CCC" />
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Barra de Status de Conexão */}
            <View style={[styles.connectionBar, { backgroundColor: isOnline ? SUCCESS : DANGER }]}>
                <Text style={styles.connectionText}>
                    {isOnline ? 'CONECTADO AO SERVIDOR' : 'MODO OFFLINE'}
                </Text>
            </View>

            {loading && !refreshing ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={PRIMARY} />
                    <Text style={{ marginTop: 10, color: '#666' }}>Carregando dados...</Text>
                </View>
            ) : (
                <FlatList
                    data={checklists}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.id.toString()}
                    contentContainerStyle={styles.listContent}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={carregarChecklists} colors={[PRIMARY]} />
                    }
                    ListEmptyComponent={
                        <View style={styles.center}>
                            <MaterialIcons name="assignment-late" size={50} color="#ccc" />
                            <Text style={styles.emptyText}>Nenhum checklist encontrado.</Text>
                        </View>
                    }
                />
            )}

            {/* FAB - Botão Flutuante */}
            <TouchableOpacity
                style={styles.fab}
                onPress={() => navigation.navigate('CriarChecklistQualidade')}
                activeOpacity={0.8}
            >
                <MaterialIcons name="add" size={32} color="#fff" />
            </TouchableOpacity>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F4F7FA' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 50 },
    connectionBar: {
        paddingVertical: 4,
        alignItems: 'center',
        justifyContent: 'center',
    },
    connectionText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: 'bold',
        letterSpacing: 1,
    },
    listContent: { padding: 12, paddingBottom: 100 },
    card: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        // Sombras para Android e iOS
        elevation: 3,
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
        paddingBottom: 8,
        marginBottom: 10,
    },
    idContainer: { flexDirection: 'row', alignItems: 'center' },
    idText: {
        fontSize: 15,
        fontWeight: 'bold',
        color: PRIMARY,
        marginLeft: 6,
    },
    dateText: { fontSize: 13, color: '#888', fontWeight: '500' },
    cardBody: { marginBottom: 12 },
    tagText: { fontSize: 17, fontWeight: 'bold', color: '#333', marginBottom: 4 },
    unidadeText: { fontSize: 14, color: '#666', marginBottom: 4 },
    recText: { fontSize: 13, color: '#444', fontStyle: 'italic' },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#F0F0F0',
    },
    syncIndicator: { flexDirection: 'row', alignItems: 'center' },
    statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
    syncText: { fontSize: 11, fontWeight: 'bold', textTransform: 'uppercase' },
    fab: {
        position: 'absolute',
        right: 20,
        bottom: 25,
        backgroundColor: PRIMARY,
        width: 65,
        height: 65,
        borderRadius: 32.5,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
    },
    emptyText: { textAlign: 'center', color: '#999', fontSize: 16, marginTop: 10 },
});

export default ChecklistListScreen;