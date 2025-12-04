import React, { useState } from 'react';
import { 
    View, Text, TouchableOpacity, StyleSheet, Platform 
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
// Importa o seletor de data específico para React Native
import DateTimePicker from '@react-native-community/datetimepicker'; 

// Importa a formatação nativa (mantendo a data-fns fora daqui por enquanto)
const formatDate = (date) => {
    if (!date) return 'Selecione a Data';
    // Garante que é um objeto Date
    const d = date instanceof Date ? date : new Date(date);
    
    // Formato DD/MM/YYYY
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
};


/**
 * @typedef {Object} DatePickerProps
 * @property {Date} value - O valor da data atualmente selecionado (objeto Date).
 * @property {function(Date): void} onChange - Função chamada quando a data muda.
 * @property {string} [label='Data'] - O rótulo a ser exibido acima do campo.
 */

/**
 * Componente de entrada de data que utiliza o DateTimePicker nativo 
 * e exibe o modal de seleção quando o campo é pressionado.
 *
 * @param {DatePickerProps} props 
 * @returns {JSX.Element}
 */
export default function DatePicker({ value, onChange, label = 'Data' }) {
    // Estado para controlar a visibilidade do seletor nativo
    const [showPicker, setShowPicker] = useState(false);

    const handleDateChange = (event, selectedDate) => {
        // O seletor deve ser fechado após a seleção (ou cancelamento no Android)
        setShowPicker(Platform.OS === 'ios'); 

        if (event.type === 'set' && selectedDate) {
            // Apenas atualiza se o usuário selecionou uma data (set)
            onChange(selectedDate);
        }
    };

    const displayValue = formatDate(value);
    
    return (
        <View style={styles.container}>
            <Text style={styles.label}>{label}</Text>
            
            <TouchableOpacity 
                style={styles.inputContainer} 
                onPress={() => setShowPicker(true)}
                activeOpacity={0.7}
            >
                <Text style={styles.inputText}>
                    {displayValue}
                </Text>
                <MaterialIcons name="calendar-today" size={20} color="#00315c" />
            </TouchableOpacity>

            {/* Renderiza o DateTimePicker se showPicker for true */}
            {showPicker && (
                <DateTimePicker
                    testID="dateTimePicker"
                    value={value || new Date()} // Usa o valor atual ou a data de hoje
                    mode="date" // Modo 'date' para seleção de data
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'} // Estilo de exibição
                    onChange={handleDateChange}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: 15,
        width: '100%',
    },
    label: {
        fontSize: 14,
        color: '#00315c',
        marginBottom: 5,
        fontWeight: 'bold',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#fff',
        borderRadius: 8,
        paddingHorizontal: 15,
        paddingVertical: 12,
        borderWidth: 1,
        borderColor: '#ccc',
        minHeight: 48,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    inputText: {
        fontSize: 16,
        color: '#333',
        flex: 1,
    },
});