import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';

import RecursosHumanosScreen from '../screens/RecursosHumanosScreen.jsx';

import ApontamentoFormScreen from '../screens/ApontamentoFormScreen.jsx';

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
        name="ApontamentoForm"
        component={ApontamentoFormScreen}
        options={({ route }) => ({
        title: route?.params?.id ? 'Editar Apontamento' : 'Novo Apontamento'
        })}
    />
    </Stack.Navigator>
  );
}
