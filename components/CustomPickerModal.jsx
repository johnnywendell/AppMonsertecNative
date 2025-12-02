import React from 'react';
import { View, Text, TouchableOpacity, Modal, FlatList, StyleSheet } from 'react-native';

/**
 * Componente Modal para seleção de opções customizadas (simulando um picker).
 *
 * @param {boolean} visible - Controla a visibilidade do modal.
 * @param {function} onClose - Função chamada para fechar o modal.
 * @param {Array<{label: string, value: any}>} options - Lista de opções.
 * @param {function} onSelect - Função chamada ao selecionar um item.
 * @param {any} selectedValue - Valor selecionado atualmente.
 * @param {string} title - Título do modal.
 */
export default function CustomPickerModal({ visible, onClose, options, onSelect, selectedValue, title }) {

    const handleSelect = (value) => {
        onSelect(value);
        onClose(); // Fecha o modal após a seleção
    };

    const renderItem = ({ item }) => (
        <TouchableOpacity
            style={[styles.optionItem, item.value === selectedValue && styles.selectedItem]}
            onPress={() => handleSelect(item.value)}
        >
            <Text style={[styles.optionText, item.value === selectedValue && styles.selectedText]}>
                {item.label}
            </Text>
        </TouchableOpacity>
    );

    return (
        <Modal
            animationType="slide"
            transparent={true}
            visible={visible}
            onRequestClose={onClose} // Reage ao botão de voltar do Android
        >
            <View style={styles.centeredView}>
                <View style={styles.modalView}>
                    <Text style={styles.modalTitle}>{title}</Text>

                    <FlatList
                        data={options}
                        keyExtractor={(item) => String(item.value)}
                        renderItem={renderItem}
                        style={styles.listContainer}
                        ListEmptyComponent={<Text style={styles.emptyText}>Nenhuma opção disponível.</Text>}
                    />

                    <TouchableOpacity
                        style={styles.cancelButton}
                        onPress={onClose} // Chama o onClose, que é definido em ColaboradorFormScreen
                    >
                        <Text style={styles.cancelButtonText}>Cancelar</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    centeredView: {
        flex: 1,
        justifyContent: 'flex-end',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)', // Fundo escurecido
    },
    modalView: {
        width: '100%',
        maxHeight: '60%', // Limita a altura do modal
        backgroundColor: 'white',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 15,
        color: '#00315c',
        textAlign: 'center',
    },
    listContainer: {
        maxHeight: '80%',
    },
    optionItem: {
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    selectedItem: {
        backgroundColor: '#e6f0ff', // Fundo leve para o item selecionado
        borderRadius: 5,
    },
    optionText: {
        fontSize: 16,
        color: '#333',
    },
    selectedText: {
        fontWeight: 'bold',
        color: '#00315c',
    },
    cancelButton: {
        backgroundColor: '#f4f4f4',
        padding: 15,
        borderRadius: 8,
        marginTop: 20,
        alignItems: 'center',
    },
    cancelButtonText: {
        color: '#333',
        fontWeight: 'bold',
        fontSize: 16,
    },
    emptyText: {
        textAlign: 'center',
        paddingVertical: 20,
        color: '#999'
    }
});