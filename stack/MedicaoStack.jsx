import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';

import MedicaoScreen from '../screens/MedicaoScreen.jsx';
import CriarMedicaoScreen from '../screens/CriarMedicaoScreen.jsx';
import EditarMedicaoScreen from '../screens/EditarMedicaoScreen.jsx';

const Stack = createStackNavigator();

export default function MedicaoStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="MedicaoMain"
        component={MedicaoScreen}
        options={{ title: 'Boletim de Medição' }}
      />
      <Stack.Screen
        name="CriarMedicao"
        component={CriarMedicaoScreen}
        options={{ title: 'Nova Medição' }}
      />
      <Stack.Screen
        name="EditarMedicao"
        component={EditarMedicaoScreen}
        options={{ title: 'Editar Boletim' }}
      />

    </Stack.Navigator>
  );
}
