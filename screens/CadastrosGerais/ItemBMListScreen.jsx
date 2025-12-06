import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { listarItensBm } from '../../services/itembmService'; // Importação do serviço de ItemBm
import { MaterialIcons } from '@expo/vector-icons';

export default function ItemBmListScreen() {
    const navigation = useNavigation();
    const [itensBm, setItensBm] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Função para buscar os dados e atualizar a lista
    const fetchItensBm = async () => {
        try {
            // O listarItensBm já lida com a sincronização em background
            const data = await listarItensBm();
            setItensBm(data);
        } catch (error) {
            console.error('Erro ao buscar lista de Itens BM:', error);
        } finally {
            setLoading(false);
            setIsRefreshing(false);
        }
    };

    // Use useFocusEffect para recarregar a lista sempre que a tela for focada
    useFocusEffect(
        React.useCallback(() => {
            setLoading(true);
            fetchItensBm();
        }, [])
    );

    const handleRefresh = () => {
        setIsRefreshing(true);
        fetchItensBm();
    };

    const handleEdit = (id) => {
        // Navega para a tela de formulário com o ID para edição
        // Você deve garantir que 'ItemBmForm' está na sua navegação
        navigation.navigate('ItemBmForm', { id: id });
    };

    const handleCreate = () => {
        // Navega para a tela de formulário sem ID para criação
        navigation.navigate('ItemBmForm');
    };

    const renderItem = ({ item }) => (
        <TouchableOpacity 
            style={styles.itemContainer} 
            onPress={() => handleEdit(item.id)}
            activeOpacity={0.8}
        >
            <View style={styles.textContainer}>
                <Text style={styles.itemRef}>
                    <Text style={{ fontWeight: 'bold' }}>{item.item_ref}</Text> - {item.descricao}
                </Text>
                <Text style={styles.itemDetails}>
                    Disciplina: {item.disciplina} | Preço: R$ {parseFloat(item.preco_item).toFixed(2)} / {item.und}
                </Text>
                {/* Exibe o status de sync (opcional) */}
                <Text style={styles.syncStatusText}>
                    Status: {item.sync_status === 'pending' ? '🟡 Pendente' : '🟢 Sincronizado'}
                </Text>
            </View>
            <MaterialIcons name="edit" size={24} color="#00315c" />
        </TouchableOpacity>
    );

    if (loading && itensBm.length === 0) {
        return <ActivityIndicator size="large" color="#00315c" style={styles.loading} />;
    }

    return (
        <View style={styles.container}>
            <FlatList
                data={itensBm}
                renderItem={renderItem}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={styles.listContent}
                refreshing={isRefreshing}
                onRefresh={handleRefresh}
                ListEmptyComponent={() => (
                    !loading && (
                        <Text style={styles.emptyText}>Nenhum Item BM cadastrado. Crie um!</Text>
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

// Estilos adaptados para a visualização mais detalhada do Item BM
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
    itemRef: {
        fontSize: 16,
        fontWeight: '500',
        color: '#333',
    },
    itemDetails: {
        fontSize: 13,
        color: '#666',
        marginTop: 4,
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