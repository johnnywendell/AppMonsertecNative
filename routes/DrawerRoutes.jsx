import React, {
    useEffect,
    useState
} from 'react';

import {
    createDrawerNavigator
} from '@react-navigation/drawer';

import {
    MaterialCommunityIcons,
    MaterialIcons,
    Feather
} from '@expo/vector-icons';

import {
    StyleSheet,
    Image,
    View,
    Text
} from 'react-native';

import {
    useNavigation
} from '@react-navigation/native';

import {
    logout,
    getStoredUsername
} from '../services/authService';

import MessageModal from '../components/MessageModal';

import RecursosHumanosStack
    from '../stack/RecursosHumanosStack.jsx';

import QualidadeStack
    from '../stack/QualidadeStack.jsx';

import CadastrosGeraisStack
    from '../stack/CadastrosGeraisStack.jsx';

import PlanejamentoStack
    from '../stack/PlanejamentoStack.jsx';


const Drawer =
    createDrawerNavigator();


const HeaderLogo =
    React.memo(() => (

        <Image
            source={
                require(
                    '../assets/SC-LOGO-JPG-BRANCO-removebg-preview.png'
                )
            }
            style={
                styles.headerLogo
            }
        />

    ));


HeaderLogo.displayName =
    'HeaderLogo';


// =========================================================
// COMPONENTE
// =========================================================

const DrawerRoutes = () => {

    const navigation =
        useNavigation();


    const [
        modalVisible,
        setModalVisible
    ] = useState(false);


    const [
        modalMessage,
        setModalMessage
    ] = useState('');


    const [
        username,
        setUsername
    ] = useState('');


    // =====================================================
    // CARREGAR USUÁRIO
    // =====================================================

    useEffect(() => {

        const carregarUsuario =
            async () => {

                try {

                    const nome =
                        await getStoredUsername();


                    setUsername(
                        nome || ''
                    );


                } catch (error) {

                    console.error(
                        'Erro ao recuperar usuário:',
                        error
                    );
                }
            };


        carregarUsuario();

    }, []);


    // =====================================================
    // LOGOUT
    // =====================================================

    const handleLogout =
        async () => {

            try {

                await logout();


                navigation.reset({
                    index: 0,

                    routes: [
                        {
                            name: 'Login'
                        }
                    ],
                });


            } catch (error) {

                console.error(
                    'Erro ao fazer logout:',
                    error
                );


                setModalMessage(
                    'Erro ao fazer logout. Tente novamente.'
                );

                setModalVisible(true);
            }
        };


    return (
        <>
            <Drawer.Navigator

                initialRouteName="RecursosHumanos"

                screenOptions={{

                    headerTitle:
                        () => <HeaderLogo />,

                    headerTitleAlign:
                        'left',

                    headerTintColor:
                        'white',

                    headerStyle: {
                        backgroundColor:
                            '#00315c',
                    },


                    // =========================================
                    // USUÁRIO
                    // =========================================

                    headerRight:
                        () => (

                            <View
                                style={
                                    styles.headerUser
                                }
                            >

                                <MaterialCommunityIcons
                                    name="account-circle"
                                    size={20}
                                    color="white"
                                />

                                <Text
                                    style={
                                        styles.headerUserText
                                    }
                                >
                                    Usuário: {username}
                                </Text>

                            </View>
                        ),


                    drawerActiveTintColor:
                        'white',

                    drawerInactiveTintColor:
                        'black',

                    drawerActiveBackgroundColor:
                        '#00315c',

                    drawerLabelStyle: {
                        fontWeight:
                            'bold'
                    },
                }}
            >

                <Drawer.Screen
                    name="RecursosHumanos"
                    component={
                        RecursosHumanosStack
                    }
                    options={{
                        drawerLabel:
                            'Apontamentos',

                        drawerIcon:
                            ({
                                color,
                                size
                            }) => (

                                <MaterialCommunityIcons
                                    name="account-group"
                                    size={size}
                                    color={color}
                                />
                            ),
                    }}
                />


                <Drawer.Screen
                    name="CadastrosGerais"
                    component={
                        CadastrosGeraisStack
                    }
                    options={{
                        drawerLabel:
                            'Cadastros Gerais',

                        drawerIcon:
                            ({
                                color,
                                size
                            }) => (

                                <MaterialIcons
                                    name="list-alt"
                                    size={size}
                                    color={color}
                                />
                            ),
                    }}
                />


                <Drawer.Screen
                    name="Planejamento"
                    component={
                        PlanejamentoStack
                    }
                    options={{
                        drawerLabel:
                            'Planejamento',

                        drawerIcon:
                            ({
                                color,
                                size
                            }) => (

                                <MaterialIcons
                                    name="list-alt"
                                    size={size}
                                    color={color}
                                />
                            ),
                    }}
                />


                <Drawer.Group>

                    <Drawer.Screen
                        name="Relatorios"
                        component={
                            QualidadeStack
                        }
                        options={{
                            drawerLabel:
                                'Relatórios',

                            drawerIcon:
                                ({
                                    color,
                                    size
                                }) => (

                                    <Feather
                                        name="file-text"
                                        size={size}
                                        color={color}
                                    />
                                ),
                        }}

                        initialParams={{
                            screen:
                                'RelatorioList'
                        }}
                    />


                    <Drawer.Screen
                        name="Checklists"
                        component={
                            QualidadeStack
                        }
                        options={{
                            drawerLabel:
                                'Checklists',

                            drawerIcon:
                                ({
                                    color,
                                    size
                                }) => (

                                    <Feather
                                        name="check-square"
                                        size={size}
                                        color={color}
                                    />
                                ),
                        }}

                        initialParams={{
                            screen:
                                'ChecklistList'
                        }}
                    />

                </Drawer.Group>


                <Drawer.Screen
                    name="Logout"

                    listeners={{
                        drawerItemPress:
                            e => {

                                e.preventDefault();

                                handleLogout();
                            },
                    }}

                    options={{

                        drawerLabel:
                            'Sair',

                        drawerIcon:
                            ({
                                color,
                                size
                            }) => (

                                <MaterialCommunityIcons
                                    name="logout"
                                    size={size}
                                    color={color}
                                />
                            ),
                    }}
                >
                    {() => null}
                </Drawer.Screen>

            </Drawer.Navigator>


            <MessageModal
                visible={
                    modalVisible
                }

                message={
                    modalMessage
                }

                onClose={
                    () =>
                        setModalVisible(false)
                }
            />
        </>
    );
};
const styles =
    StyleSheet.create({

        headerLogo: {
            width: 130,
            height: 40,
            resizeMode: 'contain',
        },

        headerUser: {
            flexDirection: 'row',
            alignItems: 'center',
            marginRight: 15,
        },

        headerUserText: {
            color: 'white',
            fontSize: 13,
            fontWeight: '500',
            marginLeft: 5,
        },
    });


export default DrawerRoutes;