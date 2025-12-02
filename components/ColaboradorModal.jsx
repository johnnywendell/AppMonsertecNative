import React, { useState } from 'react';
import { Modal, View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet } from 'react-native';

export default function ColaboradorModal({ 
  visible, 
  onClose, 
  colaboradores, 
  onSelect 
}) {
  const [filtro, setFiltro] = useState('');

  const colaboradoresFiltrados = colaboradores.filter((colaborador) =>
    colaborador.nome.toLowerCase().includes(filtro.toLowerCase()) ||
    colaborador.matricula.toLowerCase().includes(filtro.toLowerCase())
  );

  return (
    <Modal visible={visible} animationType="slide">
      <View style={styles.modalContainer}>
        <Text style={styles.modalTitle}>Selecionar Colaborador</Text>

        {/* Campo de filtro */}
        <TextInput
          style={styles.input}
          placeholder="Buscar por nome ou matrícula..."
          value={filtro}
          onChangeText={setFiltro}
        />

        <ScrollView>
          {colaboradoresFiltrados.map((colaborador) => (
            <TouchableOpacity
              key={colaborador.id}
              onPress={() => onSelect(colaborador)}
              style={styles.modalItem}
            >
              <Text>{colaborador.nome} ({colaborador.matricula})</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={onClose}
        >
          <Text style={styles.secondaryButtonText}>Fechar</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  modalTitle: {
    fontSize: 20,
    marginBottom: 10,
    fontWeight: 'bold',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    marginBottom: 15,
  },
  modalItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  secondaryButton: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#ddd',
    borderRadius: 8,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 16,
  },
});
