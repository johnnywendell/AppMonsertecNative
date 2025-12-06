import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { listarLevantamentos } from '../../services/levantamentoService'; // Importa o service de Levantamento
import { MaterialIcons } from '@expo/vector-icons';
import { format, parseISO } from 'date-fns'; 
import { ptBR } from 'date-fns/locale';

export default function LevantamentoListScreen() {
    const navigation = useNavigation();
    const [levantamentos, setLevantamentos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Função para formatar o ID do Levantamento (LVT) em um número sequencial (Ex: 00001)
    const formatLvtNumber = (id) => {
        // Garantindo que 'id' seja um número antes de formatar
        const numericId = Number(id);
        return String(numericId).padStart(5, '0');
    };

    // Função para buscar os dados e atualizar a lista
    const fetchLevantamentos = async () => {
        try {
            // O listarLevantamentos já lida com a desserialização e sincronização em background
            const data = await listarLevantamentos();
            setLevantamentos(data);
        } catch (error) {
            console.error('Erro ao buscar lista de Levantamentos:', error);
            // Implementar lógica de notificação de erro para o usuário
        } finally {
            setLoading(false);
            setIsRefreshing(false);
        }
    };

    // Use useFocusEffect para recarregar a lista sempre que a tela for focada
    useFocusEffect(
        React.useCallback(() => {
            setLoading(true);
            fetchLevantamentos();
        }, [])
    );

    const handleRefresh = () => {
        setIsRefreshing(true);
        fetchLevantamentos();
    };

    const handleEdit = (id) => {
        // Navega para a tela de formulário (Supondo o nome 'LevantamentoForm')
        navigation.navigate('LevantamentoForm', { id: id });
    };

    const handleCreate = () => {
        // Navega para a tela de formulário sem ID para criação
        navigation.navigate('LevantamentoForm');
    };

    const renderItem = ({ item }) => {
        // Cor do status: Amarelo (pending) ou Verde (synced)
        const syncColor = item.sync_status === 'pending' ? '#ffc107' : '#28a745'; 
        
        let lvtData = 'S/ Data';

        // Formatação da data
        if (item.data) {
            try {
                const dateObj = parseISO(item.data); 
                lvtData = format(dateObj, 'dd/MM/yyyy', { locale: ptBR });
            } catch (e) {
                console.error("Erro ao formatar data:", item.data, e);
                lvtData = 'Erro Data';
            }
        }

        // Determina qual ID usar no título: server_id (se existir) ou id local
        const displayId = item.server_id ? item.server_id : item.id;

        return (
            <TouchableOpacity 
                style={[styles.itemContainer, { borderLeftColor: syncColor }]} 
                onPress={() => handleEdit(item.id)}
                activeOpacity={0.8}
            >
                <View style={styles.textContainer}>
                    {/* Exibe o número sequencial do Levantamento (LVT) */}
                    <Text style={styles.lvtTitle}>
                        LVT N° {formatLvtNumber(displayId)}
                        {item.server_id ? `/${new Date().getFullYear()}` : ' (Local)'}
                    </Text> 
                    <Text style={styles.detailText}>Data: {lvtData}</Text>
                    <Text style={styles.detailText}>Local: {item.local || 'Não informado'}</Text>
                    <Text style={styles.detailText}>Escopo: {item.escopo || 'Não especificado'}</Text>

                    {/* Exibe o status de sync */}
                    <Text style={[styles.syncStatusText, { color: syncColor }]}>
                        {item.sync_status === 'pending' ? '🟡 Pendente' : '🟢 Sincronizado'}
                        {item.server_id ? ` (Server ID: ${item.server_id})` : ''}
                    </Text>
                </View>
                <MaterialIcons name="chevron-right" size={30} color="#00315c" />
            </TouchableOpacity>
        );
    };

    if (loading && levantamentos.length === 0) {
        return <ActivityIndicator size="large" color="#00315c" style={styles.loading} />;
    }

    return (
        <View style={styles.container}>
            <FlatList
                data={levantamentos}
                renderItem={renderItem}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={styles.listContent}
                refreshing={isRefreshing}
                onRefresh={handleRefresh}
                ListEmptyComponent={() => (
                    !loading && (
                        <Text style={styles.emptyText}>Nenhum Levantamento cadastrado. Crie um novo registro!</Text>
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

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f7fa',
    },
    loading: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContent: {
        padding: 10,
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
        // borderLeftColor é definido dinamicamente (syncColor)
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
    lvtTitle: { // Alterado de rdcTitle para lvtTitle
        fontSize: 18,
        fontWeight: '700',
        color: '#00315c',
        marginBottom: 5,
    },
    detailText: {
        fontSize: 14,
        color: '#666',
    },
    syncStatusText: {
        fontSize: 12,
        fontWeight: '500',
        marginTop: 4,
    },
    emptyText: {
        textAlign: 'center',
        marginTop: 50,
        fontSize: 16,
        color: '#666',
    },
    fab: {
        position: 'absolute',
        width: 60,
        height: 60,
        alignItems: 'center',
        justifyContent: 'center',
        right: 20,
        bottom: 20,
        backgroundColor: '#00315c',
        borderRadius: 30,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 6,
    },
});