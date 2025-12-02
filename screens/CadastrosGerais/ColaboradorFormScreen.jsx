import React, { useState, useEffect, useLayoutEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { salvarColaboradorLocal, buscarColaborador } from '../../services/colaboradorService';
// Assumindo que você tem um MessageModal e um CustomPickerModal genérico
import MessageModal from '../../components/MessageModal';
import CustomPickerModal from '../../components/CustomPickerModal'; // Componente que você mostrou

// Opções estáticas (baseadas no seu modelo Django)
const DISCIPLINAS = [
    { label: 'ANDAIME', value: 'AND' },
    { label: 'PINTURA', value: 'PIN' },
    { label: 'ISOLAMENTO', value: 'ISO' },
];

const STATUS_ATIVO = [
    { label: 'SIM (Ativo)', value: '1' },
    { label: 'NÃO (Inativo)', value: '0' },
    { label: 'FÉRIAS', value: '3' },
];

export default function ColaboradorFormScreen({ route }) {
    const navigation = useNavigation();
    const id = route.params?.id || null; // ID local do colaborador (ou null para novo)
    const isEditing = id !== null;

    const [nome, setNome] = useState('');
    const [matricula, setMatricula] = useState('');
    const [funcao, setFuncao] = useState('');
    const [disciplina, setDisciplina] = useState(DISCIPLINAS[0].value);
    const [ativo, setAtivo] = useState(STATUS_ATIVO[0].value);
    const [loading, setLoading] = useState(isEditing);

    // Modal para mensagens
    const [modalVisible, setModalVisible] = useState(false);
    const [modalMessage, setModalMessage] = useState('');
    const [navigateOnClose, setNavigateOnClose] = useState(false);

    // Modais para seleção
    const [showDisciplinaModal, setShowDisciplinaModal] = useState(false);
    const [showAtivoModal, setShowAtivoModal] = useState(false);

    // Define o título da tela
    useLayoutEffect(() => {
        navigation.setOptions({
            title: isEditing ? 'Editar Colaborador' : 'Novo Colaborador',
        });
    }, [navigation, isEditing]);

    // Carregar dados para edição
    useEffect(() => {
        if (isEditing) {
            const loadColaborador = async () => {
                try {
                    const colab = await buscarColaborador(id);
                    if (colab) {
                        setNome(colab.nome);
                        setMatricula(colab.matricula);
                        setFuncao(colab.funcao);
                        setDisciplina(colab.disciplina || DISCIPLINAS[0].value);
                        setAtivo(colab.ativo || STATUS_ATIVO[0].value);
                    }
                } catch (error) {
                    console.error('Erro ao carregar colaborador:', error);
                    Alert.alert('Erro', 'Não foi possível carregar os dados do colaborador.');
                } finally {
                    setLoading(false);
                }
            };
            loadColaborador();
        } else {
             // Caso seja criação, garante que o loading é falso
             setLoading(false);
        }
    }, [id, isEditing]);

    const handleSave = async () => {
        if (!nome || !matricula || !funcao || !disciplina || !ativo) {
            setModalMessage('Por favor, preencha todos os campos obrigatórios.');
            setModalVisible(true);
            return;
        }

        setLoading(true);

        const dadosParaSalvar = {
            id: isEditing ? id : null, // ID local (SQLite)
            nome,
            matricula,
            funcao,
            disciplina,
            ativo,
        };

        try {
            await salvarColaboradorLocal(dadosParaSalvar);
            setModalMessage(`Colaborador ${isEditing ? 'atualizado' : 'criado'} e marcado para sincronização!`);
            setNavigateOnClose(true); // Volta para a lista ao fechar o modal
            setModalVisible(true);
        } catch (error) {
            console.error('Erro ao salvar colaborador:', error);
            setModalMessage('Erro ao salvar colaborador. Verifique os dados e tente novamente.');
            setModalVisible(true);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <ActivityIndicator size="large" color="#00315c" style={styles.loading} />;
    }

    // Função auxiliar para encontrar o label da disciplina
    const getDisciplinaLabel = (value) => {
        return DISCIPLINAS.find(d => d.value === value)?.label || 'Selecione a disciplina';
    };

    // Função auxiliar para encontrar o label do status
    const getAtivoLabel = (value) => {
        return STATUS_ATIVO.find(s => s.value === value)?.label || 'Selecione o status';
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
            <Text style={styles.title}>{isEditing ? `Editando ${nome}` : 'Novo Colaborador'}</Text>
            
            <Text style={styles.label}>Nome *</Text>
            <TextInput style={styles.input} value={nome} onChangeText={setNome} placeholder="Nome completo" />

            <Text style={styles.label}>Matrícula *</Text>
            <TextInput style={styles.input} value={matricula} onChangeText={setMatricula} placeholder="Matrícula única" autoCapitalize="none" />

            <Text style={styles.label}>Função *</Text>
            <TextInput style={styles.input} value={funcao} onChangeText={setFuncao} placeholder="Ex: Montador, Pintor" />

            <Text style={styles.label}>Disciplina *</Text>
            <TouchableOpacity style={styles.input} onPress={() => setShowDisciplinaModal(true)} activeOpacity={0.7}>
                <Text style={disciplina ? styles.selectedText : styles.placeholderText}>
                    {getDisciplinaLabel(disciplina)}
                </Text>
            </TouchableOpacity>

            <Text style={styles.label}>Status Ativo *</Text>
            <TouchableOpacity style={styles.input} onPress={() => setShowAtivoModal(true)} activeOpacity={0.7}>
                <Text style={ativo ? styles.selectedText : styles.placeholderText}>
                    {getAtivoLabel(ativo)}
                </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={loading}>
                <Text style={styles.saveButtonText}>
                    {loading ? 'Salvando...' : (isEditing ? 'Atualizar Colaborador' : 'Salvar Colaborador')}
                </Text>
            </TouchableOpacity>

            {/* Modal de Disciplina */}
            <CustomPickerModal
                visible={showDisciplinaModal}
                onClose={() => setShowDisciplinaModal(false)}
                options={DISCIPLINAS}
                onSelect={(value) => setDisciplina(value)}
                selectedValue={disciplina}
                title="Selecione a Disciplina"
            />

            {/* Modal de Status Ativo */}
            <CustomPickerModal
                visible={showAtivoModal}
                onClose={() => setShowAtivoModal(false)}
                options={STATUS_ATIVO}
                onSelect={(value) => setAtivo(value)}
                selectedValue={ativo}
                title="Status do Colaborador"
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
    container: { flex: 1, padding: 16, backgroundColor: '#fff' },
    scrollContent: { paddingBottom: 40 },
    loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    title: { fontSize: 20, fontWeight: 'bold', marginVertical: 12, color: '#00315c' },
    label: { fontSize: 14, fontWeight: '600', marginBottom: 4, color: '#333' },
    input: {
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 5,
        padding: 10,
        marginBottom: 15,
        backgroundColor: '#fff',
        justifyContent: 'center',
        minHeight: 45,
    },
    selectedText: { color: '#000', fontSize: 16 },
    placeholderText: { color: '#9e9e9e', fontSize: 16 },
    saveButton: {
        backgroundColor: '#00315c',
        padding: 15,
        borderRadius: 5,
        alignItems: 'center',
        marginTop: 20,
    },
    saveButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
