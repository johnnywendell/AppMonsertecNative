import React, { useState } from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { MaterialCommunityIcons, MaterialIcons, Feather } from '@expo/vector-icons';
import { StyleSheet, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { logout } from '../services/authService';
import MessageModal from '../components/MessageModal';
import RecursosHumanosStack from '../stack/RecursosHumanosStack.jsx';
import MedicaoStack from '../stack/MedicaoStack.jsx';
import QualidadeStack from '../stack/QualidadeStack.jsx';
import CadastrosGeraisStack from '../stack/CadastrosGeraisStack.jsx';
import PlanejamentoStack from '../stack/PlanejamentoStack.jsx';

const Drawer = createDrawerNavigator();

const HeaderLogo = React.memo(() => (
    <Image
        source={require('../assets/SC-LOGO-JPG-BRANCO-removebg-preview.png')}
        style={styles.headerLogo}
    />
));

HeaderLogo.displayName = 'HeaderLogo';

const DrawerRoutes = () => {
    const navigation = useNavigation();
    const [modalVisible, setModalVisible] = useState(false);
    const [modalMessage, setModalMessage] = useState('');

    const handleLogout = async () => {
        try {
            await logout();
            navigation.reset({
                index: 0,
                routes: [{ name: 'Login' }],
            });
        } catch (error) {
            console.error('Erro ao fazer logout:', error);
            setModalMessage('Erro ao fazer logout. Tente novamente.');
            setModalVisible(true);
        }
    };

    return (
        <>
            <Drawer.Navigator
                initialRouteName="RecursosHumanos"
                screenOptions={{
                    headerTitle: () => <HeaderLogo />,
                    headerTintColor: 'white',
                    headerStyle: {
                        backgroundColor: '#00315c',
                    },
                    drawerActiveTintColor: 'white',
                    drawerInactiveTintColor: 'black',
                    drawerActiveBackgroundColor: '#00315c',
                    drawerLabelStyle: { fontWeight: 'bold' },
                }}
            >
                <Drawer.Screen
                    name="RecursosHumanos"
                    component={RecursosHumanosStack}
                    options={{
                        drawerLabel: 'Apontamentos',
                        drawerIcon: ({ color, size }) => (
                            <MaterialCommunityIcons name="account-group" size={size} color={color} />
                        ),
                    }}
                />
                <Drawer.Screen
                    name="CadastrosGerais"
                    component={CadastrosGeraisStack}
                    options={{
                        drawerLabel: 'Cadastros Gerais',
                        drawerIcon: ({ color, size }) => (
                            <MaterialIcons name="list-alt" size={size} color={color} />
                        ),
                    }}
                />
                <Drawer.Screen
                    name="Planejamento"
                    component={PlanejamentoStack}
                    options={{
                        drawerLabel: 'Planejamento',
                        drawerIcon: ({ color, size }) => (
                            <MaterialIcons name="list-alt" size={size} color={color} />
                        ),
                    }}
                />
                {/* <Drawer.Screen
                    name="Medicao"
                    component={MedicaoStack}
                    options={{
                        drawerLabel: 'Medição',
                        drawerIcon: ({ color, size }) => (
                            <MaterialIcons name="event-note" size={size} color={color} />
                        ),
                    }}
                /> */}
                <Drawer.Group screenOptions={{ drawerLabel: 'Qualidade' }}>
                    <Drawer.Screen
                        name="Relatorios"
                        component={QualidadeStack}
                        options={{
                            drawerLabel: 'Relatórios',
                            drawerIcon: ({ color, size }) => (
                                <Feather name="file-text" size={size} color={color} />
                            ),
                        }}
                        initialParams={{ screen: 'RelatorioList' }}
                    />
                    <Drawer.Screen
                        name="Checklists"
                        component={QualidadeStack}
                        options={{
                            drawerLabel: 'Checklists',
                            drawerIcon: ({ color, size }) => (
                                <Feather name="check-square" size={size} color={color} />
                            ),
                        }}
                        initialParams={{ screen: 'ChecklistList' }}
                    />
                </Drawer.Group>
                <Drawer.Screen
                    name="Logout"
                    listeners={{
                        drawerItemPress: (e) => {
                            e.preventDefault();
                            handleLogout();
                        },
                    }}
                    options={{
                        drawerLabel: 'Sair',
                        drawerIcon: ({ color, size }) => (
                            <MaterialCommunityIcons name="logout" size={size} color={color} />
                        ),
                    }}
                >
                    {() => null}
                </Drawer.Screen>
            </Drawer.Navigator>
            <MessageModal
                visible={modalVisible}
                message={modalMessage}
                onClose={() => setModalVisible(false)}
            />
        </>
    );
};

const styles = StyleSheet.create({
    headerLogo: {
        width: 120,
        height: 40,
        resizeMode: 'contain',
    },
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'blue',
    },
    light: {
        fontFamily: 'LatoLight',
    },
    regular: {
        fontFamily: 'LatoRegular',
    },
    bold: {
        fontFamily: 'LatoBold',
    },
    heading: {
        fontSize: 46,
        color: '#fff',
    },
    headinggen: {
        fontSize: 36,
        color: '#fff',
    },
    space: {
        width: 20,
        height: 20,
    },
});

export default DrawerRoutes;