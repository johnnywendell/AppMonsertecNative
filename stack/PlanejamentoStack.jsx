import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';

import PlanejamentoMenuScreen from '../screens/Planejamento/PlanejamentoMenuScreen.jsx';
import RdcListScreen from '../screens/Planejamento/RdcListScreen.jsx';
import RdcFormScreen from '../screens/Planejamento/RdcFormScreen.jsx';


const Stack = createStackNavigator();

export default function PlanejamentoStack() {
  return (
    <Stack.Navigator>
      
      {/* Tela intermediária */}
      <Stack.Screen
        name="PlanejamentoMenu"
        component={PlanejamentoMenuScreen}
        options={{ title: 'Planejamento' }}
      />

      <Stack.Screen
        name="RdcList"
        component={RdcListScreen}
        options={{ title: 'Rdcs' }}
      />

      <Stack.Screen
        name="RdcForm"
        component={RdcFormScreen}
        options={({ route }) => ({
          title: route?.params?.id ? 'Editar RDC' : 'Novo RDC'
        })}
      />
    </Stack.Navigator>
    
  );
}
