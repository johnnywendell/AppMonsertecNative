import React, { useState, useEffect, useLayoutEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { salvarSolicitanteLocal, buscarSolicitante } from '../../services/solicitanteService'; // Importa o service de Solicitante
import MessageModal from '../../components/MessageModal';
import CustomPickerModal from '../../components/CustomPickerModal'; 

// Opções estáticas de exemplo para o Contrato.
// Na aplicação real, estas opções seriam carregadas do SQLite/Server.
const CONTRATO_OPTIONS = [
    { label: 'Contrato Braskem', value: 1 },
];

export default function SolicitanteFormScreen({ route }) {
    const navigation = useNavigation();
    const id = route.params?.id || null; // ID local do Solicitante (ou null para novo)
    const isEditing = id !== null;

    const [solicitante, setSolicitante] = useState(''); // Alterado de 'area' para 'solicitante'
    const [contratoId, setContratoId] = useState(CONTRATO_OPTIONS[0].value);
    const [loading, setLoading] = useState(isEditing);

    // Modais
    const [modalVisible, setModalVisible] = useState(false);
    const [modalMessage, setModalMessage] = useState('');
    const [navigateOnClose, setNavigateOnClose] = useState(false);
    const [showContratoModal, setShowContratoModal] = useState(false);

    // Define o título da tela
    useLayoutEffect(() => {
        navigation.setOptions({
            title: isEditing ? 'Editar Solicitante' : 'Novo Solicitante', // Título alterado
        });
    }, [navigation, isEditing]);

    // Carregar dados para edição
    useEffect(() => {
        if (isEditing) {
            const loadSolicitante = async () => { // Nome da função alterado
                try {
                    const solicitanteData = await buscarSolicitante(id); // Chamada alterada
                    if (solicitanteData) {
                        setSolicitante(solicitanteData.solicitante); // Campo alterado
                        setContratoId(solicitanteData.contrato_server_id || CONTRATO_OPTIONS[0].value);
                    }
                } catch (error) {
                    console.error('Erro ao carregar Solicitante:', error);
                    // Use MessageModal em vez de Alert
                    setModalMessage('Não foi possível carregar os dados do Solicitante.'); // Mensagem alterada
                    setModalVisible(true);
                } finally {
                    setLoading(false);
                }
            };
            loadSolicitante();
        } else {
            setLoading(false);
        }
    }, [id, isEditing]);

    const handleSave = async () => {
        if (!solicitante || !contratoId) { // Validação alterada
            setModalMessage('Por favor, preencha o nome do Solicitante e selecione o Contrato.'); // Mensagem alterada
            setModalVisible(true);
            return;
        }

        setLoading(true);

        const dadosParaSalvar = {
            id: isEditing ? id : null, // ID local (SQLite)
            solicitante, // Campo de dados alterado
            contrato_server_id: contratoId,
        };

        try {
            await salvarSolicitanteLocal(dadosParaSalvar); // Chamada alterada
            setModalMessage(`Solicitante ${isEditing ? 'atualizado' : 'criado'} e marcado para sincronização!`); // Mensagem alterada
            setNavigateOnClose(true); // Volta para a lista ao fechar o modal
            setModalVisible(true);
        } catch (error) {
            console.error('Erro ao salvar Solicitante:', error); // Mensagem alterada
            // Verifica se o erro é de unique constraint (Solicitante já existe)
            if (error.message && error.message.includes('UNIQUE constraint failed')) {
                setModalMessage('Erro: O nome do Solicitante já existe. Por favor, escolha outro nome.'); // Mensagem alterada
            } else {
                setModalMessage('Erro ao salvar Solicitante. Verifique os dados e tente novamente.'); // Mensagem alterada
            }
            setModalVisible(true);
        } finally {
            setLoading(false);
        }
    };

    // Função auxiliar para encontrar o label do Contrato
    const getContratoLabel = (value) => {
        return CONTRATO_OPTIONS.find(c => c.value === value)?.label || 'Selecione o Contrato';
    };

    if (loading) {
        return <ActivityIndicator size="large" color="#00315c" style={styles.loading} />;
    }

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
            <Text style={styles.title}>{isEditing ? `Editando Solicitante: ${solicitante}` : 'Novo Solicitante'}</Text>
            
            {/* Campo Nome do Solicitante */}
            <Text style={styles.label}>Nome do Solicitante *</Text>
            <TextInput 
                style={styles.input} 
                value={solicitante} 
                onChangeText={setSolicitante} 
                placeholder="Nome do solicitante (Ex: João Silva)" // Placeholder alterado
                autoCapitalize="words" 
            />

            {/* Campo Contrato (Picker Modal) */}
            <Text style={styles.label}>Contrato Associado *</Text>
            <TouchableOpacity style={styles.input} onPress={() => setShowContratoModal(true)} activeOpacity={0.7}>
                <Text style={contratoId ? styles.selectedText : styles.placeholderText}>
                    {getContratoLabel(contratoId)}
                </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={loading}>
                <Text style={styles.saveButtonText}>
                    {loading ? 'Salvando...' : (isEditing ? 'Atualizar Solicitante' : 'Salvar Solicitante')}
                </Text>
            </TouchableOpacity>

            {/* Modal de Seleção de Contrato */}
            <CustomPickerModal
                visible={showContratoModal}
                onClose={() => setShowContratoModal(false)}
                options={CONTRATO_OPTIONS}
                onSelect={(value) => setContratoId(value)}
                selectedValue={contratoId}
                title="Selecione o Contrato"
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