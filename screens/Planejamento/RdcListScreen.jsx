import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { listarRDCs } from '../../services/rdcService'; // Importa o service de RDC
import { MaterialIcons } from '@expo/vector-icons';
// Adicionamos parseISO aqui para garantir a correta interpretação da string de data
import { format, parseISO } from 'date-fns'; 
import { ptBR } from 'date-fns/locale';

export default function RdcListScreen() {
    const navigation = useNavigation();
    const [rdcs, setRdcs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Função para formatar o ID local em um número sequencial (Ex: 00001)
    // O seu pedido (ID 92 -> RDC 00092) já é atendido por esta função.
    const formatRdcNumber = (id) => {
        // Garantindo que 'id' seja um número antes de formatar
        const numericId = Number(id);
        return String(numericId).padStart(5, '0');
    };

    // Função para buscar os dados e atualizar a lista
    const fetchRdcs = async () => {
        try {
            // O listarRDCs já lida com a desserialização e sincronização em background
            const data = await listarRDCs();
            setRdcs(data);
        } catch (error) {
            console.error('Erro ao buscar lista de RDCs:', error);
            // Mensagem de erro para o usuário (em um MessageModal, por exemplo)
        } finally {
            setLoading(false);
            setIsRefreshing(false);
        }
    };

    // Use useFocusEffect para recarregar a lista sempre que a tela for focada
    useFocusEffect(
        React.useCallback(() => {
            setLoading(true);
            fetchRdcs();
        }, [])
    );

    const handleRefresh = () => {
        setIsRefreshing(true);
        fetchRdcs();
    };

    const handleEdit = (id) => {
        // Navega para a tela de formulário com o ID para edição
        // Supondo que o nome da tela de formulário seja 'RdcForm'
        navigation.navigate('RdcForm', { id: id });
    };

    const handleCreate = () => {
        // Navega para a tela de formulário sem ID para criação
        navigation.navigate('RdcForm');
    };

    const renderItem = ({ item }) => {
        const syncColor = item.sync_status === 'pending' ? '#ffc107' : '#28a745'; // Amarelo ou Verde
        
        let rdcData = 'S/ Data';

        // CORREÇÃO APLICADA AQUI: Usando parseISO para interpretar a string de data
        // antes de formatar. Isso previne o erro de fuso horário que causa o recuo de um dia.
        if (item.data) {
            try {
                // parseISO converte a string ISO (e.g., "2025-12-02") para um objeto Date
                const dateObj = parseISO(item.data); 
                rdcData = format(dateObj, 'dd/MM/yyyy', { locale: ptBR });
            } catch (e) {
                console.error("Erro ao formatar data:", item.data, e);
                rdcData = 'Erro Data';
            }
        }

        return (
            <TouchableOpacity 
                style={[styles.itemContainer, { borderLeftColor: syncColor }]} 
                onPress={() => handleEdit(item.id)}
                activeOpacity={0.8}
            >
                <View style={styles.textContainer}>
                    {/* CONFIRMAÇÃO DO NÚMERO DO RDC: id 92 -> 00092 */}
                    <Text style={styles.rdcTitle}>RDC N° {formatRdcNumber(item.server_id)}</Text> 
                    <Text style={styles.detailText}>Data: {rdcData}</Text>
                    <Text style={styles.detailText}>Local: {item.local || 'Não informado'}</Text>
                    
                    {/* Exibe o status de sync */}
                    <Text style={[styles.syncStatusText, { color: syncColor }]}>
                        {item.sync_status === 'pending' ? '🟡 Pendente' : '🟢 Sincronizado'}
                        {item.server_id ? ` (ID Server: ${item.server_id})` : ''}
                    </Text>
                </View>
                <MaterialIcons name="chevron-right" size={30} color="#00315c" />
            </TouchableOpacity>
        );
    };

    if (loading && rdcs.length === 0) {
        return <ActivityIndicator size="large" color="#00315c" style={styles.loading} />;
    }

    return (
        <View style={styles.container}>
            <FlatList
                data={rdcs}
                renderItem={renderItem}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={styles.listContent}
                refreshing={isRefreshing}
                onRefresh={handleRefresh}
                ListEmptyComponent={() => (
                    !loading && (
                        <Text style={styles.emptyText}>Nenhum RDC cadastrado. Crie um novo registro!</Text>
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
    rdcTitle: {
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