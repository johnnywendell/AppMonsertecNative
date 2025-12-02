import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Platform, Modal, TouchableWithoutFeedback, Animated, Easing } from 'react-native'; import DateTimePicker from '@react-native-community/datetimepicker';
import { useNavigation } from '@react-navigation/native';
import { inserirApontamento, fetchAreas, fetchProjetos, fetchColaboradores } from '../services/apontamentosService';
import MessageModal from '../components/MessageModal';
import NetInfo from '@react-native-community/netinfo';
import ColaboradorModal from '../components/ColaboradorModal';
import { buscarUltimoApontamentoCompleto, buscarUltimoApontamentoDiaAnterior } from '../services/apontamentosService';

export default function CriarApontamentoScreen() {
    const navigation = useNavigation();
    const [data, setData] = useState(new Date());
    const [mostrarData, setMostrarData] = useState(false);
    const [area, setArea] = useState('');
    const [disciplina, setDisciplina] = useState('');
    const [projeto, setProjeto] = useState('');
    const [observacoes, setObservacoes] = useState('');
    const [efetivos, setEfetivos] = useState([{ colaborador: '', status: '', lider: '0' }]);
    const [modalVisible, setModalVisible] = useState(false);
    const [modalMessage, setModalMessage] = useState('');
    const [navigateOnClose, setNavigateOnClose] = useState(false);
    const [areas, setAreas] = useState([]);
    const [projetos, setProjetos] = useState([]);
    const [colaboradores, setColaboradores] = useState([]);
    const [isOnline, setIsOnline] = useState(true);
    const [showColaboradorModal, setShowColaboradorModal] = useState(false);
    const [selectedEfetivoIndex, setSelectedEfetivoIndex] = useState(null);

    // Novos estados para os modais personalizados
    const [showAreaModal, setShowAreaModal] = useState(false);
    const [showDisciplinaModal, setShowDisciplinaModal] = useState(false);
    const [showProjetoModal, setShowProjetoModal] = useState(false);
    const [showStatusModal, setShowStatusModal] = useState(false);
    const [showLiderModal, setShowLiderModal] = useState(false);
    const [currentEfetivoIndex, setCurrentEfetivoIndex] = useState(0);

    const disciplinas = [
        { label: 'ANDAIME', value: 'AND' },
        { label: 'PINTURA', value: 'PIN' },
        { label: 'ISOLAMENTO', value: 'ISO' },
    ];
    const statusOptions = ['PRESENTE', 'FALTA', 'FÉRIAS', 'EXAMES', 'TREINAMENTO'];
    const liderOptions = [
        { label: 'NÃO', value: '0' },
        { label: 'SIM', value: '1' },
    ];

    const preencherComUltimoApontamento = async () => {
        try {
            const ultimo = await buscarUltimoApontamentoCompleto();

            if (!ultimo) {
                setModalMessage('Nenhum apontamento anterior encontrado.');
                setModalVisible(true);
                return;
            }

            // Preenche os campos com os dados do último apontamento
            setData(new Date(ultimo.data));
            setArea(String(ultimo.area));
            setDisciplina(ultimo.disciplina);
            setProjeto(String(ultimo.projeto));
            setObservacoes(ultimo.observacoes || '');

            // Preenche os efetivos
            if (ultimo.apontamentos && ultimo.apontamentos.length > 0) {
                setEfetivos(
                    ultimo.apontamentos.map((e) => ({
                        colaborador: String(e.colaborador),
                        status: e.status,
                        lider: String(e.lider),
                    }))
                );
            }

            setModalMessage('Campos preenchidos com o último apontamento!');
            setModalVisible(true);
        } catch (error) {
            setModalMessage('Erro ao buscar último apontamento: ' + error.message);
            setModalVisible(true);
        }
    };


    useEffect(() => {
        const loadData = async () => {
            const netInfo = await NetInfo.fetch();
            setIsOnline(netInfo.isConnected);
            try {
                const [fetchedAreas, fetchedProjetos, fetchedColaboradores] = await Promise.all([
                    fetchAreas(),
                    fetchProjetos(),
                    fetchColaboradores(),
                ]);
                setAreas(fetchedAreas || []);
                setProjetos(fetchedProjetos || []);
                setColaboradores(fetchedColaboradores || []);
            } catch (error) {
                console.error('Erro ao carregar dados iniciais:', error);
                setModalMessage('Erro ao carregar dados. Tente novamente.');
                setModalVisible(true);
            }
        };
        loadData();
    }, []);

    const atualizarEfetivo = (index, campo, valor) => {
        const novos = [...efetivos];
        novos[index][campo] = valor;
        setEfetivos(novos);
    };

    const adicionarEfetivo = () => {
        setEfetivos([...efetivos, { colaborador: '', status: '', lider: '0' }]);
    };

    const removerEfetivo = (index) => {
        setEfetivos(efetivos.filter((_, i) => i !== index));
    };

    const handleSalvar = async () => {
        if (!data || !area || !disciplina || !projeto || efetivos.some(e => !e.colaborador || !e.status)) {
            setModalMessage('Por favor, preencha todos os campos obrigatórios.');
            setModalVisible(true);
            return;
        }

        const apontamento = {
            data: data.toISOString().split('T')[0],
            area: parseInt(area),
            projeto_cod: parseInt(projeto),
            disciplina,
            obs: observacoes,
            apontamentos: efetivos.map(e => ({
                colaborador: parseInt(e.colaborador),
                status: e.status,
                lider: e.lider,
            })),
        };

        try {
            await inserirApontamento(apontamento, efetivos, (result) => {
                if (result && (result.id || result.insertId)) {
                    setModalMessage(`Apontamento salvo ${isOnline ? 'e sincronizado' : 'localmente'} com sucesso!`);
                    setNavigateOnClose(true);
                } else {
                    setModalMessage('Erro ao salvar apontamento.');
                }
                setModalVisible(true);
            });
        } catch (error) {
            setModalMessage('Erro ao salvar apontamento: ' + error.message);
            setModalVisible(true);
        }
    };

    // Componente para os modais de seleção personalizados
    const CustomPickerModal = ({ visible, onClose, options, onSelect, selectedValue, title }) => {
        const [animation] = useState(new Animated.Value(0));

        useEffect(() => {
            if (visible) {
                Animated.timing(animation, {
                    toValue: 1,
                    duration: 300,
                    easing: Easing.out(Easing.cubic),
                    useNativeDriver: true
                }).start();
            } else {
                Animated.timing(animation, {
                    toValue: 0,
                    duration: 200,
                    easing: Easing.in(Easing.cubic),
                    useNativeDriver: true
                }).start();
            }
        }, [visible]);

        const translateY = animation.interpolate({
            inputRange: [0, 1],
            outputRange: [300, 0]
        });

        const opacity = animation.interpolate({
            inputRange: [0, 1],
            outputRange: [0, 1]
        });

        return (
            <Modal
                visible={visible}
                transparent={true}
                animationType="none"
                onRequestClose={onClose}
            >
                <Animated.View style={[styles.modalOverlay, { opacity }]}>
                    <TouchableWithoutFeedback onPress={onClose}>
                        <View style={styles.modalOverlayContent} />
                    </TouchableWithoutFeedback>
                </Animated.View>

                <Animated.View style={[styles.modalContainer, { transform: [{ translateY }] }]}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{title}</Text>
                            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                                <Text style={styles.closeButtonText}>✕</Text>
                            </TouchableOpacity>
                        </View>
                        <ScrollView style={styles.modalScrollView}>
                            {options.map((option, index) => (
                                <TouchableOpacity
                                    key={index}
                                    style={[
                                        styles.modalOption,
                                        selectedValue === option.value && styles.modalOptionSelected
                                    ]}
                                    onPress={() => {
                                        onSelect(option.value);
                                        onClose();
                                    }}
                                    activeOpacity={0.7}
                                >
                                    <Text style={[
                                        styles.modalOptionText,
                                        selectedValue === option.value && styles.modalOptionTextSelected
                                    ]}>
                                        {option.label}
                                    </Text>
                                    {selectedValue === option.value && (
                                        <Text style={styles.selectedIcon}>✓</Text>
                                    )}
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                </Animated.View>
            </Modal>
        );
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: 12 }}>
                <Text style={styles.title}>Criar Apontamento</Text>

                <TouchableOpacity
                    onPress={preencherComUltimoApontamento}
                    style={{
                        backgroundColor: '#00315c',
                        paddingVertical: 6,
                        paddingHorizontal: 12,
                        borderRadius: 5,
                        marginLeft: 8,
                    }}
                >
                    <Text style={{ fontWeight: 'bold', color: '#fff' }}>{'\u{1F504}'} Preencher com último</Text>
                </TouchableOpacity>
            </View>
            <Text style={[styles.status, { color: isOnline ? '#28a745' : '#dc3545' }]}>
                {isOnline ? 'Online' : 'Offline'}
            </Text>

            <Text style={styles.label}>Data *</Text>
            <TouchableOpacity onPress={() => setMostrarData(true)} style={styles.input}>
                <Text>{data.toLocaleDateString('pt-BR')}</Text>
            </TouchableOpacity>
            {mostrarData && (
                <DateTimePicker
                    value={data}
                    mode="date"
                    display="default"
                    onChange={(event, selectedDate) => {
                        setMostrarData(Platform.OS === 'ios');
                        if (selectedDate) setData(selectedDate);
                    }}
                />
            )}

            <Text style={styles.label}>Área *</Text>
            <TouchableOpacity
                style={styles.input}
                onPress={() => setShowAreaModal(true)}
            >
                <Text style={area ? styles.selectedText : styles.placeholderText}>
                    {area ? areas.find(a => String(a.id) === area)?.area || `Área ${area}` : 'Selecione uma área'}
                </Text>
            </TouchableOpacity>

            <Text style={styles.label}>Disciplina *</Text>
            <TouchableOpacity
                style={styles.input}
                onPress={() => setShowDisciplinaModal(true)}
            >
                <Text style={disciplina ? styles.selectedText : styles.placeholderText}>
                    {disciplina ? disciplinas.find(d => d.value === disciplina)?.label : 'Selecione uma disciplina'}
                </Text>
            </TouchableOpacity>

            <Text style={styles.label}>Código do Projeto *</Text>
            <TouchableOpacity
                style={styles.input}
                onPress={() => setShowProjetoModal(true)}
            >
                <Text style={projeto ? styles.selectedText : styles.placeholderText}>
                    {projeto ? projetos.find(p => String(p.id) === projeto)?.codigo_exibicao || projetos.find(p => String(p.id) === projeto)?.projeto_nome : 'Selecione um projeto'}
                </Text>
            </TouchableOpacity>

            <Text style={styles.label}>Observações</Text>
            <TextInput
                style={[styles.input, { minHeight: 60, textAlignVertical: 'top' }]}
                value={observacoes}
                onChangeText={setObservacoes}
                placeholder="Digite observações"
                maxLength={255}
                multiline
            />

            <Text style={styles.title}>Efetivo</Text>
            {efetivos.map((efetivo, i) => (
                <View key={i} style={styles.efetivoCard}>
                    <Text style={styles.label}>Colaborador *</Text>
                    <TouchableOpacity
                        style={styles.input}
                        onPress={() => {
                            setSelectedEfetivoIndex(i);
                            setShowColaboradorModal(true);
                        }}
                    >
                        <Text style={efetivo.colaborador ? styles.selectedText : styles.placeholderText}>
                            {efetivo.colaborador
                                ? (() => {
                                    const c = colaboradores.find(c => String(c.id) === efetivo.colaborador);
                                    return c ? `${c.matricula} - ${c.nome}` : 'Selecione um colaborador';
                                })()
                                : 'Selecione um colaborador'}
                        </Text>
                    </TouchableOpacity>

                    <Text style={styles.label}>Status *</Text>
                    <TouchableOpacity
                        style={styles.input}
                        onPress={() => {
                            setCurrentEfetivoIndex(i);
                            setShowStatusModal(true);
                        }}
                    >
                        <Text style={efetivo.status ? styles.selectedText : styles.placeholderText}>
                            {efetivo.status || 'Selecione um status'}
                        </Text>
                    </TouchableOpacity>

                    <Text style={styles.label}>Líder *</Text>
                    <TouchableOpacity
                        style={styles.input}
                        onPress={() => {
                            setCurrentEfetivoIndex(i);
                            setShowLiderModal(true);
                        }}
                    >
                        <Text style={efetivo.lider ? styles.selectedText : styles.placeholderText}>
                            {efetivo.lider ? liderOptions.find(l => l.value === efetivo.lider)?.label : 'Selecione uma opção'}
                        </Text>
                    </TouchableOpacity>

                    {efetivos.length > 1 && (
                        <TouchableOpacity onPress={() => removerEfetivo(i)} style={styles.removerBtn}>
                            <Text style={styles.removerBtnText}>{'\u{1F5D1}'} Remover</Text>
                        </TouchableOpacity>
                    )}
                </View>
            ))}

            <TouchableOpacity onPress={adicionarEfetivo} style={styles.adicionarBtn}>
                <Text style={styles.adicionarBtnText}>{'\uFF0B'} Adicionar Efetivo</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.saveButton} onPress={handleSalvar}>
                <Text style={styles.saveButtonText}>Salvar Apontamento</Text>
            </TouchableOpacity>

            {/* Modais personalizados para substituir os Pickers */}
            <CustomPickerModal
                visible={showAreaModal}
                onClose={() => setShowAreaModal(false)}
                options={[
                    { label: "Selecione uma área", value: "" },
                    ...areas.map(a => ({ label: a.area || `Área ${a.id}`, value: String(a.id) }))
                ]}
                onSelect={(value) => setArea(value)}
                selectedValue={area}
                title="Selecione uma área"
            />

            <CustomPickerModal
                visible={showDisciplinaModal}
                onClose={() => setShowDisciplinaModal(false)}
                options={[
                    { label: "Selecione uma disciplina", value: "" },
                    ...disciplinas.map(d => ({ label: d.label, value: d.value }))
                ]}
                onSelect={(value) => setDisciplina(value)}
                selectedValue={disciplina}
                title="Selecione uma disciplina"
            />

            <CustomPickerModal
                visible={showProjetoModal}
                onClose={() => setShowProjetoModal(false)}
                options={[
                    { label: "Selecione um projeto", value: "" },
                    ...projetos.map(p => ({
                        label: p.codigo_exibicao || p.projeto_nome,
                        value: String(p.id)
                    }))
                ]}
                onSelect={(value) => setProjeto(value)}
                selectedValue={projeto}
                title="Selecione um projeto"
            />

            <CustomPickerModal
                visible={showStatusModal}
                onClose={() => setShowStatusModal(false)}
                options={[
                    { label: "Selecione um status", value: "" },
                    ...statusOptions.map(s => ({ label: s, value: s }))
                ]}
                onSelect={(value) => atualizarEfetivo(currentEfetivoIndex, 'status', value)}
                selectedValue={efetivos[currentEfetivoIndex]?.status}
                title="Selecione um status"
            />

            <CustomPickerModal
                visible={showLiderModal}
                onClose={() => setShowLiderModal(false)}
                options={liderOptions}
                onSelect={(value) => atualizarEfetivo(currentEfetivoIndex, 'lider', value)}
                selectedValue={efetivos[currentEfetivoIndex]?.lider}
                title="É líder?"
            />

            <MessageModal
                visible={modalVisible}
                message={modalMessage}
                onClose={() => {
                    setModalVisible(false);
                    if (navigateOnClose) navigation.goBack();
                }}
            />
            <ColaboradorModal
                visible={showColaboradorModal}
                onClose={() => setShowColaboradorModal(false)}
                colaboradores={colaboradores}
                onSelect={(colaborador) => {
                    if (selectedEfetivoIndex !== null) {
                        atualizarEfetivo(selectedEfetivoIndex, 'colaborador', String(colaborador.id));
                    }
                    setShowColaboradorModal(false);
                }}
            />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { padding: 16, backgroundColor: '#fff' },
    scrollContent: { paddingBottom: 40 },
    title: { fontSize: 18, fontWeight: 'bold', marginVertical: 12 },
    status: { fontSize: 16, marginBottom: 12 },
    label: { fontSize: 14, fontWeight: '600', marginBottom: 4 },
    input: {
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 5,
        padding: 8,
        marginBottom: 12,
        backgroundColor: '#fff',
        justifyContent: 'center',
        minHeight: 40,
    },
    selectedText: {
        color: '#000',
    },
    placeholderText: {
        color: '#9e9e9e',
    },
    efetivoCard: {
        backgroundColor: '#eef1f6',
        borderRadius: 8,
        padding: 12,
        marginBottom: 16,
    },
    removerBtn: { marginTop: 8, alignSelf: 'flex-end' },
    removerBtnText: { color: '#b00', fontSize: 14 },
    adicionarBtn: { alignItems: 'center', marginBottom: 20 },
    adicionarBtnText: { fontSize: 16, color: '#00315c', fontWeight: '600' },
    saveButton: {
        backgroundColor: '#00315c',
        padding: 15,
        borderRadius: 5,
        alignItems: 'center',
        marginTop: 16,
    },
    saveButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    modalOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalOverlayContent: {
        flex: 1,
    },
    modalContainer: {
        position: 'absolute',
        top: '30%',
        left: '5%',
        transform: [{ translateX: -0.5 * 300 }, { translateY: -0.5 * 400 }],
        height: 'auto',
        width: '90%',
        backgroundColor: 'white',
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    modalContent: {
        flex: 1,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    closeButton: {
        padding: 4,
    },
    closeButtonText: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#999',
    },
    modalScrollView: {
        maxHeight: 300,
    },
    modalOption: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f5f5f5',
    },
    modalOptionSelected: {
        backgroundColor: '#e6f7ff',
    },
    modalOptionText: {
        fontSize: 16,
        color: '#333',
        flex: 1,
    },
    modalOptionTextSelected: {
        color: '#1890ff',
        fontWeight: '500',
    },
    selectedIcon: {
        color: '#1890ff',
        fontWeight: 'bold',
        fontSize: 16,
    },
});