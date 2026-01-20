import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet, Text, TextInput } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import ApontamentosCards from '../components/ApontamentosCards.jsx';

export default function RecursosHumanosScreen() {
    const navigation = useNavigation();
    const [busca, setBusca] = useState(""); // Estado para o termo de busca

    return (
        <View style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
            {/* Barra de Pesquisa */}
            <View style={styles.searchContainer}>
                <MaterialIcons name="search" size={22} color="#666" />
                <TextInput
                    style={styles.searchInput}
                    placeholder="..."
                    value={busca}
                    onChangeText={setBusca}
                />
            </View>

            {/* Passamos o termo de busca para o componente de cards */}
            <ApontamentosCards filtro={busca} />

            <TouchableOpacity
                style={styles.fab}
                onPress={() => navigation.navigate('CriarApontamentoScreen')}
                activeOpacity={0.7}
            >
                <Text style={styles.fabIcon}>＋</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        margin: 10,
        paddingHorizontal: 15,
        borderRadius: 10,
        height: 45,
        elevation: 3,
    },
    searchInput: { flex: 1, marginLeft: 10, fontSize: 16 },
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
    fabIcon: { color: 'white', fontSize: 30, lineHeight: 30 },
});