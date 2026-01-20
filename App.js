import 'react-native-gesture-handler';
import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, StyleSheet, View, Text } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import Onboarding from './screens/Onboarding';
import LoginScreen from './screens/LoginScreen';
import DrawerRoutes from './routes/DrawerRoutes';
import { setupAxiosInterceptors } from './services/authService';
import { LogBox } from 'react-native';

// Ignorar mensagens específicas
LogBox.ignoreLogs([
  'Text strings must be rendered within a <Text> component'
]);
//LogBox.ignoreAllLogs(true); // Ignorar TODOS os warnings
const Stack = createStackNavigator();

export default function App() {
    const [appState, setAppState] = useState({
        loading: true,
        error: null,
        dbStatus: 'Inicializando...',
    });

    useEffect(() => {
        const initApp = async () => {
            try {
                console.log('=== INICIANDO APLICAÇÃO COM SQLITE ===');

                setAppState(prev => ({ ...prev, dbStatus: 'Carregando configurações...' }));

                setAppState(prev => ({ ...prev, dbStatus: 'Inicializando banco de dados...' }));

                const { setupDatabase, checkDatabaseHealth, resetDatabase } = await import('./database');
                
                // >>> CHAMADA TEMPORÁRIA PARA RESETAR O BANCO <<<
                // REMOVA OU COMENTE ESTA LINHA APÓS O AJUSTE NA TABELA COLABORADORES
                //console.warn('!!! AVISO: BANCO DE DADOS SERÁ RESETADO (PERDA TOTAL DE DADOS) !!!');
                await resetDatabase();
                // >>> FIM DA CHAMADA TEMPORÁRIA <<<
                
                await setupDatabase();

                setAppState(prev => ({ ...prev, dbStatus: 'Verificando saúde do banco...' }));

                const isHealthy = await checkDatabaseHealth();
                if (!isHealthy) {
                    throw new Error('Banco de dados não está respondendo corretamente');
                }

                setAppState(prev => ({ ...prev, dbStatus: 'Testando operações...' }));

                const { diagnosticarBanco } = await import('./services/medicaoService');
                const diagnostico = await diagnosticarBanco();
                console.log('Diagnóstico do banco:', diagnostico);

                if (diagnostico.error) {
                    throw new Error(`Erro no banco: ${diagnostico.error}`);
                }

                console.log('=== INICIALIZAÇÃO CONCLUÍDA COM SUCESSO ===');
                console.log(`Banco contém ${diagnostico.recordCount} registros`);

                setAppState({
                    loading: false,
                    error: null,
                    dbStatus: 'Pronto'
                });
            } catch (error) {
                console.error('=== ERRO NA INICIALIZAÇÃO ===', error);
                setAppState({
                    loading: false,
                    error: error.message,
                    dbStatus: 'Erro'
                });
            }
        };

        initApp();
        setupAxiosInterceptors();
    }, []);

    if (appState.loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#00315c" />
                <Text style={styles.loadingText}>Carregando aplicação...</Text>
                <Text style={styles.statusText}>{appState.dbStatus}</Text>
            </View>
        );
    }

    if (appState.error) {
        return (
            <View style={styles.errorContainer}>
                <Text style={styles.errorText}>Erro ao inicializar:</Text>
                <Text style={styles.errorDetail}>{appState.error}</Text>
                <Text style={styles.statusText}>Status: {appState.dbStatus}</Text>
                <Text style={[styles.statusText, { color: '#ff0000', marginTop: 20 }]}>
                    Lembre-se de COMENTAR ou REMOVER a linha 'await resetDatabase();' do App.js
                    após corrigir a tabela colaboradores!
                </Text>
            </View>
        );
    }

    return (
        <NavigationContainer>
            <Stack.Navigator screenOptions={{ headerShown: false }}>
                <Stack.Screen name="Login" component={LoginScreen} />
                <Stack.Screen name="Main" component={DrawerRoutes} />
            </Stack.Navigator>
            <StatusBar style="auto" />
        </NavigationContainer>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff',
        padding: 20,
    },
    loadingText: {
        marginTop: 15,
        fontSize: 18,
        color: '#00315c',
        fontWeight: 'bold',
    },
    statusText: {
        marginTop: 10,
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff',
        padding: 20,
    },
    errorText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#d32f2f',
        marginBottom: 10,
    },
    errorDetail: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
        marginBottom: 10,
    },
});