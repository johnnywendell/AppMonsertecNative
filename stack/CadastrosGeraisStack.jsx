import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';

import CadastrosGeraisMenuScreen from '../screens/CadastrosGerais/CadastrosGeraisMenuScreen.jsx';
import ColaboradorListScreen from '../screens/CadastrosGerais/ColaboradorListScreen.jsx';
import ColaboradorFormScreen from '../screens/CadastrosGerais/ColaboradorFormScreen.jsx';
import AreaListScreen from '../screens/CadastrosGerais/AreaListScreen.jsx';
import AreaFormScreen from '../screens/CadastrosGerais/AreaFormScreen.jsx';
import SolicitanteListScreen from '../screens/CadastrosGerais/SolicitanteListScreen.jsx';
import SolicitanteFormScreen from '../screens/CadastrosGerais/SolicitanteFormScreen.jsx';

const Stack = createStackNavigator();

export default function CadastrosGeraisStack() {
  return (
    <Stack.Navigator>
      
      {/* Tela intermediária */}
      <Stack.Screen
        name="CadastrosGeraisMenu"
        component={CadastrosGeraisMenuScreen}
        options={{ title: 'Cadastros Gerais' }}
      />

      <Stack.Screen
        name="ColaboradorList"
        component={ColaboradorListScreen}
        options={{ title: 'Colaboradores' }}
      />

      <Stack.Screen
        name="ColaboradorForm"
        component={ColaboradorFormScreen}
        options={({ route }) => ({
          title: route?.params?.id ? 'Editar Colaborador' : 'Novo Colaborador'
        })}
      />
      <Stack.Screen
        name="AreaList"
        component={AreaListScreen}
        options={{ title: "Áreas" }}
      />

      <Stack.Screen
        name="AreaForm"
        component={AreaFormScreen}
        options={({ route }) => ({
          title: route?.params?.id ? "Editar Área" : "Nova Área"
        })}
      />
      <Stack.Screen
        name="SolicitanteList"
        component={SolicitanteListScreen}
        options={{ title: "Áreas" }}
      />

      <Stack.Screen
        name="SolicitanteForm"
        component={SolicitanteFormScreen}
        options={({ route }) => ({
          title: route?.params?.id ? "Editar Área" : "Nova Área"
        })}
      />
    </Stack.Navigator>
    
  );
}

