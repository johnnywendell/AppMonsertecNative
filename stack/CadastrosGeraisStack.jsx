import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';

import CadastrosGeraisMenuScreen from '../screens/CadastrosGerais/CadastrosGeraisMenuScreen.jsx';
import ColaboradorListScreen from '../screens/CadastrosGerais/ColaboradorListScreen.jsx';
import ColaboradorFormScreen from '../screens/CadastrosGerais/ColaboradorFormScreen.jsx';
import AreaListScreen from '../screens/CadastrosGerais/AreaListScreen.jsx';
import AreaFormScreen from '../screens/CadastrosGerais/AreaFormScreen.jsx';
import SolicitanteListScreen from '../screens/CadastrosGerais/SolicitanteListScreen.jsx';
import SolicitanteFormScreen from '../screens/CadastrosGerais/SolicitanteFormScreen.jsx';
import AprovadorListScreen from '../screens/CadastrosGerais/AprovadorListScreen.jsx';
import AprovadorFormScreen from '../screens/CadastrosGerais/AprovadorFormScreen.jsx';
import ItembmListScreen from '../screens/CadastrosGerais/ItembmListScreen.jsx';
import ItemBmFormScreen from '../screens/CadastrosGerais/ItemBmFormScreen.jsx';
import ProjetoCodigoListScreen from '../screens/CadastrosGerais/ProjetoCodigoListScreen.jsx';
import ProjetoCodigoFormScreen from '../screens/CadastrosGerais/ProjetoCodigoFormScreen.jsx';

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
        options={{ title: "Solciitantes" }}
      />

      <Stack.Screen
        name="SolicitanteForm"
        component={SolicitanteFormScreen}
        options={({ route }) => ({
          title: route?.params?.id ? "Editar Solicitante" : "Novo Solicitante"
        })}
      />
      <Stack.Screen
        name="AprovadorList"
        component={AprovadorListScreen}
        options={{ title: "Aprovadores" }}
      />

      <Stack.Screen
        name="AprovadorForm"
        component={AprovadorFormScreen}
        options={({ route }) => ({
          title: route?.params?.id ? "Editar Aprovador" : "Novo Aprovador"
        })}
      />
      <Stack.Screen
        name="ItembmList"
        component={ItembmListScreen}
        options={{ title: "Itens Medição" }}
      />

      <Stack.Screen
        name="ItemBmForm"
        component={ItemBmFormScreen}
        options={({ route }) => ({
          title: route?.params?.id ? "Editar Itembm" : "Novo Itembm"
        })}
      />
      <Stack.Screen
        name="ProjetoCodigoList"
        component={ProjetoCodigoListScreen}
        options={{ title: "Itens Medição" }}
      />

      <Stack.Screen
        name="ProjetoCodigoForm"
        component={ProjetoCodigoFormScreen}
        options={({ route }) => ({
          title: route?.params?.id ? "Editar ProjetoCodigo" : "Novo ProjetoCodigo"
        })}
      />
    </Stack.Navigator>
    
  );
}

