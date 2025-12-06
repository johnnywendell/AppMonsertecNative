import React, { useState, useEffect, useLayoutEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { salvarItemBmLocal, buscarItemBm } from '../../services/itembmService';
import MessageModal from '../../components/MessageModal';
import CustomPickerModal from '../../components/CustomPickerModal'; 
// Supondo que você tem um componente DatePickerModal
// import DatePickerModal from '../../components/DatePickerModal'; 

// --- Opções Estáticas (Definidas acima, repetidas aqui para contexto do arquivo) ---
const CONTRATO_OPTIONS = [{ label: 'Contrato Braskem', value: 1 }];
const DISCIPLINA_OPTIONS = [
    { label: 'ANDAIME', value: 'ANDAIME' },
    { label: 'PINTURA', value: 'PINTURA' },
    { label: 'ISOLAMENTO', value: 'ISOLAMENTO' },
    { label: 'GERAL', value: 'GERAL' },
];
const UND_OPTIONS = [
    { label: 'M (Metro)', value: 'M' },
    { label: 'M2 (Metro Quadrado)', value: 'M2' },
    { label: 'M3 (Metro Cúbico)', value: 'M3' },
    { label: 'UN (Unidade)', value: 'UN' },
    { label: 'VAL (Valor)', value: 'VAL' },
    { label: 'H (Hora)', value: 'H' },
];
// --- FIM Opções Estáticas ---

// Função auxiliar para encontrar o label
const getLabel = (value, options) => {
    return options.find(o => o.value === value)?.label || 'Selecione';
};

// Função auxiliar para formatar data (YYYY-MM-DD)
const formatDate = (date) => {
    if (!date) return '';
    return date.split('T')[0]; // Se a data vier com timestamp do DB
};


export default function ItemBmFormScreen({ route }) {
    const navigation = useNavigation();
    const id = route.params?.id || null; 
    const isEditing = id !== null;

    // Estados para os campos do ItemBm
    const [itemRef, setItemRef] = useState('');
    const [disciplina, setDisciplina] = useState(DISCIPLINA_OPTIONS[0].value);
    const [descricao, setDescricao] = useState('');
    const [und, setUnd] = useState(UND_OPTIONS[0].value);
    const [precoItem, setPrecoItem] = useState(''); // Manter como string para input
    const [obs, setObs] = useState('');
    const [data, setData] = useState(formatDate(new Date().toISOString())); // YYYY-MM-DD
    const [contratoId, setContratoId] = useState(CONTRATO_OPTIONS[0].value);

    const [loading, setLoading] = useState(isEditing);

    // Modais
    const [modalVisible, setModalVisible] = useState(false);
    const [modalMessage, setModalMessage] = useState('');
    const [navigateOnClose, setNavigateOnClose] = useState(false);
    
    const [showContratoModal, setShowContratoModal] = useState(false);
    const [showDisciplinaModal, setShowDisciplinaModal] = useState(false);
    const [showUndModal, setShowUndModal] = useState(false);
    // const [showDateModal, setShowDateModal] = useState(false); // Para um DatePickerModal

    // Define o título da tela
    useLayoutEffect(() => {
        navigation.setOptions({
            title: isEditing ? 'Editar Item BM' : 'Novo Item BM',
        });
    }, [navigation, isEditing]);

    // Carregar dados para edição
    useEffect(() => {
        if (isEditing) {
            const loadItemBm = async () => {
                try {
                    const data = await buscarItemBm(id);
                    if (data) {
                        setItemRef(data.item_ref);
                        setDisciplina(data.disciplina);
                        setDescricao(data.descricao);
                        setUnd(data.und);
                        setPrecoItem(data.preco_item ? data.preco_item.toString() : '');
                        setObs(data.obs || '');
                        setData(formatDate(data.data));
                        setContratoId(data.contrato_server_id || CONTRATO_OPTIONS[0].value);
                    }
                } catch (error) {
                    console.error('Erro ao carregar Item BM:', error);
                    setModalMessage('Não foi possível carregar os dados do Item BM.');
                    setModalVisible(true);
                } finally {
                    setLoading(false);
                }
            };
            loadItemBm();
        } else {
            setLoading(false);
        }
    }, [id, isEditing]);

    const handleSave = async () => {
        // Validação básica
        if (!itemRef || !descricao || !data || !contratoId || !disciplina || !und || !precoItem) {
            setModalMessage('Por favor, preencha todos os campos obrigatórios (*).');
            setModalVisible(true);
            return;
        }

        const precoFormatado = parseFloat(precoItem.toString().replace(',', '.'));
        if (isNaN(precoFormatado)) {
            setModalMessage('O Preço do Item deve ser um número válido.');
            setModalVisible(true);
            return;
        }

        setLoading(true);

        const dadosParaSalvar = {
            id: isEditing ? id : null,
            item_ref: itemRef,
            disciplina,
            descricao,
            und,
            preco_item: precoFormatado, // Envia como número
            obs: obs || null, // Garante que obs é null se vazio
            data, // Data no formato YYYY-MM-DD
            contrato_server_id: contratoId,
        };

        try {
            await salvarItemBmLocal(dadosParaSalvar);
            setModalMessage(`Item BM ${isEditing ? 'atualizado' : 'criado'} e marcado para sincronização!`);
            setNavigateOnClose(true); 
            setModalVisible(true);
        } catch (error) {
            console.error('Erro ao salvar Item BM:', error);
            // O Item BM tem vários campos únicos no Django (item_ref, contrato), 
            // a validação de unique constraint pode ser complexa aqui.
            if (error.message && error.message.includes('UNIQUE constraint failed')) {
                 setModalMessage('Erro: A referência do Item (Item Ref) já existe para este Contrato.');
            } else {
                setModalMessage('Erro ao salvar Item BM. Verifique os dados e tente novamente.');
            }
            setModalVisible(true);
        } finally {
            setLoading(false);
        }
    };


    if (loading) {
        return <ActivityIndicator size="large" color="#00315c" style={styles.loading} />;
    }

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
            <Text style={styles.title}>{isEditing ? `Editando Item: ${itemRef}` : 'Novo Item BM'}</Text>
            
            {/* Campo Item Ref */}
            <Text style={styles.label}>Referência do Item *</Text>
            <TextInput 
                style={styles.input} 
                value={itemRef} 
                onChangeText={setItemRef} 
                placeholder="Ex: T01.001"
                autoCapitalize="none" 
                maxLength={10}
            />

            {/* Campo Descrição */}
            <Text style={styles.label}>Descrição *</Text>
            <TextInput 
                style={styles.input} 
                value={descricao} 
                onChangeText={setDescricao} 
                placeholder="Descrição completa do serviço/material"
                maxLength={200}
                multiline
            />
            
            {/* Linha de Seleções (Disciplina e UND) */}
            <View style={styles.row}>
                <View style={styles.halfInput}>
                    {/* Campo Disciplina (Picker Modal) */}
                    <Text style={styles.label}>Disciplina *</Text>
                    <TouchableOpacity style={styles.input} onPress={() => setShowDisciplinaModal(true)} activeOpacity={0.7}>
                        <Text style={disciplina ? styles.selectedText : styles.placeholderText}>
                            {getLabel(disciplina, DISCIPLINA_OPTIONS)}
                        </Text>
                    </TouchableOpacity>
                </View>
                <View style={styles.halfInput}>
                    {/* Campo UND (Picker Modal) */}
                    <Text style={styles.label}>Unidade (UND) *</Text>
                    <TouchableOpacity style={styles.input} onPress={() => setShowUndModal(true)} activeOpacity={0.7}>
                        <Text style={und ? styles.selectedText : styles.placeholderText}>
                            {getLabel(und, UND_OPTIONS)}
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Linha de Inputs (Preço e Data) */}
            <View style={styles.row}>
                <View style={styles.halfInput}>
                    {/* Campo Preço */}
                    <Text style={styles.label}>Preço Unitário *</Text>
                    <TextInput 
                        style={styles.input} 
                        value={precoItem} 
                        onChangeText={(text) => setPrecoItem(text.replace(',', '.'))} // Substitui vírgula por ponto
                        placeholder="0.000"
                        keyboardType="numeric"
                    />
                </View>
                <View style={styles.halfInput}>
                    {/* Campo Data */}
                    <Text style={styles.label}>Período (Data) *</Text>
                    {/* Se você tiver um DatePickerModal */}
                    <TextInput 
                        style={styles.input} 
                        value={data} 
                        onChangeText={setData} // Idealmente, abriria um picker
                        placeholder="AAAA-MM-DD"
                        keyboardType="number-pad"
                    />
                    {/* Se usar um modal:
                    <TouchableOpacity style={styles.input} onPress={() => setShowDateModal(true)} activeOpacity={0.7}>
                        <Text style={styles.selectedText}>{data}</Text>
                    </TouchableOpacity> */}
                </View>
            </View>

            {/* Campo Observação */}
            <Text style={styles.label}>Observação (Opcional)</Text>
            <TextInput 
                style={[styles.input, styles.textArea]} 
                value={obs} 
                onChangeText={setObs} 
                placeholder="Notas sobre o item"
                maxLength={200}
                multiline
            />

            {/* Campo Contrato (Picker Modal) - No rodapé para manter o foco nos dados do item */}
            <Text style={styles.label}>Contrato Associado *</Text>
            <TouchableOpacity style={styles.input} onPress={() => setShowContratoModal(true)} activeOpacity={0.7}>
                <Text style={contratoId ? styles.selectedText : styles.placeholderText}>
                    {getLabel(contratoId, CONTRATO_OPTIONS)}
                </Text>
            </TouchableOpacity>


            <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={loading}>
                <Text style={styles.saveButtonText}>
                    {loading ? 'Salvando...' : (isEditing ? 'Atualizar Item' : 'Salvar Item BM')}
                </Text>
            </TouchableOpacity>

            {/* Modais de Seleção */}
            <CustomPickerModal
                visible={showContratoModal}
                onClose={() => setShowContratoModal(false)}
                options={CONTRATO_OPTIONS}
                onSelect={(value) => setContratoId(value)}
                selectedValue={contratoId}
                title="Selecione o Contrato"
            />
            <CustomPickerModal
                visible={showDisciplinaModal}
                onClose={() => setShowDisciplinaModal(false)}
                options={DISCIPLINA_OPTIONS}
                onSelect={(value) => setDisciplina(value)}
                selectedValue={disciplina}
                title="Selecione a Disciplina"
            />
            <CustomPickerModal
                visible={showUndModal}
                onClose={() => setShowUndModal(false)}
                options={UND_OPTIONS}
                onSelect={(value) => setUnd(value)}
                selectedValue={und}
                title="Selecione a Unidade"
            />

            {/* Modal de Mensagens */}
            <MessageModal
                visible={modalVisible}
                message={modalMessage}
                onClose={() => {
                    setModalVisible(false);
                    if (navigateOnClose) navigation.goBack();
                }}
            />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 16, backgroundColor: '#f5f7fa' },
    scrollContent: { paddingBottom: 40 },
    loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    title: { fontSize: 22, fontWeight: 'bold', marginVertical: 15, color: '#00315c', textAlign: 'center' },
    label: { fontSize: 14, fontWeight: '600', marginBottom: 4, color: '#333' },
    input: {
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 8,
        padding: 12,
        marginBottom: 15,
        backgroundColor: '#fff',
        justifyContent: 'center',
        minHeight: 50,
        fontSize: 16,
    },
    textArea: { 
        minHeight: 80, 
        textAlignVertical: 'top',
        paddingTop: 12
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 5, // Ajusta o espaçamento se os inputs internos já tiverem margin
    },
    halfInput: {
        flex: 1,
        marginRight: 8, // Espaçamento entre os campos na linha
    },
    // Removendo marginRight no último elemento da row
    // (Pode ser resolvido com `flexWrap` ou ajustando o padding da row)
    'halfInput:last-child': {
        marginRight: 0,
    },
    selectedText: { color: '#000', fontSize: 16 },
    placeholderText: { color: '#9e9e9e', fontSize: 16 },
    saveButton: {
        backgroundColor: '#00315c',
        padding: 15,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 30,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
        elevation: 5,
    },
    saveButtonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
});