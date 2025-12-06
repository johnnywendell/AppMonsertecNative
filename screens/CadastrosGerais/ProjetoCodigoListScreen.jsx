import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { listarProjetoCodigos } from '../../services/projetoCodigoService'; // Importa o novo serviço
import { MaterialIcons } from '@expo/vector-icons'; // Ícones para o botão

export default function ProjetoCodigoListScreen() {
    const navigation = useNavigation();
    const [projetos, setProjetos] = useState([]); // Mudança: areas -> projetos
    const [loading, setLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Função para buscar os dados e atualizar a lista
    const fetchProjetoCodigos = async () => {
        try {
            // Mudança: listarAreas() -> listarProjetoCodigos()
            const data = await listarProjetoCodigos(); 
            setProjetos(data);
        } catch (error) {
            console.error('Erro ao buscar lista de Códigos de Projeto:', error);
        } finally {
            setLoading(false);
            setIsRefreshing(false);
        }
    };

    // Use useFocusEffect para recarregar a lista sempre que a tela for focada
    useFocusEffect(
        React.useCallback(() => {
            setLoading(true);
            fetchProjetoCodigos();
        }, [])
    );

    const handleRefresh = () => {
        setIsRefreshing(true);
        fetchProjetoCodigos();
    };

    const handleEdit = (id) => {
        // Mudança: 'AreaForm' -> 'ProjetoCodigoForm'
        navigation.navigate('ProjetoCodigoForm', { id: id }); 
    };

    const handleCreate = () => {
        // Mudança: 'AreaForm' -> 'ProjetoCodigoForm'
        navigation.navigate('ProjetoCodigoForm');
    };

    const renderItem = ({ item }) => (
        <TouchableOpacity 
            style={styles.itemContainer} 
            onPress={() => handleEdit(item.id)}
            activeOpacity={0.8}
        >
            <View style={styles.textContainer}>
                {/* Mudança: item.area -> item.projeto_nome */}
                <Text style={styles.itemName}>{item.projeto_nome}</Text> 
                
                {/* Exibe o status de sync (opcional) */}
                <Text style={styles.syncStatusText}>
                    Status: {item.sync_status === 'pending' ? '🟡 Pendente' : '🟢 Sincronizado'}
                </Text>
            </View>
            <MaterialIcons name="edit" size={24} color="#00315c" />
        </TouchableOpacity>
    );

    if (loading && projetos.length === 0) {
        return <ActivityIndicator size="large" color="#00315c" style={styles.loading} />;
    }

    return (
        <View style={styles.container}>
            <FlatList
                data={projetos} // Mudança: areas -> projetos
                renderItem={renderItem}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={styles.listContent}
                refreshing={isRefreshing}
                onRefresh={handleRefresh}
                ListEmptyComponent={() => (
                    !loading && (
                        <Text style={styles.emptyText}>Nenhum Código de Projeto cadastrado. Crie um!</Text>
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

// --- ESTILOS (Ajustados para consistência) ---
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
        borderLeftColor: '#00315c',
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
    // Mudança: areaName -> itemName
    itemName: { 
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
    },
    syncStatusText: {
        fontSize: 12,
        color: '#666',
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