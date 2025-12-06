import React, { useState } from 'react';
import { 
    View, Text, TouchableOpacity, StyleSheet, Platform 
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker'; 

// --- FUNÇÃO AUXILIAR DE FORMATAÇÃO ---
const formatDate = (dateString) => {
    if (!dateString) return 'Selecione a Data';
    
    // Converte a string YYYY-MM-DD para um objeto Date para formatação
    // Adiciona T00:00:00 para evitar problemas com fuso horário (Timezone)
    const d = new Date(`${dateString}T00:00:00`); 
    
    // Formato DD/MM/YYYY
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    
    return `${day}/${month}/${year}`;
};


/**
 * @typedef {Object} DatePickerProps
 * @property {string | null} value - O valor da data atualmente selecionado (string YYYY-MM-DD ou null).
 * @property {function(string | null): void} onDateChange - Função chamada quando a data muda (retorna string YYYY-MM-DD ou null).
 * @property {string} [label='Data'] - Este label não será renderizado, mas é mantido nas props se o componente pai quiser usá-lo para algo.
 * @property {boolean} [nullable=false] - Se true, permite que o usuário limpe o campo.
 */

/**
 * Componente de entrada de data que utiliza o DateTimePicker nativo 
 *
 * @param {DatePickerProps} props 
 * @returns {JSX.Element}
 */
export default function DatePicker({ value, onDateChange, label = 'Data', nullable = false }) {
    
    const [showPicker, setShowPicker] = useState(false);

    // Converte a string de entrada (value) em um objeto Date para passar ao DateTimePicker
    const dateObject = value ? new Date(`${value}T00:00:00`) : new Date();

    // Funções de manipulação
    const handleOpenPicker = () => setShowPicker(true);
    
    const handleClearDate = () => {
        onDateChange(null);
    };

    const handleDateChange = (event, selectedDate) => {
        // Fecha o seletor em todas as plataformas
        setShowPicker(false); 

        if (event.type === 'set' && selectedDate) {
            // Converte o objeto Date (output do picker nativo) de volta para a string YYYY-MM-DD
            const year = selectedDate.getFullYear();
            const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
            const day = String(selectedDate.getDate()).padStart(2, '0');
            const dateString = `${year}-${month}-${day}`;
            
            // Chama o callback do componente pai com a string YYYY-MM-DD
            onDateChange(dateString);
        }
        // Não precisamos tratar o 'dismissed' no Android explicitamente aqui, já que o setShowPicker(false) cuida disso.
    };

    const displayValue = formatDate(value);
    
    return (
        <View style={styles.container}>
            {/* REMOVIDO: A tag <Text style={styles.label}>{label}</Text> foi removida para evitar a duplicação do rótulo. */}
            
            <TouchableOpacity 
                style={styles.inputContainer} 
                onPress={handleOpenPicker}
                activeOpacity={0.7}
            >
                <Text style={value ? styles.inputText : styles.placeholderText}>
                    {displayValue}
                </Text>
                
                {/* Ícone de calendário ou de limpar, se for nullable e tiver valor */}
                {nullable && value ? (
                    <TouchableOpacity onPress={handleClearDate} style={styles.clearIcon}>
                        <MaterialIcons name="clear" size={20} color="#e74c3c" />
                    </TouchableOpacity>
                ) : (
                    <MaterialIcons name="calendar-today" size={20} color="#00315c" />
                )}
            </TouchableOpacity>

            {/* Renderiza o DateTimePicker se showPicker for true */}
            {showPicker && (
                <DateTimePicker
                    testID="dateTimePicker"
                    // AGORA PASSANDO O OBJETO DATE CORRETO
                    value={dateObject} 
                    mode="date" 
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={handleDateChange}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        // Reduzido para 10 para ocupar menos espaço, já que o label foi removido
        marginBottom: 10, 
        width: '100%',
    },
    // O estilo label foi mantido, mas não é usado
    label: { 
        fontSize: 14, 
        color: '#333', 
        marginBottom: 5, 
        fontWeight: '600',
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
        minHeight: 50,
        elevation: 1,
    },
    inputText: {
        fontSize: 16,
        color: '#333',
        flex: 1,
    },
    placeholderText: {
        fontSize: 16,
        color: '#9e9e9e',
        flex: 1,
    },
    clearIcon: {
        paddingLeft: 10,
    }
});