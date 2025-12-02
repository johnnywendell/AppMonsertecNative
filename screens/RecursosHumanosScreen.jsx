import React from 'react';
import { View, TouchableOpacity, StyleSheet, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import ApontamentosCards from '../components/ApontamentosCards.jsx';

export default function RecursosHumanosScreen() {
    const navigation = useNavigation();

    return (
        <View style={{ flex: 1 }}>
            <ApontamentosCards />

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