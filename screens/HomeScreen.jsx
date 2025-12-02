import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { logout } from '../services/authService';
import MessageModal from '../components/MessageModal';

export default function HomeScreen() {
    const navigation = useNavigation();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [modalMessage, setModalMessage] = useState('');

    const clearOnboarding = async () => {
        try {
            await AsyncStorage.removeItem('@viewedOnboarding');
            setModalMessage('Onboarding limpo com sucesso!');
            setModalVisible(true);
        } catch (err) {
            console.log('Error @clearOnboarding: ', err);
            setModalMessage('Erro ao limpar onboarding.');
            setModalVisible(true);
        }
    };

    const handleLogout = async () => {
        try {
            setIsSubmitting(true);
            await logout();
            navigation.reset({
                index: 0,
                routes: [{ name: 'Login' }],
            });
        } catch (error) {
            console.error('Erro ao fazer logout:', error);
            setModalMessage('Erro ao fazer logout. Tente novamente.');
            setModalVisible(true);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Bem-vindo ao Monsertec</Text>
            <Text style={styles.subtitle}>
                Use o menu lateral para acessar Recursos Humanos, Medição ou Qualidade.
            </Text>
            <TouchableOpacity onPress={clearOnboarding} style={styles.button}>
                <Text style={styles.buttonText}>Limpar Onboarding</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleLogout} style={styles.button} disabled={isSubmitting}>
                {isSubmitting ? (
                    <ActivityIndicator size="small" color="#fff" />
                ) : (
                    <Text style={styles.buttonText}>Sair</Text>
                )}
            </TouchableOpacity>
            <MessageModal
                visible={modalVisible}
                message={modalMessage}
                onClose={() => setModalVisible(false)}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        backgroundColor: '#fff',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#00315c',
        marginBottom: 10,
    },
    subtitle: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        marginBottom: 20,
    },
    button: {
        backgroundColor: '#00315c',
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 8,
        marginVertical: 10,
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});