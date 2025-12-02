import React, { useState, useEffect, useLayoutEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { salvarAreaLocal, buscarArea } from '../../services/areaService';
import MessageModal from '../../components/MessageModal';
import CustomPickerModal from '../../components/CustomPickerModal'; 

// Opções estáticas de exemplo para o Contrato.
// Na aplicação real, estas opções seriam carregadas do SQLite/Server.
const CONTRATO_OPTIONS = [
    { label: 'Contrato Braskem', value: 1 },

];

export default function AreaFormScreen({ route }) {
    const navigation = useNavigation();
    const id = route.params?.id || null; // ID local da Área (ou null para novo)
    const isEditing = id !== null;

    const [area, setArea] = useState('');
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
            title: isEditing ? 'Editar Área' : 'Nova Área',
        });
    }, [navigation, isEditing]);

    // Carregar dados para edição
    useEffect(() => {
        if (isEditing) {
            const loadArea = async () => {
                try {
                    const areaData = await buscarArea(id);
                    if (areaData) {
                        setArea(areaData.area);
                        setContratoId(areaData.contrato_server_id || CONTRATO_OPTIONS[0].value);
                    }
                } catch (error) {
                    console.error('Erro ao carregar Área:', error);
                    // Use MessageModal em vez de Alert
                    setModalMessage('Não foi possível carregar os dados da Área.');
                    setModalVisible(true);
                } finally {
                    setLoading(false);
                }
            };
            loadArea();
        } else {
            setLoading(false);
        }
    }, [id, isEditing]);

    const handleSave = async () => {
        if (!area || !contratoId) {
            setModalMessage('Por favor, preencha o nome da Área e selecione o Contrato.');
            setModalVisible(true);
            return;
        }

        setLoading(true);

        const dadosParaSalvar = {
            id: isEditing ? id : null, // ID local (SQLite)
            area,
            contrato_server_id: contratoId,
        };

        try {
            await salvarAreaLocal(dadosParaSalvar);
            setModalMessage(`Área ${isEditing ? 'atualizada' : 'criada'} e marcada para sincronização!`);
            setNavigateOnClose(true); // Volta para a lista ao fechar o modal
            setModalVisible(true);
        } catch (error) {
            console.error('Erro ao salvar Área:', error);
            // Verifica se o erro é de unique constraint (Area já existe)
            if (error.message && error.message.includes('UNIQUE constraint failed')) {
                setModalMessage('Erro: O nome da Área já existe. Por favor, escolha outro nome.');
            } else {
                setModalMessage('Erro ao salvar Área. Verifique os dados e tente novamente.');
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
            <Text style={styles.title}>{isEditing ? `Editando Área: ${area}` : 'Nova Área'}</Text>
            
            {/* Campo Nome da Área */}
            <Text style={styles.label}>Nome da Área *</Text>
            <TextInput 
                style={styles.input} 
                value={area} 
                onChangeText={setArea} 
                placeholder="Nome da área (Ex: Caldeiraria, Sec. 102)"
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
                    {loading ? 'Salvando...' : (isEditing ? 'Atualizar Área' : 'Salvar Área')}
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