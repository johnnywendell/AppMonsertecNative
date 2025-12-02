import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import QualidadeScreen from '../screens/QualidadeScreen';
import CriarRelatorioQualidadeScreen from '../screens/CriarRelatorioQualidadeScreen';
import EditarRelatorioQualidadeScreen from '../screens/EditarRelatorioQualidadeScreen';
import ChecklistListScreen from '../screens/ChecklistListScreen';
import CriarChecklistQualidadeScreen from '../screens/CriarChecklistQualidadeScreen';
import EditarChecklistQualidadeScreen from '../screens/EditarChecklistQualidadeScreen';

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
                name="CriarRelatorioQualidade"
                component={CriarRelatorioQualidadeScreen}
                options={{ title: 'Novo Relatório' }}
            />
            <Stack.Screen
                name="EditarRelatorioQualidade"
                component={EditarRelatorioQualidadeScreen}
                options={({ route }) => ({
                    title: `Editar Relatório ${route.params.numero}`
                })} />
            <Stack.Screen
                name="ChecklistList"
                component={ChecklistListScreen}
                options={{ title: 'Checklists de Qualidade' }}
            />
            <Stack.Screen
                name="CriarChecklistQualidade"
                component={CriarChecklistQualidadeScreen}
                options={{ title: 'Criar Checklist' }}
            />
            <Stack.Screen
                name="EditarChecklistQualidade"
                component={EditarChecklistQualidadeScreen}
                options={({ route }) => ({
                    title: `Editar Checklist ${route.params.numero}`
                })} />
        </Stack.Navigator>
    );
}