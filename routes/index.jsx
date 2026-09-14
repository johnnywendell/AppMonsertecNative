import React, {
    useCallback,
    useEffect,
    useRef
} from 'react';

import {
    AppState,
    View
} from 'react-native';

import {
    NavigationContainer,
    createNavigationContainerRef
} from '@react-navigation/native';

import {
    createStackNavigator
} from '@react-navigation/stack';

import LoginScreen from '../screens/LoginScreen';
import DrawerRoutes from './DrawerRoutes';

import {
    logout
} from '../services/authService';


const Stack =
    createStackNavigator();


const navigationRef =
    createNavigationContainerRef();


// =========================================================
// CONFIGURAÇÃO
// =========================================================

// 5 minutos
const INACTIVITY_TIMEOUT =
    5 * 60 * 1000;


export default function Routes() {

    // =====================================================
    // REFS
    // =====================================================

    const inactivityTimer =
        useRef(null);

    const lastActivity =
        useRef(Date.now());

    const appState =
        useRef(
            AppState.currentState
        );

    const sessionActive =
        useRef(false);

    const loggingOut =
        useRef(false);


    // =====================================================
    // LIMPAR TIMER
    // =====================================================

    const clearInactivityTimer =
        useCallback(() => {

            if (
                inactivityTimer.current
            ) {

                clearTimeout(
                    inactivityTimer.current
                );

                inactivityTimer.current =
                    null;
            }

        }, []);


    // =====================================================
    // LOGOUT POR INATIVIDADE
    // =====================================================

    const handleInactivityLogout =
        useCallback(async () => {

            // Evita logout duplicado
            if (
                loggingOut.current
            ) {
                return;
            }


            // Se não estiver autenticado,
            // não há nada para fazer
            if (
                !sessionActive.current
            ) {
                return;
            }


            loggingOut.current =
                true;


            clearInactivityTimer();


            try {

                await logout();

            } catch (error) {

                console.error(
                    'Erro ao limpar sessão por inatividade:',
                    error
                );

            } finally {

                sessionActive.current =
                    false;

                loggingOut.current =
                    false;


                if (
                    navigationRef.isReady()
                ) {

                    navigationRef.reset({
                        index: 0,

                        routes: [
                            {
                                name: 'Login'
                            }
                        ]
                    });
                }
            }

        }, [
            clearInactivityTimer
        ]);


    // =====================================================
    // INICIAR / REINICIAR TIMER
    // =====================================================

    const resetInactivityTimer =
        useCallback(() => {

            // Só controla inatividade
            // quando usuário está dentro do sistema
            if (
                !sessionActive.current
            ) {
                return;
            }


            lastActivity.current =
                Date.now();


            clearInactivityTimer();


            inactivityTimer.current =
                setTimeout(
                    () => {

                        handleInactivityLogout();

                    },
                    INACTIVITY_TIMEOUT
                );

        }, [
            clearInactivityTimer,
            handleInactivityLogout
        ]);


    // =====================================================
    // QUALQUER INTERAÇÃO COM O APP
    // =====================================================

    const handleUserActivity =
        useCallback(() => {

            if (
                !sessionActive.current
            ) {
                return;
            }


            resetInactivityTimer();

        }, [
            resetInactivityTimer
        ]);


    // =====================================================
    // MUDANÇA DE TELA
    // =====================================================

    const handleNavigationStateChange =
        useCallback(() => {

            if (
                !navigationRef.isReady()
            ) {
                return;
            }


            const currentRoute =
                navigationRef.getCurrentRoute();


            // ---------------------------------------------
            // ENTROU NO SISTEMA
            // ---------------------------------------------

            if (
                currentRoute?.name === 'Main'
            ) {

                if (
                    !sessionActive.current
                ) {

                    sessionActive.current =
                        true;

                    resetInactivityTimer();
                }

                return;
            }


            // ---------------------------------------------
            // VOLTOU PARA LOGIN
            // ---------------------------------------------

            if (
                currentRoute?.name === 'Login'
            ) {

                sessionActive.current =
                    false;

                clearInactivityTimer();
            }

        }, [
            clearInactivityTimer,
            resetInactivityTimer
        ]);


    // =====================================================
    // APP EM BACKGROUND / PRIMEIRO PLANO
    // =====================================================

    useEffect(() => {

        const subscription =
            AppState.addEventListener(
                'change',
                nextAppState => {

                    const previousState =
                        appState.current;


                    appState.current =
                        nextAppState;


                    // =====================================
                    // APP INDO PARA BACKGROUND
                    // =====================================

                    if (
                        nextAppState === 'background' ||
                        nextAppState === 'inactive'
                    ) {

                        if (
                            sessionActive.current
                        ) {

                            lastActivity.current =
                                Date.now();

                            clearInactivityTimer();
                        }

                        return;
                    }


                    // =====================================
                    // APP VOLTANDO
                    // =====================================

                    if (
                        nextAppState === 'active' &&
                        (
                            previousState === 'background' ||
                            previousState === 'inactive'
                        )
                    ) {

                        if (
                            !sessionActive.current
                        ) {
                            return;
                        }


                        const elapsed =
                            Date.now() -
                            lastActivity.current;


                        // Ficou mais de 5 minutos fora
                        if (
                            elapsed >=
                            INACTIVITY_TIMEOUT
                        ) {

                            handleInactivityLogout();

                            return;
                        }


                        // Ainda não venceu.
                        // Reinicia apenas com o tempo restante.

                        clearInactivityTimer();


                        const remaining =
                            INACTIVITY_TIMEOUT -
                            elapsed;


                        inactivityTimer.current =
                            setTimeout(
                                () => {

                                    handleInactivityLogout();

                                },
                                remaining
                            );
                    }
                }
            );


        return () => {

            subscription.remove();

            clearInactivityTimer();
        };

    }, [
        clearInactivityTimer,
        handleInactivityLogout
    ]);


    // =====================================================
    // RENDER
    // =====================================================

    return (

        <View
            style={{
                flex: 1
            }}

            onTouchStart={
                handleUserActivity
            }
        >

            <NavigationContainer

                ref={
                    navigationRef
                }

                onStateChange={
                    handleNavigationStateChange
                }

                onReady={
                    handleNavigationStateChange
                }
            >

                <Stack.Navigator

                    screenOptions={{
                        headerShown: false
                    }}

                    initialRouteName="Login"
                >

                    <Stack.Screen
                        name="Login"
                        component={
                            LoginScreen
                        }
                    />


                    <Stack.Screen
                        name="Main"
                        component={
                            DrawerRoutes
                        }
                    />

                </Stack.Navigator>

            </NavigationContainer>

        </View>
    );
}