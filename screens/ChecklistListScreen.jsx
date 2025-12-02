import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, RefreshControl } from 'react-native';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { listarChecklists, deletarChecklistLocal } from '../services/checklistQualidadeService';
import NetInfo from '@react-native-community/netinfo';

const PRIMARY = '#16356C';

const ChecklistListScreen = () => {
    const navigation = useNavigation();
    const isFocused = useIsFocused(); // Hook para detectar se a tela está em foco
    const [checklists, setChecklists] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [isOnline, setIsOnline] = useState(true);

    // Função para carregar os checklists
    const carregarChecklists = useCallback(async () => {
        try {
            setRefreshing(true);
            const netInfo = await NetInfo.fetch();
            setIsOnline(netInfo.isConnected);
            
            const data = await listarChecklists();
            setChecklists(data);
        } catch (error) {
            Alert.alert('Erro', 'Não foi possível carregar os checklists.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    // Carrega os checklists quando a tela é montada ou quando recebe foco
    useEffect(() => {
        if (isFocused) {
            carregarChecklists();
        }
    }, [isFocused, carregarChecklists]);

    const renderItem = ({ item }) => (
        <TouchableOpacity
            style={styles.item}
            onPress={() => navigation.navigate('EditarChecklistQualidade', {
                id: item.id,
                numero: `#C${String(item.id).padStart(4, '0')}/${item.data?.split('-')[0]}`
            })}
        >
            <Text style={styles.itemText}>Checklist {String(item.id).padStart(4, '0')}/{item.data?.split('-')[0]}</Text>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <Text style={[styles.status, { color: isOnline ? '#28a745' : '#dc3545' }]}>
                {isOnline ? 'Online' : 'Offline'}
            </Text>
            {loading ? (
                <ActivityIndicator size="large" color={PRIMARY} />
            ) : (
                <>
                    <TouchableOpacity
                        style={styles.primaryButton}
                        onPress={() => navigation.navigate('CriarChecklistQualidade')}
                    >
                        <Text style={styles.primaryButtonText}>+ Criar Novo Checklist</Text>
                    </TouchableOpacity>
                    <FlatList
                        data={checklists}
                        renderItem={renderItem}
                        keyExtractor={(item) => item.id.toString()}
                        ListEmptyComponent={<Text style={styles.emptyText}>Nenhum checklist encontrado.</Text>}
                        refreshControl={
                            <RefreshControl
                                refreshing={refreshing}
                                onRefresh={carregarChecklists}
                                colors={[PRIMARY]}
                            />
                        }
                    />
                </>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, padding: 16, backgroundColor: '#fff' },
    item: { flexDirection: 'row', justifyContent: 'space-between', padding: 12, borderBottomWidth: 1, borderBottomColor: '#ddd' },
    itemText: { fontSize: 16, color: PRIMARY },
    deleteText: { color: '#b00020', fontWeight: '600' },
    primaryButton: { backgroundColor: PRIMARY, padding: 14, borderRadius: 8, alignItems: 'center', marginBottom: 16 },
    primaryButtonText: { color: '#fff', fontWeight: '700' },
    emptyText: { textAlign: 'center', color: '#777', marginTop: 20 },
    status: { fontSize: 16, marginBottom: 12 },
});

export default ChecklistListScreen;