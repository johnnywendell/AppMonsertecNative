import React, { useState, useEffect, useLayoutEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { salvarASLocal, buscarAS } from '../../services/asService';
import MessageModal from '../../components/MessageModal';
import CustomPickerModal from '../../components/CustomPickerModal'; 
// CORREÇÃO AQUI: Importa DatePicker diretamente do arquivo DatePicker.
import DatePicker from '../../components/DatePicker'; 

// Importa as funções de fetch do dataService
import { 
    fetchUnidades, 
    fetchSolicitantes, 
    fetchAprovadores, 
    fetchProjetoCodigos 
} from '../../services/dataService'; 

// Opções estáticas de choices do modelo Django (convertidas para {label, value})
const TIPO_OPTIONS = [
    { label: 'PARADA', value: 'PARADA' },
    { label: 'PACOTE', value: 'PACOTE' },
    { label: 'ROTINA', value: 'ROTINA' },
    { label: 'PROJETO', value: 'PROJETO' },
];

const DISCIP_OPTIONS = [
    { label: 'ANDAIME', value: 'ANDAIME' },
    { label: 'PINTURA', value: 'PINTURA' },
    { label: 'ISOLAMENTO', value: 'ISOLAMENTO' },
    { label: 'GERAL', value: 'GERAL' },
];

const AS_STATUS_OPTIONS = [
    { label: 'EM ELABORAÇÃO', value: 'EM ELABORAÇÃO' },
    { label: 'AGUARDANDO APROVAÇÃO', value: 'AGUARDANDO APROVAÇÃO' },
    { label: 'APROVADA', value: 'APROVADA' },
    { label: 'EXECUÇÃO', value: 'EXECUÇÃO' },
];


export default function ASFormScreen({ route }) {
    const navigation = useNavigation();
    const id = route.params?.id || null; 
    const isEditing = id !== null;

    // --- Estados do Formulário ---
    const [data, setData] = useState(new Date().toISOString().split('T')[0]); 
    const [tipo, setTipo] = useState(null);
    const [disciplina, setDisciplina] = useState(null);
    const [escopo, setEscopo] = useState('');
    const [local, setLocal] = useState('');
    const [obs, setObs] = useState('');
    const [asSap, setASSap] = useState('');
    const [asAntiga, setASAntiga] = useState('');
    const [statusAs, setStatusAs] = useState('EM ELABORAÇÃO'); 

    // --- Estados das FKs (Server IDs) ---
    const [unidadeId, setUnidadeId] = useState(null);
    const [solicitanteId, setSolicitanteId] = useState(null);
    const [aprovadorId, setAprovadorId] = useState(null);
    const [projetoCodId, setProjetoCodId] = useState(null);

    // --- Estados para Opções de Picker (Carregadas da API) ---
    const [unidadeOptions, setUnidadeOptions] = useState([]);
    const [solicitanteOptions, setSolicitanteOptions] = useState([]);
    const [aprovadorOptions, setAprovadorOptions] = useState([]);
    const [projetoCodOptions, setProjetoCodOptions] = useState([]);
    
    // --- Estados de Controle ---
    const [loading, setLoading] = useState(true);
    const [modalVisible, setModalVisible] = useState(false);
    const [modalMessage, setModalMessage] = useState('');
    const [navigateOnClose, setNavigateOnClose] = useState(false);
    const [showPickerModal, setShowPickerModal] = useState(null); 

    // Define o título da tela
    useLayoutEffect(() => {
        navigation.setOptions({
            title: isEditing ? 'Editar AS' : 'Nova AS',
        });
    }, [navigation, isEditing]);

    // Carrega dados da AS para edição e opções das FKs
    useEffect(() => {
        const loadFormData = async () => {
            try {
                // 1. Carregar Opções de FKs em paralelo
                const [
                    unidades, solicitantes, aprovadores, projetos
                ] = await Promise.all([
                    fetchUnidades(), 
                    fetchSolicitantes(), 
                    fetchAprovadores(), 
                    fetchProjetoCodigos()
                ]);

                setUnidadeOptions(unidades);
                setSolicitanteOptions(solicitantes);
                setAprovadorOptions(aprovadores);
                setProjetoCodOptions(projetos);

                // 2. Carregar dados da AS para edição
                if (isEditing) {
                    const asData = await buscarAS(id);
                    if (asData) {
                        setData(asData.data); 
                        setTipo(asData.tipo);
                        setDisciplina(asData.disciplina);
                        setEscopo(asData.escopo || '');
                        setLocal(asData.local || '');
                        setObs(asData.obs || '');
                        setASSap(asData.as_sap || '');
                        setASAntiga(asData.as_antiga || '');
                        setStatusAs(asData.status_as || 'EM ELABORAÇÃO');

                        // Mapear server_id para os estados
                        setUnidadeId(asData.unidade_server_id);
                        setSolicitanteId(asData.solicitante_server_id);
                        setAprovadorId(asData.aprovador_server_id);
                        setProjetoCodId(asData.projeto_cod_server_id);
                    }
                } else {
                    if (TIPO_OPTIONS.length > 0) setTipo(TIPO_OPTIONS[0].value);
                    if (DISCIP_OPTIONS.length > 0) setDisciplina(DISCIP_OPTIONS[0].value);
                }
            } catch (error) {
                console.error('Erro ao carregar dados do formulário:', error);
                setModalMessage('Não foi possível carregar as opções de seleção.');
                setModalVisible(true);
            } finally {
                setLoading(false);
            }
        };
        loadFormData();
    }, [id, isEditing]);


    const handleSave = async () => {
        if (!data || !tipo || !disciplina || !solicitanteId || !unidadeId) {
            setModalMessage('Por favor, preencha a Data, Tipo, Disciplina, Solicitante e Unidade.');
            setModalVisible(true);
            return;
        }

        setLoading(true);

        const dadosParaSalvar = {
            id: isEditing ? id : null,
            data, 
            tipo,
            disciplina,
            escopo,
            local,
            obs,
            rev: 0, 
            as_sap: asSap,
            as_antiga: asAntiga,
            status_as: statusAs,
            
            // FKs (Server IDs)
            unidade_server_id: unidadeId,
            solicitante_server_id: solicitanteId,
            aprovador_server_id: aprovadorId,
            projeto_cod_server_id: projetoCodId,
        };

        try {
            await salvarASLocal(dadosParaSalvar);
            setModalMessage(`AS ${isEditing ? 'atualizada' : 'criada'} e marcada para sincronização!`);
            setNavigateOnClose(true); 
            setModalVisible(true);
        } catch (error) {
            console.error('Erro ao salvar AS:', error);
            setModalMessage('Erro ao salvar AS. Verifique os dados e tente novamente.');
            setModalVisible(true);
        } finally {
            setLoading(false);
        }
    };
    
    // Função auxiliar para encontrar o label
    const getLabel = (value, options) => {
        return options.find(opt => opt.value === value)?.label || 'Selecione';
    };

    if (loading) {
        return <ActivityIndicator size="large" color="#00315c" style={styles.loading} />;
    }

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
            
            {/* Campo Data */}
            <Text style={styles.label}>Data *</Text>
            {/* CORREÇÃO AQUI: Usando o nome correto do componente: DatePicker */}
            <DatePicker 
                value={data} 
                onDateChange={setData} 
                label="Data *" 
            /> 

            {/* Campos de Seleção (Picker Modals) */}
            
            <Text style={styles.label}>Unidade *</Text>
            <TouchableOpacity style={styles.input} onPress={() => setShowPickerModal('UNIDADE')} activeOpacity={0.7}>
                <Text style={unidadeId ? styles.selectedText : styles.placeholderText}>
                    {getLabel(unidadeId, unidadeOptions)}
                </Text>
            </TouchableOpacity>
            
            {/* ... Restante dos Pickers e Inputs ... */}
            
            <Text style={styles.label}>Solicitante *</Text>
            <TouchableOpacity style={styles.input} onPress={() => setShowPickerModal('SOLICITANTE')} activeOpacity={0.7}>
                <Text style={solicitanteId ? styles.selectedText : styles.placeholderText}>
                    {getLabel(solicitanteId, solicitanteOptions)}
                </Text>
            </TouchableOpacity>
            
            <Text style={styles.label}>Aprovador</Text>
            <TouchableOpacity style={styles.input} onPress={() => setShowPickerModal('APROVADOR')} activeOpacity={0.7}>
                <Text style={aprovadorId ? styles.selectedText : styles.placeholderText}>
                    {getLabel(aprovadorId, aprovadorOptions)}
                </Text>
            </TouchableOpacity>

            <Text style={styles.label}>Tipo Serviço *</Text>
            <TouchableOpacity style={styles.input} onPress={() => setShowPickerModal('TIPO')} activeOpacity={0.7}>
                <Text style={tipo ? styles.selectedText : styles.placeholderText}>
                    {getLabel(tipo, TIPO_OPTIONS)}
                </Text>
            </TouchableOpacity>

            <Text style={styles.label}>Disciplina *</Text>
            <TouchableOpacity style={styles.input} onPress={() => setShowPickerModal('DISCIPLINA')} activeOpacity={0.7}>
                <Text style={disciplina ? styles.selectedText : styles.placeholderText}>
                    {getLabel(disciplina, DISCIP_OPTIONS)}
                </Text>
            </TouchableOpacity>

            <Text style={styles.label}>Cód. Projetos</Text>
            <TouchableOpacity style={styles.input} onPress={() => setShowPickerModal('PROJETO_COD')} activeOpacity={0.7}>
                <Text style={projetoCodId ? styles.selectedText : styles.placeholderText}>
                    {getLabel(projetoCodId, projetoCodOptions)}
                </Text>
            </TouchableOpacity>

            {/* Campos de Texto */}
            <Text style={styles.label}>Escopo do serviço</Text>
            <TextInput style={styles.input} value={escopo} onChangeText={setEscopo} placeholder="Breve descrição do escopo" />
            
            <Text style={styles.label}>Local do serviço</Text>
            <TextInput style={styles.input} value={local} onChangeText={setLocal} placeholder="Área, equipamento ou tag" />

            <Text style={styles.label}>AS SAP</Text>
            <TextInput style={styles.input} value={asSap} onChangeText={setASSap} placeholder="Nº da AS no SAP" />

            <Text style={styles.label}>Nº AS (antigo)</Text>
            <TextInput style={styles.input} value={asAntiga} onChangeText={setASAntiga} placeholder="Nº antigo, se houver" />

            <Text style={styles.label}>Status AS</Text>
            <TouchableOpacity style={styles.input} onPress={() => setShowPickerModal('STATUS_AS')} activeOpacity={0.7}>
                <Text style={statusAs ? styles.selectedText : styles.placeholderText}>
                    {getLabel(statusAs, AS_STATUS_OPTIONS)}
                </Text>
            </TouchableOpacity>
            
            <Text style={styles.label}>Obs</Text>
            <TextInput 
                style={[styles.input, styles.textArea]} 
                value={obs} 
                onChangeText={setObs} 
                placeholder="Observações adicionais" 
                multiline 
            />

            <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={loading}>
                <Text style={styles.saveButtonText}>
                    {loading ? 'Salvando...' : (isEditing ? 'Atualizar AS' : 'Salvar AS')}
                </Text>
            </TouchableOpacity>

            {/* Modals de Seleção */}
            <CustomPickerModal visible={showPickerModal === 'UNIDADE'} onClose={() => setShowPickerModal(null)} options={unidadeOptions} onSelect={setUnidadeId} selectedValue={unidadeId} title="Selecione a Unidade" />
            <CustomPickerModal visible={showPickerModal === 'SOLICITANTE'} onClose={() => setShowPickerModal(null)} options={solicitanteOptions} onSelect={setSolicitanteId} selectedValue={solicitanteId} title="Selecione o Solicitante" />
            <CustomPickerModal visible={showPickerModal === 'APROVADOR'} onClose={() => setShowPickerModal(null)} options={aprovadorOptions} onSelect={setAprovadorId} selectedValue={aprovadorId} title="Selecione o Aprovador" />
            <CustomPickerModal visible={showPickerModal === 'TIPO'} onClose={() => setShowPickerModal(null)} options={TIPO_OPTIONS} onSelect={setTipo} selectedValue={tipo} title="Selecione o Tipo" />
            <CustomPickerModal visible={showPickerModal === 'DISCIPLINA'} onClose={() => setShowPickerModal(null)} options={DISCIP_OPTIONS} onSelect={setDisciplina} selectedValue={disciplina} title="Selecione a Disciplina" />
            <CustomPickerModal visible={showPickerModal === 'PROJETO_COD'} onClose={() => setShowPickerModal(null)} options={projetoCodOptions} onSelect={setProjetoCodId} selectedValue={projetoCodId} title="Selecione o Cód. Projeto" />
            <CustomPickerModal visible={showPickerModal === 'STATUS_AS'} onClose={() => setShowPickerModal(null)} options={AS_STATUS_OPTIONS} onSelect={setStatusAs} selectedValue={statusAs} title="Selecione o Status" />

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

// ... (Estilos permanecem inalterados)
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
        minHeight: 100,
        textAlignVertical: 'top',
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