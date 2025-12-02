import React from 'react';
import { View, TouchableOpacity, StyleSheet, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import RelatorioQualidadeCard from '../components/RelatorioQualidadeCard';

export default function QualidadeScreen() {
    const navigation = useNavigation();

    return (
        <View style={styles.container}>
            <RelatorioQualidadeCard />
            <TouchableOpacity
                style={styles.fab}
                onPress={() => navigation.navigate('CriarRelatorioQualidade')}
                activeOpacity={0.7}
            >
                <Text style={styles.fabIcon}>＋</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
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