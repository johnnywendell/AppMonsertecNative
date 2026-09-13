import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import QualidadeScreen from '../screens/QualidadeScreen';
import RelatorioFormScreen from '../screens/RelatorioFormScreen.jsx';
import ChecklistFormScreen from '../screens/ChecklistFormScreen.jsx';
import ChecklistListScreen from '../screens/ChecklistListScreen';



const Stack = createStackNavigator();

export default function QualidadeStack() {
    return (
        <Stack.Navigator>
            <Stack.Screen
                name="QualidadeMain"
                component={QualidadeScreen}
                options={{ title: 'Relatórios de Qualidade' }}
            />
            <Stack.Screen
                name="RelatorioForm"
                component={RelatorioFormScreen}
                options={({ route }) => ({
                title: route?.params?.id ? 'Editar Relatorio' : 'Novo Relatorio'
                })}
            />
            <Stack.Screen
                name="ChecklistList"
                component={ChecklistListScreen}
                options={{ title: 'Checklists de Qualidade' }}
            />
            <Stack.Screen
                name="ChecklistForm"
                component={ChecklistFormScreen}
                options={({ route }) => ({
                title: route?.params?.id ? 'Editar Checklist' : 'Novo Checklist'
                })}
            />

        </Stack.Navigator>
    );
}