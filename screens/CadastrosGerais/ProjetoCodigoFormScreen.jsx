import React, { useState, useEffect, useLayoutEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
// Importa o serviço correto
import { salvarProjetoCodigoLocal, buscarProjetoCodigo } from '../../services/projetoCodigoService'; 
import MessageModal from '../../components/MessageModal';
import CustomPickerModal from '../../components/CustomPickerModal'; 

// Opções estáticas de exemplo para o Contrato.
// **IMPORTANTE**: Na aplicação real, estas opções devem ser carregadas de uma tabela local de Contratos (offline-first).
const CONTRATO_OPTIONS = [
    { label: 'Contrato Braskem', value: 1 },
    { label: 'Contrato Petrobrás', value: 2 },
    { label: 'Contrato Vale', value: 3 },
];

export default function ProjetoCodigoFormScreen({ route }) {
    const navigation = useNavigation();
    const id = route.params?.id || null; // ID local do ProjetoCodigo (ou null para novo)
    const isEditing = id !== null;

    // Mudança: area -> projeto_nome
    const [projetoNome, setProjetoNome] = useState(''); 
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
            title: isEditing ? 'Editar Código de Projeto' : 'Novo Código de Projeto',
        });
    }, [navigation, isEditing]);

    // Carregar dados para edição
    useEffect(() => {
        if (isEditing) {
            const loadProjetoCodigo = async () => {
                try {
                    // Mudança: buscarArea -> buscarProjetoCodigo
                    const projetoData = await buscarProjetoCodigo(id);
                    if (projetoData) {
                        // Mudança: setArea(areaData.area) -> setProjetoNome(projetoData.projeto_nome)
                        setProjetoNome(projetoData.projeto_nome);
                        setContratoId(projetoData.contrato_server_id || CONTRATO_OPTIONS[0].value);
                    }
                } catch (error) {
                    console.error('Erro ao carregar Código de Projeto:', error);
                    setModalMessage('Não foi possível carregar os dados do Código de Projeto.');
                    setModalVisible(true);
                } finally {
                    setLoading(false);
                }
            };
            loadProjetoCodigo();
        } else {
            setLoading(false);
        }
    }, [id, isEditing]);

    const handleSave = async () => {
        if (!projetoNome || !contratoId) {
            setModalMessage('Por favor, preencha o Nome do Projeto e selecione o Contrato.');
            setModalVisible(true);
            return;
        }

        setLoading(true);

        const dadosParaSalvar = {
            id: isEditing ? id : null, // ID local (SQLite)
            projeto_nome: projetoNome, // Mudança: area -> projeto_nome
            contrato_server_id: contratoId,
        };

        try {
            // Mudança: salvarAreaLocal -> salvarProjetoCodigoLocal
            await salvarProjetoCodigoLocal(dadosParaSalvar); 
            setModalMessage(`Código de Projeto ${isEditing ? 'atualizado' : 'criado'} e marcado para sincronização!`);
            setNavigateOnClose(true); // Volta para a lista ao fechar o modal
            setModalVisible(true);
        } catch (error) {
            console.error('Erro ao salvar Código de Projeto:', error);
            // Adaptação da mensagem de erro
            if (error.message && error.message.includes('UNIQUE constraint failed')) {
                setModalMessage('Erro: O nome do Código de Projeto já existe. Por favor, escolha outro nome.');
            } else {
                setModalMessage('Erro ao salvar Código de Projeto. Verifique os dados e tente novamente.');
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
            <Text style={styles.title}>{isEditing ? `Editando Código: ${projetoNome}` : 'Novo Código de Projeto'}</Text>
            
            {/* Campo Nome do Projeto */}
            <Text style={styles.label}>Nome do Projeto *</Text>
            <TextInput 
                style={styles.input} 
                value={projetoNome} 
                onChangeText={setProjetoNome} 
                placeholder="Nome do Projeto (Ex: CIP-BRK-0001 Caldeiraria)"
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
                    {loading ? 'Salvando...' : (isEditing ? 'Atualizar Código' : 'Salvar Código')}
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