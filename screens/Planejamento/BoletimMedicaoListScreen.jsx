import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { listarBoletinsMedicao } from '../../services/boletimMedicaoService'; // Serviço CORRETO
import { MaterialIcons } from '@expo/vector-icons';

// Função auxiliar para formatar datas (Assumindo que estão como YYYY-MM-DD)
const formatPeriodo = (dateString) => {
    if (!dateString) return 'S/ Data';
    try {
        // Converte YYYY-MM-DD para DD/MM/YYYY
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

    // Função para buscar os dados e atualizar a lista
    const fetchBMs = async () => {
        try {
            // O listarBoletinsMedicao já lida com a sincronização em background
            const data = await listarBoletinsMedicao();
            setBMs(data);
        } catch (error) {
            console.error('Erro ao buscar lista de BMs:', error);
        } finally {
            setLoading(false);
            setIsRefreshing(false);
        }
    };

    // Recarrega a lista sempre que a tela for focada (inclui o sync down)
    useFocusEffect(
        React.useCallback(() => {
            // Se já tem dados, apenas marca loading se for a primeira vez
            if (bms.length === 0) setLoading(true); 
            fetchBMs();
        }, [])
    );

    const handleRefresh = () => {
        setIsRefreshing(true);
        fetchBMs();
    };

    const handleEdit = (id) => {
        // Navega para a tela de formulário com o ID para edição
        navigation.navigate('BoletimMedicaoForm', { id: id });
    };

    const handleCreate = () => {
        // Navega para a tela de formulário sem ID para criação
        navigation.navigate('BoletimMedicaoForm');
    };

    // Função para determinar a cor da borda baseado no status de sincronização
    const getBorderColor = (syncStatus) => {
        if (syncStatus === 'pending' || syncStatus === 'update_pending') {
            return '#FFD700'; // Amarelo/Dourado para pendente
        }
        return '#4CAF50'; // Verde para sincronizado
    };

    const renderItem = ({ item }) => (
        <TouchableOpacity 
            style={[styles.itemContainer, { borderLeftColor: getBorderColor(item.sync_status) }]} 
            onPress={() => handleEdit(item.id)}
            activeOpacity={0.8}
        >
            <View style={styles.textContainer}>
                {/* ID, Período e Projeto */}
                <Text style={styles.title}>
                    BM  Nº{item.server_id} - PERÍODO: {formatPeriodo(item.periodo_inicio)} a {formatPeriodo(item.periodo_fim)}
                </Text>
                {/* Status BMS */}
                <Text style={styles.subtitle}>
                    Status BMS: **{item.b_status || 'EM LANÇAMENTO'}**
                </Text>
                {/* Descrição resumida */}
                <Text style={styles.subtitle}>
                    Descrição: {item.descricao.substring(0, 50)}{item.descricao.length > 50 ? '...' : ''}
                </Text>

                {/* Status de sync */}
                <Text style={styles.syncStatusText}>
                    Status Local: {item.sync_status === 'pending' || item.sync_status === 'update_pending' ? '🟡 Pendente' : '🟢 Sincronizado'}
                </Text>
            </View>
            <MaterialIcons name="chevron-right" size={30} color="#00315c" />
        </TouchableOpacity>
    );

    if (loading && bms.length === 0) {
        return <ActivityIndicator size="large" color="#00315c" style={styles.loading} />;
    }

    return (
        <View style={styles.container}>
            <FlatList
                data={bms}
                renderItem={renderItem}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={styles.listContent}
                refreshing={isRefreshing}
                onRefresh={handleRefresh}
                ListEmptyComponent={() => (
                    !loading && (
                        <Text style={styles.emptyText}>Nenhum Boletim de Medição cadastrado. Crie um!</Text>
                    )
                )}
            />
            
            {/* Botão Flutuante para Adicionar */}
            <TouchableOpacity 
                style={styles.fab} 
                onPress={handleCreate}
                activeOpacity={0.8}
            >
                <MaterialIcons name="add" size={28} color="white" />
            </TouchableOpacity>
        </View>
    );
}

// Estilos mantidos e aprimorados
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f5f7fa' },
    loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    listContent: { padding: 10 },
    emptyText: { textAlign: 'center', marginTop: 50, fontSize: 16, color: '#666' },
    fab: {
        position: 'absolute', width: 60, height: 60, alignItems: 'center', justifyContent: 'center', right: 20, bottom: 20,
        backgroundColor: '#00315c', borderRadius: 30, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, 
        shadowOpacity: 0.3, shadowRadius: 4, elevation: 6,
    },
    itemContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#fff',
        padding: 15,
        borderRadius: 8,
        marginBottom: 8,
        borderLeftWidth: 5,
        // borderLeftColor será dinâmico pelo getBorderColor
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 3,
    },
    textContainer: {
        flex: 1,
        marginRight: 10,
    },
    title: {
        fontSize: 16,
        fontWeight: '700',
        color: '#333',
    },
    subtitle: {
        fontSize: 13,
        color: '#666',
        marginTop: 2,
    },
    syncStatusText: {
        fontSize: 11,
        color: '#888',
        marginTop: 5,
        fontStyle: 'italic',
    },
});