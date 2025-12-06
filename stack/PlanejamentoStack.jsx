import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';

import PlanejamentoMenuScreen from '../screens/Planejamento/PlanejamentoMenuScreen.jsx';
import RdcListScreen from '../screens/Planejamento/RdcListScreen.jsx';
import RdcFormScreen from '../screens/Planejamento/RdcFormScreen.jsx';
import ASListScreen from '../screens/Planejamento/ASListScreen.jsx';
import ASFormScreen from '../screens/Planejamento/ASFormScreen.jsx';
import BoletimMedicaoListScreen from '../screens/Planejamento/BoletimMedicaoListScreen.jsx';
import BoletimMedicaoFormScreen from '../screens/Planejamento/BoletimMedicaoFormScreen.jsx';
import LevantamentoListScreen from '../screens/Planejamento/LevantamentoListScreen.jsx';
import LevantamentoFormScreen from '../screens/Planejamento/LevantamentoFormScreen.jsx';



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
      <Stack.Screen
        name="ASList"
        component={ASListScreen}
        options={{ title: 'ASs' }}
      />

      <Stack.Screen
        name="ASForm"
        component={ASFormScreen}
        options={({ route }) => ({
          title: route?.params?.id ? 'Editar AS' : 'Novo AS'
        })}
      />
      <Stack.Screen
        name="BoletimMedicaoList"
        component={BoletimMedicaoListScreen}
        options={{ title: 'BoletimMedicaos' }}
      />

      <Stack.Screen
        name="BoletimMedicaoForm"
        component={BoletimMedicaoFormScreen}
        options={({ route }) => ({
          title: route?.params?.id ? 'Editar BoletimMedicao' : 'Novo BoletimMedicao'
        })}
      />
      <Stack.Screen
        name="LevantamentoList"
        component={LevantamentoListScreen}
        options={{ title: 'Levantamentos' }}
      />

      <Stack.Screen
        name="LevantamentoForm"
        component={LevantamentoFormScreen}
        options={({ route }) => ({
          title: route?.params?.id ? 'Editar Levantamento' : 'Novo Levantamento'
        })}
      />
    </Stack.Navigator>
    
  );
}
