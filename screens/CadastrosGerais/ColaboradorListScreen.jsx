import React, { useState, useCallback } from 'react';
import { View, TouchableOpacity, StyleSheet, Text, FlatList, ActivityIndicator } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { listarColaboradores } from '../../services/colaboradorService'; // Importa o serviço
import { FontAwesome } from '@expo/vector-icons'; 

export default function ColaboradorListScreen() {
    // ...
    const navigation = useNavigation();
    
    // 2. CORREÇÃO: Inicializar o estado dos colaboradores (faltava no seu código)
    const [colaboradores, setColaboradores] = useState([]);
    const [loading, setLoading] = useState(true);

    const carregarColaboradores = useCallback(async () => {
        setLoading(true);
        try {
            const data = await listarColaboradores();
            setColaboradores(data);
        } catch (error) {
            console.error('Falha ao carregar colaboradores:', error);
        } finally {
            setLoading(false);
        }
    }, []);
    
    // CORREÇÃO: useFocusEffect agora usa o React.useCallback e chama a função assíncrona
    useFocusEffect(
        React.useCallback(() => {
            carregarColaboradores();
            
            // Opcional: Adicionar clean-up, se necessário, mas para fetch, geralmente não é preciso.
            // return () => { /* Cleanup function */ };
        }, [carregarColaboradores]) // Dependência é o carregarColaboradores (embora useCallback já garanta estabilidade)
    );

    const renderItem = ({ item }) => (
        <TouchableOpacity 
            style={styles.item}
            // Navega para o formulário, passando o ID para edição
            onPress={() => navigation.navigate('ColaboradorForm', { id: item.id })}
            activeOpacity={0.8}
        >
            <View style={styles.itemContent}>
                <Text style={styles.nome}>{item.nome}</Text>
                <Text style={styles.detalhe}>
                    {item.matricula} | {item.disciplina} | {item.funcao}
                </Text>
            </View>
            <View style={styles.statusContainer}>
                <Text style={[styles.status, { color: item.sync_status === 'pending' ? '#ff9800' : '#4caf50' }]}>
                    {item.sync_status === 'pending' ? 'Pend. Sync' : 'OK'}
                </Text>
                <FontAwesome name="chevron-right" size={14} color="#ccc" style={{ marginLeft: 8 }} />
            </View>
        </TouchableOpacity>
    );

    if (loading) {
        return <ActivityIndicator size="large" color="#00315c" style={styles.loading} />;
    }

    return (
        <View style={styles.container}>
            <FlatList
                data={colaboradores}
                keyExtractor={item => item.id.toString()}
                renderItem={renderItem}
                ListEmptyComponent={<Text style={styles.emptyText}>Nenhum colaborador cadastrado.</Text>}
            />

            <TouchableOpacity
                style={styles.fab}
                // Navega para o formulário, sem ID para criação
                onPress={() => navigation.navigate('ColaboradorForm', { id: null })}
                activeOpacity={0.7}
            >
                <Text style={styles.fabIcon}>＋</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f0f0f0' },
    loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    item: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#fff',
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    itemContent: { flex: 1, paddingRight: 10 },
    nome: { fontSize: 16, fontWeight: 'bold', color: '#333' },
    detalhe: { fontSize: 13, color: '#666', marginTop: 2 },
    statusContainer: { flexDirection: 'row', alignItems: 'center' },
    status: { fontSize: 12, fontWeight: 'bold' },
    emptyText: { textAlign: 'center', marginTop: 50, fontSize: 16, color: '#999' },
    // FAB styles from your example
    fab: {
        position: 'absolute',
        right: 20,
        bottom: 30,
        backgroundColor: '#00315c',
        width: 60,
        height: 60,
        borderRadius: 30,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 5,
    },
    fabIcon: {
        color: 'white',
        fontSize: 30,
        lineHeight: 30,
    },
});