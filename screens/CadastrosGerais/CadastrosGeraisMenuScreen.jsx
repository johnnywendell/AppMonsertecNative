import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

export default function CadastrosGeraisMenuScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Selecione uma categoria</Text>

      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate('ColaboradorList')}
      >
        <Text style={styles.buttonText}>Colaboradores</Text>
      </TouchableOpacity>

      {/* Aqui depois adicionaremos os outros cadastros */}
      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate('AreaList')}
        >
        <Text style={styles.buttonText}>Áreas</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate('SolicitanteList')}
        >
        <Text style={styles.buttonText}>Solicitantes</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.disabledButton}>
        <Text style={styles.buttonText}>Aprovadores</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.disabledButton}>
        <Text style={styles.buttonText}>Itens BM</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 30
  },
  button: {
    width: '100%',
    padding: 15,
    backgroundColor: '#007bff',
    borderRadius: 6,
    marginBottom: 12
  },
  disabledButton: {
    width: '100%',
    padding: 15,
    backgroundColor: '#999',
    borderRadius: 6,
    marginBottom: 12,
    opacity: 0.6
  },
  buttonText: {
    textAlign: 'center',
    color: '#FFF',
    fontSize: 16
  }
});
