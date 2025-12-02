import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';

import RecursosHumanosScreen from '../screens/RecursosHumanosScreen.jsx';
import EditarApontamentosScreen from '../screens/EditarApontamentosScreen.jsx';
import CriarApontamentoScreen from '../screens/CriarApontamentoScreen.jsx';

const Stack = createStackNavigator();

export default function RecursosHumanosStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="RecursosHumanosMain"
        component={RecursosHumanosScreen}
        options={{ title: 'Apontamentos' }}
      />
      <Stack.Screen
        name="EditarApontamentosScreen"
        component={EditarApontamentosScreen}
        options={({ route }) => ({ title: `Editar Apontamento ${route.params.numero}` })}
      />
      <Stack.Screen
        name="CriarApontamentoScreen"
        component={CriarApontamentoScreen}
        options={{ title: 'Criar Apontamento' }}
      />
    </Stack.Navigator>
  );
}
