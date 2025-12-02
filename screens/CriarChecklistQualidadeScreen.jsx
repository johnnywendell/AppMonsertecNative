import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    TextInput,
    StyleSheet,
    Alert,
    ScrollView,
    TouchableOpacity,
    Platform,
    Switch,
    ActivityIndicator,
    KeyboardAvoidingView,
    Modal,
    TouchableWithoutFeedback,
    Animated,
    Easing,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { inserirChecklist, listarAreas, fetchColaboradores } from '../services/checklistQualidadeService';
import NetInfo from '@react-native-community/netinfo';

const PRIMARY = '#16356C';

function Section({ title, collapsed, onToggle, children }) {
    return (
        <View style={styles.section}>
            <TouchableOpacity onPress={onToggle} style={styles.sectionHeader} accessibilityRole="button">
                <Text style={styles.sectionTitle}>{title}</Text>
                <Text style={styles.sectionToggle}>{collapsed ? '+' : '−'}</Text>
            </TouchableOpacity>
            {!collapsed && <View style={styles.sectionBody}>{children}</View>}
        </View>
    );
}

function LabeledInput({ label, error, restrictNA, ...props }) {
    return (
        <View style={styles.field}>
            {label ? <Text style={styles.label}>{label}</Text> : null}
            <TextInput
                style={[styles.input, error && styles.inputError, props.style]}
                onChangeText={(text) => {
                    if (restrictNA && text.toUpperCase() === 'N/A') {
                        Alert.alert('Erro', 'O valor "N/A" não é permitido neste campo.');
                        return;
                    }
                    props.onChangeText(text);
                }}
                {...props}
            />
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </View>
    );
}

function DateButton({ label, value, onPress, error }) {
    return (
        <View style={styles.field}>
            <Text style={styles.label}>{label}</Text>
            <TouchableOpacity onPress={onPress} style={[styles.dateButton, error && styles.inputError]}>
                <Text>{value ? (value instanceof Date ? value.toLocaleString() : String(value)) : 'Selecionar'}</Text>
            </TouchableOpacity>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </View>
    );
}

function TimeButton({ label, value, onPress, error }) {
    return (
        <View style={styles.field}>
            <Text style={styles.label}>{label}</Text>
            <TouchableOpacity onPress={onPress} style={[styles.dateButton, error && styles.inputError]}>
                <Text>
                    {value ? (value instanceof Date ? value.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : String(value)) : 'Selecionar'}
                </Text>
            </TouchableOpacity>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </View>
    );
}

const CustomPickerModal = ({ visible, onClose, options, onSelect, selectedValue, title }) => {
    const [animation] = useState(new Animated.Value(0));

    useEffect(() => {
        if (visible) {
            Animated.timing(animation, {
                toValue: 1,
                duration: 300,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
            }).start();
        } else {
            Animated.timing(animation, {
                toValue: 0,
                duration: 200,
                easing: Easing.in(Easing.cubic),
                useNativeDriver: true,
            }).start();
        }
    }, [visible]);

    const translateY = animation.interpolate({
        inputRange: [0, 1],
        outputRange: [300, 0],
    });

    const opacity = animation.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 1],
    });

    return (
        <Modal visible={visible} transparent={true} animationType="none" onRequestClose={onClose}>
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
                                style={[styles.modalOption, selectedValue === option.value && styles.modalOptionSelected]}
                                onPress={() => {
                                    onSelect(option.value);
                                    onClose();
                                }}
                                activeOpacity={0.7}
                            >
                                <Text
                                    style={[
                                        styles.modalOptionText,
                                        selectedValue === option.value && styles.modalOptionTextSelected,
                                    ]}
                                >
                                    {option.label}
                                </Text>
                                {selectedValue === option.value && <Text style={styles.selectedIcon}>✓</Text>}
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            </Animated.View>
        </Modal>
    );
};

export default function CriarChecklistQualidadeScreen() {
    const navigation = useNavigation();
    const [checklist, setChecklist] = useState({
        cliente: '',
        tag: '',
        unidade: '',
        data: new Date(),
        data_edicao: new Date(),
        rec: '',
        nota: '',
        setor: '',
        tipo_serv: '',
        m2: '',
        esquema_pintura: '',
        tratamento: '',
        laudo: 1,
        rnc_n: 0,
        obs_final: '',
        aprovado: 1,
        calha_utec: 'N/A',
        guia_pc: 'N/A',
        fita_protec: 'N/A',
        trecho_rec: 'N/A',
        elastomero: 'N/A',
        volante_caps: 'N/A',
        doc: null,
        etapas: [],
        colaboradores: [],
    });
    const [areas, setAreas] = useState([]);
    const [colaboradores, setColaboradores] = useState([]);
    const [selectedColaborador, setSelectedColaborador] = useState('');
    const [selectedColaboradorIndex, setSelectedColaboradorIndex] = useState(null);
    const [sections, setSections] = useState({
        gerais: false,
        unidade: true,
        checklist: false,
        etapas: false,
        colaboradores: false,
        inspeccao: true,
    });
    const [datePicker, setDatePicker] = useState({ visible: false, field: null, index: null, mode: 'date' });
    const [loading, setLoading] = useState(true);
    const [errors, setErrors] = useState({});
    const [isOnline, setIsOnline] = useState(true);
    const [errorMessage, setErrorMessage] = useState('');

    // Modal states for custom pickers
    const [showTipoServModal, setShowTipoServModal] = useState(false);
    const [showUnidadeModal, setShowUnidadeModal] = useState(false);
    const [showCalhaUtecModal, setShowCalhaUtecModal] = useState(false);
    const [showGuiaPcModal, setShowGuiaPcModal] = useState(false);
    const [showFitaProtecModal, setShowFitaProtecModal] = useState(false);
    const [showTrechoRecModal, setShowTrechoRecModal] = useState(false);
    const [showElastomeroModal, setShowElastomeroModal] = useState(false);
    const [showVolanteCapsModal, setShowVolanteCapsModal] = useState(false);
    const [showColaboradorModal, setShowColaboradorModal] = useState(false);
    const [showColaboradorEtapaModal, setShowColaboradorEtapaModal] = useState(null);

    // Options for custom pickers
    const tipoServOptions = [
        { label: 'Selecione', value: '' },
        { label: 'PARADA', value: 'PARADA' },
        { label: 'PROJETO', value: 'PROJETO' },
        { label: 'NOTA', value: 'NOTA' },
        { label: 'PLANO DE PINTURA', value: 'PLANO DE PINTURA' },
        { label: 'INTEGRIDADE', value: 'INTEGRIDADE' },
        { label: 'MANUTENÇÃO', value: 'MANUTENCAO' },
    ];

    const choiceOptions = [
        { label: 'Selecione', value: '' },
        { label: 'SIM', value: 'SIM' },
        { label: 'NÃO', value: 'NÃO' },
    ];

    const colaboradorOptions = [
        { label: 'Selecione um colaborador', value: '' },
        ...colaboradores.map((col) => ({
            label: `${col.nome} (${col.matricula})`,
            value: String(col.id),
        })),
    ];

    useEffect(() => {
        const fetchData = async () => {
            const netInfo = await NetInfo.fetch();
            setIsOnline(netInfo.isConnected);

            try {
                setLoading(true);
                const [areasData, colaboradoresData] = await Promise.all([
                    listarAreas(),
                    fetchColaboradores(),
                ]);

                setAreas(areasData || []);
                setColaboradores(colaboradoresData || []);
                if (!areasData || areasData.length === 0) {
                    setErrorMessage('Nenhuma unidade disponível. Verifique sua conexão ou tente novamente.');
                }
                if (!colaboradoresData || colaboradoresData.length === 0) {
                    setErrorMessage('Nenhum colaborador disponível. Verifique sua conexão ou tente novamente.');
                }
            } catch (err) {
                setErrorMessage('Erro ao carregar dados. Usando dados locais, se disponíveis.');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const validate = useCallback(() => {
        const e = {};
        // Campos obrigatórios básicos
        if (!checklist.cliente?.trim()) e.cliente = 'Cliente é obrigatório';
        if (checklist.cliente?.toUpperCase() === 'N/A') e.cliente = 'Cliente não pode ser "N/A"';
        if (!checklist.tag?.trim()) e.tag = 'Tag é obrigatório';
        if (checklist.tag?.toUpperCase() === 'N/A') e.tag = 'Tag não pode ser "N/A"';
        if (!checklist.data) e.data = 'Data é obrigatória';
        if (!checklist.unidade) e.unidade = 'Unidade é obrigatória';
        if (!checklist.rec?.trim()) e.rec = 'Rec é obrigatório';
        if (checklist.rec?.toUpperCase() === 'N/A') e.rec = 'Rec não pode ser "N/A"';
        if (!checklist.nota?.trim()) e.nota = 'Nota é obrigatório';
        if (checklist.nota?.toUpperCase() === 'N/A') e.nota = 'Nota não pode ser "N/A"';
        if (!checklist.setor?.trim()) e.setor = 'Setor é obrigatório';
        if (checklist.setor?.toUpperCase() === 'N/A') e.setor = 'Setor não pode ser "N/A"';
        if (!checklist.tipo_serv) e.tipo_serv = 'Tipo de serviço é obrigatório';
        if (!checklist.m2?.trim()) e.m2 = 'Metro quadrado é obrigatório';
        if (checklist.m2?.toUpperCase() === 'N/A') e.m2 = 'Metro quadrado não pode ser "N/A"';
        if (!checklist.esquema_pintura?.trim()) e.esquema_pintura = 'Esquema de pintura é obrigatório';
        if (checklist.esquema_pintura?.toUpperCase() === 'N/A') e.esquema_pintura = 'Esquema de pintura não pode ser "N/A"';
        if (!checklist.tratamento?.trim()) e.tratamento = 'Tratamento é obrigatório';
        if (checklist.tratamento?.toUpperCase() === 'N/A') e.tratamento = 'Tratamento não pode ser "N/A"';

        // Campos de escolha: devem ser SIM ou NÃO, não N/A
        const choiceFields = ['calha_utec', 'guia_pc', 'fita_protec', 'trecho_rec', 'elastomero', 'volante_caps'];
        choiceFields.forEach((field) => {
            if (!checklist[field] || checklist[field] === 'N/A') {
                e[field] = 'Este campo deve ser SIM ou NÃO';
            }
        });

        // Validação das etapas
        if (checklist.etapas.some((etapa) => !etapa.tinta?.trim() || etapa.tinta.toUpperCase() === 'N/A')) {
            e.etapas = 'Todas as etapas devem ter o campo Tinta preenchido e não pode ser "N/A"';
        }

        setErrors(e);
        return Object.keys(e).length === 0;
    }, [checklist]);

    const handleChange = (field, value) => setChecklist((prev) => ({ ...prev, [field]: value }));

    // ETAPAS
    const adicionarEtapa = () => {
        if (checklist.etapas.length >= 3) {
            Alert.alert('Limite atingido', 'O máximo permitido são 3 etapas.');
            return;
        }
        const cores = [
            '#F5F8FC', // azul bem clarinho (derivado do navyblue)
            '#F9FCF5', // verde bem clarinho (derivado do limegreen)
            '#FFF8F3'  // laranja bem clarinho (derivado do carrot orange)
        ];
        setChecklist((prev) => ({
            ...prev,
            etapas: [
                ...prev.etapas,
                {
                    data_inicio: new Date(),
                    inicio: null,
                    termino: null,
                    tipo_substrato: '',
                    tinta: '',
                    cor_munsell: '',
                    lote_a: '',
                    lote_b: '',
                    lote_c: '',
                    fabricante: '',
                    data_final: new Date(),
                    colaborador: '',
                    corFundo: cores[checklist.etapas.length], // define a cor baseada na posição
                },
            ],
        }));
        setSections((prev) => ({ ...prev, etapas: false }));
    };

    const updateEtapa = (idx, field, value) => {
        if (field !== 'colaborador' && value.toUpperCase() === 'N/A') {
            Alert.alert('Erro', `O campo ${field} não pode ser "N/A".`);
            return;
        }
        const etapas = [...checklist.etapas];
        etapas[idx] = { ...etapas[idx], [field]: value };
        setChecklist({ ...checklist, etapas });
    };

    // COLABORADORES
    const openColaboradorModal = (index = null) => {
        setSelectedColaboradorIndex(index);
        setSelectedColaborador(index !== null ? checklist.colaboradores[index]?.colaborador || '' : '');
        setShowColaboradorModal(true);
    };

    const adicionarColaborador = (colaboradorId) => {
        if (!colaboradorId) {
            Alert.alert('Erro', 'Selecione um colaborador antes de adicionar.');
            return;
        }
        setChecklist((prev) => ({
            ...prev,
            colaboradores: [...prev.colaboradores, { colaborador: colaboradorId }],
        }));
        setShowColaboradorModal(false);
        setSections((prev) => ({ ...prev, colaboradores: false }));
    };

    const updateColaborador = (idx, value) => {
        const cols = [...checklist.colaboradores];
        cols[idx] = { ...cols[idx], colaborador: value };
        setChecklist((prev) => ({ ...prev, colaboradores: cols }));
    };

    const removerColaborador = (idx) => {
        Alert.alert(
            'Confirmar Remoção',
            'Tem certeza que deseja remover este colaborador?',
            [
                {
                    text: 'Cancelar',
                    style: 'cancel',
                },
                {
                    text: 'Remover',
                    onPress: () => {
                        const cols = [...checklist.colaboradores];
                        cols.splice(idx, 1);
                        setChecklist((prev) => ({ ...prev, colaboradores: cols }));
                    },
                    style: 'destructive',
                },
            ]
        );
    };

    const openColaboradorEtapaModal = (index) => {
        setShowColaboradorEtapaModal(index);
    };

    // DATE/TIME PICKER
    const openDateTime = (field, index = null, mode = 'date') => setDatePicker({ visible: true, field, index, mode });

    const onDateTimeChange = (event, selected) => {
        if (event.type === 'dismissed' || !selected) {
            setDatePicker({ visible: false, field: null, index: null, mode: 'date' });
            return;
        }
        const { field, index, mode } = datePicker;
        if (index === null) {
            setChecklist((prev) => ({ ...prev, [field]: selected }));
        } else {
            const etapas = [...checklist.etapas];
            etapas[index] = { ...etapas[index], [field]: selected };
            setChecklist((prev) => ({ ...prev, etapas }));
        }
        setDatePicker({ visible: false, field: null, index: null, mode: 'date' });
    };

    const submit = async () => {
        if (!validate()) {
            Alert.alert('Corrija os erros', 'Preencha os campos obrigatórios corretamente.');
            return;
        }

        setLoading(true);

        try {
            const payload = {
                ...checklist,
                unidade: parseInt(checklist.unidade),
                laudo: Boolean(checklist.laudo),
                rnc_n: Boolean(checklist.rnc_n),
                aprovado: Boolean(checklist.aprovado),
                m2: checklist.m2 ? parseFloat(checklist.m2) : null,
                data: checklist.data.toISOString().split('T')[0],
                data_edicao: checklist.data_edicao.toISOString().split('T')[0],
                checklist: checklist.etapas.map((e) => ({
                    ...e,
                    data_inicio: e.data_inicio instanceof Date ? e.data_inicio.toISOString().split('T')[0] : e.data_inicio,
                    data_final: e.data_final instanceof Date ? e.data_final.toISOString().split('T')[0] : e.data_final,
                    inicio: e.inicio instanceof Date ? e.inicio.toTimeString().slice(0, 5) : e.inicio,
                    termino: e.termino instanceof Date ? e.termino.toTimeString().slice(0, 5) : e.termino,
                })),
                colaboradorchecklist_set: checklist.colaboradores.map((c) => ({
                    colaborador: parseInt(c.colaborador),
                })),
                checklistcarimbo: [],
            };

            delete payload.doc;

            console.log('Payload para envio:', payload);

            const result = await inserirChecklist(payload);

            if (result.error) {
                throw new Error(result.error);
            }

            Alert.alert('Sucesso', 'Checklist criado com sucesso!', [
                { text: 'OK', onPress: () => navigation.goBack() },
            ]);
        } catch (error) {
            console.error('Erro detalhado:', error);
            Alert.alert('Erro', 'Não foi possível criar o checklist. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    const toggleSection = (key) => setSections((prev) => ({ ...prev, [key]: !prev[key] }));

    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
            <ScrollView contentContainerStyle={styles.container}>
                <Text style={[styles.status, { color: isOnline ? '#28a745' : '#dc3545' }]}>
                    {isOnline ? 'Online' : 'Offline'}
                </Text>
                {errorMessage && (
                    <View style={styles.errorContainer}>
                        <Text style={styles.errorText}>{errorMessage}</Text>
                    </View>
                )}
                {loading ? (
                    <ActivityIndicator size="large" color={PRIMARY} />
                ) : (
                    <>
                        <Section title="Informações Gerais" collapsed={sections.gerais} onToggle={() => toggleSection('gerais')}>
                            <LabeledInput
                                label="Cliente *"
                                placeholder="Nome do cliente"
                                value={checklist.cliente}
                                onChangeText={(text) => handleChange('cliente', text)}
                                error={errors.cliente}
                                restrictNA
                            />
                            <LabeledInput
                                label="Tag *"
                                placeholder="Tag"
                                value={checklist.tag}
                                onChangeText={(t) => handleChange('tag', t)}
                                error={errors.tag}
                                restrictNA
                            />
                            <DateButton
                                label="Data do Serviço *"
                                value={checklist.data}
                                onPress={() => openDateTime('data')}
                                error={errors.data}
                            />
                            <LabeledInput
                                label="Rec *"
                                placeholder="Rec"
                                value={checklist.rec}
                                onChangeText={(t) => handleChange('rec', t)}
                                error={errors.rec}
                                restrictNA
                            />
                            <LabeledInput
                                label="Nota *"
                                placeholder="Nota"
                                value={checklist.nota}
                                onChangeText={(t) => handleChange('nota', t)}
                                error={errors.nota}
                                restrictNA
                            />
                            <LabeledInput
                                label="Setor *"
                                placeholder="Setor"
                                value={checklist.setor}
                                onChangeText={(t) => handleChange('setor', t)}
                                error={errors.setor}
                                restrictNA
                            />
                        </Section>

                        <Section title="Unidade e Tipo de Serviço" collapsed={sections.unidade} onToggle={() => toggleSection('unidade')}>
                            <Text style={styles.label}>Tipo de Serviço *</Text>
                            <TouchableOpacity style={styles.input} onPress={() => setShowTipoServModal(true)}>
                                <Text style={checklist.tipo_serv ? styles.selectedText : styles.placeholderText}>
                                    {checklist.tipo_serv
                                        ? tipoServOptions.find((t) => t.value === checklist.tipo_serv)?.label || 'Selecione'
                                        : 'Selecione um tipo de serviço'}
                                </Text>
                            </TouchableOpacity>
                            {errors.tipo_serv ? <Text style={styles.errorText}>{errors.tipo_serv}</Text> : null}

                            <Text style={styles.label}>Unidade/Área *</Text>
                            <TouchableOpacity style={styles.input} onPress={() => setShowUnidadeModal(true)}>
                                <Text style={checklist.unidade ? styles.selectedText : styles.placeholderText}>
                                    {checklist.unidade
                                        ? areas.find((a) => String(a.id) === checklist.unidade)?.area || `Unidade ${checklist.unidade}`
                                        : 'Selecione uma unidade'}
                                </Text>
                            </TouchableOpacity>
                            {errors.unidade ? <Text style={styles.errorText}>{errors.unidade}</Text> : null}
                        </Section>

                        <Section title="Checklist Específico" collapsed={sections.checklist} onToggle={() => toggleSection('checklist')}>
                            <LabeledInput
                                label="Esquema de Pintura *"
                                value={checklist.esquema_pintura}
                                onChangeText={(t) => handleChange('esquema_pintura', t)}
                                error={errors.esquema_pintura}
                                restrictNA
                            />
                            <LabeledInput
                                label="Tratamento *"
                                value={checklist.tratamento}
                                onChangeText={(t) => handleChange('tratamento', t)}
                                error={errors.tratamento}
                                restrictNA
                            />
                            <LabeledInput
                                label="M² *"
                                keyboardType="numeric"
                                value={checklist.m2}
                                onChangeText={(t) => handleChange('m2', t)}
                                error={errors.m2}
                                restrictNA
                            />
                            <Text style={styles.label}>Calha Utec Instalada? *</Text>
                            <TouchableOpacity style={styles.input} onPress={() => setShowCalhaUtecModal(true)}>
                                <Text style={checklist.calha_utec ? styles.selectedText : styles.placeholderText}>
                                    {checklist.calha_utec
                                        ? choiceOptions.find((opt) => opt.value === checklist.calha_utec)?.label || 'Selecione'
                                        : 'Selecione uma opção'}
                                </Text>
                            </TouchableOpacity>
                            {errors.calha_utec ? <Text style={styles.errorText}>{errors.calha_utec}</Text> : null}

                            <Text style={styles.label}>Guias e Pontos de Contato Pintados? *</Text>
                            <TouchableOpacity style={styles.input} onPress={() => setShowGuiaPcModal(true)}>
                                <Text style={checklist.guia_pc ? styles.selectedText : styles.placeholderText}>
                                    {checklist.guia_pc
                                        ? choiceOptions.find((opt) => opt.value === checklist.guia_pc)?.label || 'Selecione'
                                        : 'Selecione uma opção'}
                                </Text>
                            </TouchableOpacity>
                            {errors.guia_pc ? <Text style={styles.errorText}>{errors.guia_pc}</Text> : null}

                            <Text style={styles.label}>Fita de Proteção Aplicada? *</Text>
                            <TouchableOpacity style={styles.input} onPress={() => setShowFitaProtecModal(true)}>
                                <Text style={checklist.fita_protec ? styles.selectedText : styles.placeholderText}>
                                    {checklist.fita_protec
                                        ? choiceOptions.find((opt) => opt.value === checklist.fita_protec)?.label || 'Selecione'
                                        : 'Selecione uma opção'}
                                </Text>
                            </TouchableOpacity>
                            {errors.fita_protec ? <Text style={styles.errorText}>{errors.fita_protec}</Text> : null}

                            <Text style={styles.label}>Trechos da REC Pintados? *</Text>
                            <TouchableOpacity style={styles.input} onPress={() => setShowTrechoRecModal(true)}>
                                <Text style={checklist.trecho_rec ? styles.selectedText : styles.placeholderText}>
                                    {checklist.trecho_rec
                                        ? choiceOptions.find((opt) => opt.value === checklist.trecho_rec)?.label || 'Selecione'
                                        : 'Selecione uma opção'}
                                </Text>
                            </TouchableOpacity>
                            {errors.trecho_rec ? <Text style={styles.errorText}>{errors.trecho_rec}</Text> : null}

                            <Text style={styles.label}>Elastômero Aplicado? *</Text>
                            <TouchableOpacity style={styles.input} onPress={() => setShowElastomeroModal(true)}>
                                <Text style={checklist.elastomero ? styles.selectedText : styles.placeholderText}>
                                    {checklist.elastomero
                                        ? choiceOptions.find((opt) => opt.value === checklist.elastomero)?.label || 'Selecione'
                                        : 'Selecione uma opção'}
                                </Text>
                            </TouchableOpacity>
                            {errors.elastomero ? <Text style={styles.errorText}>{errors.elastomero}</Text> : null}

                            <Text style={styles.label}>Volantes e Caps Pintados? *</Text>
                            <TouchableOpacity style={styles.input} onPress={() => setShowVolanteCapsModal(true)}>
                                <Text style={checklist.volante_caps ? styles.selectedText : styles.placeholderText}>
                                    {checklist.volante_caps
                                        ? choiceOptions.find((opt) => opt.value === checklist.volante_caps)?.label || 'Selecione'
                                        : 'Selecione uma opção'}
                                </Text>
                            </TouchableOpacity>
                            {errors.volante_caps ? <Text style={styles.errorText}>{errors.volante_caps}</Text> : null}

                            <LabeledInput
                                label="Documento (URL)"
                                value={checklist.doc}
                                onChangeText={(t) => handleChange('doc', t)}
                            />
                        </Section>

                        <Section title="Etapas do Checklist" collapsed={sections.etapas} onToggle={() => toggleSection('etapas')}>
                            {checklist.etapas.length === 0 ? (
                                <Text style={styles.emptyText}>Nenhuma etapa adicionada.</Text>
                            ) : (
                                checklist.etapas.map((item, index) => (
                                    <View key={index} style={[styles.box, { backgroundColor: item.corFundo }]}>
                                        <Text style={styles.subSectionTitle}>Etapa {index + 1}</Text>
                                        <DateButton
                                            label="Data Início"
                                            value={item.data_inicio}
                                            onPress={() => openDateTime('data_inicio', index, 'date')}
                                        />
                                        <TimeButton
                                            label="Hora Início"
                                            value={item.inicio}
                                            onPress={() => openDateTime('inicio', index, 'time')}
                                        />
                                        <TimeButton
                                            label="Hora Término"
                                            value={item.termino}
                                            onPress={() => openDateTime('termino', index, 'time')}
                                        />
                                        <LabeledInput
                                            label="Tipo do Substrato"
                                            value={item.tipo_substrato}
                                            onChangeText={(t) => updateEtapa(index, 'tipo_substrato', t)}
                                            restrictNA
                                        />
                                        <LabeledInput
                                            label="Tinta *"
                                            value={item.tinta}
                                            onChangeText={(t) => updateEtapa(index, 'tinta', t)}
                                            error={errors.etapas && (!item.tinta?.trim() || item.tinta.toUpperCase() === 'N/A') ? 'Tinta é obrigatória e não pode ser "N/A"' : null}
                                            restrictNA
                                        />
                                        <LabeledInput
                                            label="Cor Munsell"
                                            value={item.cor_munsell}
                                            onChangeText={(t) => updateEtapa(index, 'cor_munsell', t)}
                                            restrictNA
                                        />
                                        <LabeledInput
                                            label="Lote A"
                                            value={item.lote_a}
                                            onChangeText={(t) => updateEtapa(index, 'lote_a', t)}
                                            restrictNA
                                        />
                                        <LabeledInput
                                            label="Lote B"
                                            value={item.lote_b}
                                            onChangeText={(t) => updateEtapa(index, 'lote_b', t)}
                                            restrictNA
                                        />
                                        <LabeledInput
                                            label="Lote C"
                                            value={item.lote_c}
                                            onChangeText={(t) => updateEtapa(index, 'lote_c', t)}
                                            restrictNA
                                        />
                                        <LabeledInput
                                            label="Fabricante"
                                            value={item.fabricante}
                                            onChangeText={(t) => updateEtapa(index, 'fabricante', t)}
                                            restrictNA
                                        />
                                        <DateButton
                                            label="Data Final"
                                            value={item.data_final}
                                            onPress={() => openDateTime('data_final', index, 'date')}
                                        />
                                    </View>
                                ))
                            )}
                            {errors.etapas ? <Text style={styles.errorText}>{errors.etapas}</Text> : null}
                            <TouchableOpacity style={styles.secondaryButton} onPress={adicionarEtapa}>
                                <Text style={styles.secondaryButtonText}>+ Adicionar Etapa</Text>
                            </TouchableOpacity>
                        </Section>

                        <Section title="Colaboradores" collapsed={sections.colaboradores} onToggle={() => toggleSection('colaboradores')}>
                            {checklist.colaboradores.length === 0 ? (
                                <Text style={styles.emptyText}>Nenhum colaborador adicionado.</Text>
                            ) : (
                                checklist.colaboradores.map((item, index) => (
                                    <View key={index} style={[styles.box, styles.boxRow]}>
                                        <View style={styles.boxContent}>
                                            <Text style={styles.label}>Colaborador {index + 1}</Text>
                                            <TouchableOpacity
                                                style={styles.input}
                                                onPress={() => openColaboradorModal(index)}
                                            >
                                                <Text style={item.colaborador ? styles.selectedText : styles.placeholderText}>
                                                    {item.colaborador
                                                        ? colaboradores.find((col) => String(col.id) === item.colaborador)?.nome || 'Selecione'
                                                        : 'Selecione um colaborador'}
                                                </Text>
                                            </TouchableOpacity>
                                        </View>
                                        <TouchableOpacity onPress={() => removerColaborador(index)} style={styles.removeButton}>
                                            <Text style={styles.removeButtonText}>✕</Text>
                                        </TouchableOpacity>
                                    </View>
                                ))
                            )}
                            <TouchableOpacity style={styles.secondaryButton} onPress={() => openColaboradorModal()}>
                                <Text style={styles.secondaryButtonText}>+ Adicionar Colaborador</Text>
                            </TouchableOpacity>
                        </Section>

                        <Section title="Inspeção e Aprovação" collapsed={sections.inspeccao} onToggle={() => toggleSection('inspeccao')}>
                            <View style={styles.switchRow}>
                                <Text style={styles.label}>Laudo</Text>
                                <Switch value={!!checklist.laudo} onValueChange={(v) => handleChange('laudo', v ? 1 : 0)} />
                            </View>
                            <View style={styles.switchRow}>
                                <Text style={styles.label}>RNC?</Text>
                                <Switch value={!!checklist.rnc_n} onValueChange={(v) => handleChange('rnc_n', v ? 1 : 0)} />
                            </View>
                            <LabeledInput
                                label="Observações Finais"
                                multiline
                                numberOfLines={4}
                                style={{ height: 100 }}
                                value={checklist.obs_final}
                                onChangeText={(t) => handleChange('obs_final', t)}
                            />
                            <View style={styles.switchRow}>
                                <Text style={styles.label}>Aprovado</Text>
                                <Switch
                                    value={!!checklist.aprovado}
                                    onValueChange={(v) => handleChange('aprovado', v ? 1 : 0)}
                                />
                            </View>
                        </Section>

                        <View style={{ marginVertical: 12 }}>
                            {loading ? (
                                <ActivityIndicator size="large" color={PRIMARY} />
                            ) : (
                                <TouchableOpacity
                                    onPress={submit}
                                    style={[
                                        styles.primaryButton,
                                        (!checklist.cliente ||
                                            !checklist.tag ||
                                            !checklist.data ||
                                            !checklist.tipo_serv ||
                                            !checklist.unidade ||
                                            !checklist.rec ||
                                            !checklist.nota ||
                                            !checklist.setor ||
                                            !checklist.esquema_pintura ||
                                            !checklist.tratamento ||
                                            !checklist.m2 ||
                                            choiceFields.some((field) => !checklist[field] || checklist[field] === 'N/A')) &&
                                        styles.primaryButtonDisabled,
                                    ]}
                                    disabled={
                                        loading ||
                                        !checklist.cliente ||
                                        !checklist.tag ||
                                        !checklist.data ||
                                        !checklist.tipo_serv ||
                                        !checklist.unidade ||
                                        !checklist.rec ||
                                        !checklist.nota ||
                                        !checklist.setor ||
                                        !checklist.esquema_pintura ||
                                        !checklist.tratamento ||
                                        !checklist.m2 ||
                                        choiceFields.some((field) => !checklist[field] || checklist[field] === 'N/A')
                                    }
                                >
                                    <Text style={styles.primaryButtonText}>Criar Checklist</Text>
                                </TouchableOpacity>
                            )}
                        </View>

                        {datePicker.visible && (
                            <DateTimePicker
                                value={
                                    (datePicker.index !== null &&
                                        checklist.etapas[datePicker.index] &&
                                        checklist.etapas[datePicker.index][datePicker.field]) ||
                                    checklist[datePicker.field] ||
                                    new Date()
                                }
                                mode={datePicker.mode}
                                display="default"
                                onChange={onDateTimeChange}
                            />
                        )}

                        {/* Custom Picker Modals */}
                        <CustomPickerModal
                            visible={showTipoServModal}
                            onClose={() => setShowTipoServModal(false)}
                            options={tipoServOptions}
                            onSelect={(value) => handleChange('tipo_serv', value)}
                            selectedValue={checklist.tipo_serv}
                            title="Selecione um tipo de serviço"
                        />
                        <CustomPickerModal
                            visible={showUnidadeModal}
                            onClose={() => setShowUnidadeModal(false)}
                            options={[{ label: 'Selecione uma unidade', value: '' }, ...areas.map((a) => ({ label: a.area || `Unidade ${a.id}`, value: String(a.id) }))]}
                            onSelect={(value) => handleChange('unidade', value)}
                            selectedValue={checklist.unidade}
                            title="Selecione uma unidade"
                        />
                        <CustomPickerModal
                            visible={showCalhaUtecModal}
                            onClose={() => setShowCalhaUtecModal(false)}
                            options={choiceOptions}
                            onSelect={(value) => handleChange('calha_utec', value)}
                            selectedValue={checklist.calha_utec}
                            title="Calha Utec Instalada?"
                        />
                        <CustomPickerModal
                            visible={showGuiaPcModal}
                            onClose={() => setShowGuiaPcModal(false)}
                            options={choiceOptions}
                            onSelect={(value) => handleChange('guia_pc', value)}
                            selectedValue={checklist.guia_pc}
                            title="Guias e Pontos de Contato Pintados?"
                        />
                        <CustomPickerModal
                            visible={showFitaProtecModal}
                            onClose={() => setShowFitaProtecModal(false)}
                            options={choiceOptions}
                            onSelect={(value) => handleChange('fita_protec', value)}
                            selectedValue={checklist.fita_protec}
                            title="Fita de Proteção Aplicada?"
                        />
                        <CustomPickerModal
                            visible={showTrechoRecModal}
                            onClose={() => setShowTrechoRecModal(false)}
                            options={choiceOptions}
                            onSelect={(value) => handleChange('trecho_rec', value)}
                            selectedValue={checklist.trecho_rec}
                            title="Trechos da REC Pintados?"
                        />
                        <CustomPickerModal
                            visible={showElastomeroModal}
                            onClose={() => setShowElastomeroModal(false)}
                            options={choiceOptions}
                            onSelect={(value) => handleChange('elastomero', value)}
                            selectedValue={checklist.elastomero}
                            title="Elastômero Aplicado?"
                        />
                        <CustomPickerModal
                            visible={showVolanteCapsModal}
                            onClose={() => setShowVolanteCapsModal(false)}
                            options={choiceOptions}
                            onSelect={(value) => handleChange('volante_caps', value)}
                            selectedValue={checklist.volante_caps}
                            title="Volantes e Caps Pintados?"
                        />
                        <CustomPickerModal
                            visible={showColaboradorModal}
                            onClose={() => {
                                setShowColaboradorModal(false);
                                setSelectedColaboradorIndex(null);
                            }}
                            options={colaboradorOptions}
                            onSelect={(value) => {
                                if (selectedColaboradorIndex !== null) {
                                    updateColaborador(selectedColaboradorIndex, value);
                                } else {
                                    adicionarColaborador(value);
                                }
                            }}
                            selectedValue={selectedColaborador}
                            title="Selecionar Colaborador"
                        />
                        {checklist.etapas.map((_, index) => (
                            <CustomPickerModal
                                key={index}
                                visible={showColaboradorEtapaModal === index}
                                onClose={() => setShowColaboradorEtapaModal(null)}
                                options={colaboradorOptions}
                                onSelect={(value) => updateEtapa(index, 'colaborador', value)}
                                selectedValue={checklist.etapas[index]?.colaborador}
                                title={`Selecionar Colaborador para Etapa ${index + 1}`}
                            />
                        ))}
                    </>
                )}
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const choiceFields = ['calha_utec', 'guia_pc', 'fita_protec', 'trecho_rec', 'elastomero', 'volante_caps'];

const styles = StyleSheet.create({
    container: { padding: 16, paddingBottom: 40 },
    section: { marginBottom: 12, borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: '#e6e6e6' },
    sectionHeader: { backgroundColor: '#f7f7f7', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12 },
    sectionTitle: { fontSize: 16, fontWeight: '700' },
    sectionToggle: { fontSize: 20, color: '#666' },
    sectionBody: { padding: 12, backgroundColor: 'white' },
    field: { marginBottom: 10 },
    label: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
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
    inputError: { borderColor: '#b00020' },
    selectedText: { color: '#000' },
    placeholderText: { color: '#9e9e9e' },
    dateButton: { borderWidth: 1, borderColor: '#ddd', padding: 12, borderRadius: 6, backgroundColor: '#fff' },
    box: { borderWidth: 1, borderColor: '#efefef', padding: 10, borderRadius: 6, marginBottom: 8 },
    boxRow: { flexDirection: 'row', alignItems: 'center' },
    boxContent: { flex: 1 },
    removeButton: { padding: 10, marginLeft: 10 },
    removeButtonText: { color: '#b00020', fontSize: 20, fontWeight: 'bold' },
    subSectionTitle: { fontSize: 15, fontWeight: '600', marginBottom: 10, color: PRIMARY },
    emptyText: { color: '#777', fontStyle: 'italic' },
    primaryButton: { backgroundColor: PRIMARY, padding: 14, borderRadius: 8, alignItems: 'center' },
    primaryButtonDisabled: { backgroundColor: '#9ab0c8' },
    primaryButtonText: { color: '#fff', fontWeight: '700' },
    secondaryButton: { marginTop: 8, padding: 10, borderRadius: 6, alignItems: 'center', backgroundColor: '#f0f6fb', borderWidth: 1, borderColor: PRIMARY },
    secondaryButtonText: { color: PRIMARY, fontWeight: '700' },
    switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    errorText: { color: '#b00020', fontSize: 12, marginBottom: 8 },
    status: { fontSize: 16, marginBottom: 12 },
    errorContainer: { padding: 10, backgroundColor: '#f8d7da', borderRadius: 6, marginBottom: 12 },
    // Modal styles
    modalOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalOverlayContent: { flex: 1 },
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
    modalContent: { flex: 1 },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
    closeButton: { padding: 4 },
    closeButtonText: { fontSize: 20, fontWeight: 'bold', color: '#999' },
    modalScrollView: { maxHeight: 300 },
    modalOption: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f5f5f5',
    },
    modalOptionSelected: { backgroundColor: '#e6f7ff' },
    modalOptionText: { fontSize: 16, color: '#333', flex: 1 },
    modalOptionTextSelected: { color: '#1890ff', fontWeight: '500' },
    selectedIcon: { color: '#1890ff', fontWeight: 'bold', fontSize: 16 },
});