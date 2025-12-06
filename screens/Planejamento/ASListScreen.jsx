import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { listarASs } from '../../services/asService'; // Importa o serviço que criamos
import { MaterialIcons } from '@expo/vector-icons';

export default function ASListScreen() {
    const navigation = useNavigation();
    const [ass, setASs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Função para buscar os dados e atualizar a lista
    const fetchASs = async () => {
        try {
            // O listarASs já lida com a sincronização em background
            const data = await listarASs();
            setASs(data);
        } catch (error) {
            console.error('Erro ao buscar lista de ASs:', error);
        } finally {
            setLoading(false);
            setIsRefreshing(false);
        }
    };

    // Recarrega a lista sempre que a tela for focada (inclui o sync down)
    useFocusEffect(
        React.useCallback(() => {
            setLoading(true);
            fetchASs();
        }, [])
    );

    const handleRefresh = () => {
        setIsRefreshing(true);
        fetchASs();
    };

    const handleEdit = (id) => {
        // Navega para a tela de formulário com o ID para edição
        // Você precisará registrar 'ASForm' no seu Navigator
        navigation.navigate('ASForm', { id: id });
    };

    const handleCreate = () => {
        // Navega para a tela de formulário sem ID para criação
        navigation.navigate('ASForm');
    };

    const renderItem = ({ item }) => (
        <TouchableOpacity 
            style={styles.itemContainer} 
            onPress={() => handleEdit(item.id)}
            activeOpacity={0.8}
        >
            <View style={styles.textContainer}>
                {/* Exibe o ID e o Tipo/Data */}
                <Text style={styles.title}>AS Nº {item.server_id} - ({item.tipo})</Text>
                <Text style={styles.subtitle}>Data: {item.data}</Text>
                <Text style={styles.subtitle}>Status: **{item.status_as || 'Não definido'}**</Text>
                
                {/* Exibe o status de sync */}
                <Text style={styles.syncStatusText}>
                    Status Local: {item.sync_status === 'pending' || item.sync_status === 'update_pending' ? '🟡 Pendente' : '🟢 Sincronizado'}
                </Text>
            </View>
            <MaterialIcons name="chevron-right" size={30} color="#00315c" />
        </TouchableOpacity>
    );

    if (loading && ass.length === 0) {
        return <ActivityIndicator size="large" color="#00315c" style={styles.loading} />;
    }

    return (
        <View style={styles.container}>
            <FlatList
                data={ass}
                renderItem={renderItem}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={styles.listContent}
                refreshing={isRefreshing}
                onRefresh={handleRefresh}
                ListEmptyComponent={() => (
                    !loading && (
                        <Text style={styles.emptyText}>Nenhuma AS cadastrada. Crie uma!</Text>
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

// Reutiliza os estilos, ajustando nomes de classes se necessário
const styles = StyleSheet.create({
    // (Incluir todos os estilos do AreaListScreen aqui: container, loading, listContent, emptyText, fab)
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
        borderLeftColor: '#4CAF50', // Cor diferente para destaque
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