import React, { useState, useEffect, useCallback, useRef } from 'react';
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
    Linking
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { atualizarChecklist, buscarChecklistPorId, listarAreas, fetchColaboradores } from '../services/checklistQualidadeService';
import NetInfo from '@react-native-community/netinfo';
import * as ImagePicker from 'expo-image-picker';
import { File } from 'expo-file-system'; // Updated import for modern APIimport { getStoredTokens } from '../services/authService';
import { getStoredTokens } from '../services/authService';
import { Image } from 'expo-image';

const PRIMARY = '#16356C';
const BASE_URL = 'https://hml.scaip.app.br'; // Ensure this is correct

// Cores de fundo para as etapas
const ETAPA_BACKGROUNDS = [
    '#F5F8FC', // azul bem clarinho
    '#F9FCF5', // verde bem clarinho
    '#FFF8F3'  // laranja bem clarinho
];

const getFirstErrorField = (errors) => {
    const errorFields = Object.keys(errors);
    if (errorFields.length === 0) return null;

    // Mapeia campos para seções
    const fieldToSectionMap = {
        cliente: 'gerais',
        tag: 'gerais',
        data: 'gerais',
        rec: 'gerais',
        nota: 'gerais',
        setor: 'gerais',
        tipo_serv: 'unidade',
        unidade: 'unidade',
        esquema_pintura: 'checklist',
        tratamento: 'checklist',
        m2: 'checklist',
        calha_utec: 'checklist',
        guia_pc: 'checklist',
        fita_protec: 'checklist',
        trecho_rec: 'checklist',
        elastomero: 'checklist',
        volante_caps: 'checklist'
    };

    // Encontra o primeiro erro que está no mapa
    for (const field of errorFields) {
        if (field.startsWith('etapa_')) {
            return { field, section: 'etapas' };
        } else if (fieldToSectionMap[field]) {
            return { field, section: fieldToSectionMap[field] };
        }
    }

    return { field: errorFields[0], section: 'gerais' };
};

// getImageUrl function to handle image URLs with authentication
const getImageUrl = (url) => {
    if (!url) return null;

    const actualUri = typeof url === 'object' ? url.uri : url;

    // 1) Se já for uma URL absoluta e não for do mesmo host → retorna direto
    const isAbsolute = /^https?:\/\//i.test(actualUri);
    const sameHost = isAbsolute && actualUri.includes('hml.scaip.app.br');

    if (isAbsolute && !sameHost) {
        return actualUri;
    }

    // 2) Normaliza para path relativo
    let relativePath;
    if (isAbsolute && sameHost) {
        relativePath = actualUri.replace(/^https?:\/\/[^/]+/i, '');
    } else {
        relativePath = actualUri.startsWith('/')
            ? actualUri
            : `/${actualUri.replace(/^\/+/, '')}`;
    }

    // 3) Garante que o caminho comece com "/geral/api/"
    if (!relativePath.startsWith('/geral/api/')) {
        if (relativePath.startsWith('/media/')) {
            relativePath = `/geral/api${relativePath}`;
        } else {
            relativePath = `/geral/api/media/${relativePath.replace(/^\/+/, '')}`;
        }
    }

    // 4) Constrói a URL final
    const host = BASE_URL.replace(/\/+$/, '');
    console.log('Final image URL:', `${host}${relativePath}`);
    return `${host}${relativePath}`;
};

const encodePhotosToBase64 = async (photos = []) => {
    const isRemote = (uri) => typeof uri === 'string' && /^https?:\/\//i.test(uri);
    const isDataUrl = (uri) => typeof uri === 'string' && /^data:/i.test(uri);

    console.log('[encodePhotosToBase64] Iniciando com fotos:', photos);

    const results = await Promise.all(
        photos.map(async (p, idx) => {
            if (!p || !p.photo) {
                console.log(`[encodePhotosToBase64] Processando foto[${idx}]:`, p);
                console.warn('Item de foto inválido ou sem propriedade "photo":', p);
                return null;
            }

            const uri = p.photo;
            console.log(`[encodePhotosToBase64] URI da foto[${idx}]:`, uri);

            if (isRemote(uri) || isDataUrl(uri)) {
                return null;
            }

            try {
                console.log(`[encodePhotosToBase64] Lendo arquivo local da foto[${idx}] como base64`);
                const file = new File(uri); // Modern API
                const base64 = await file.base64(); // Reads as base64

                console.log(`[encodePhotosToBase64] Base64 lido com sucesso para foto[${idx}] (tamanho: ${base64.length} chars)`);

                const extMatch = uri.match(/\.(\w+)(\?.*)?$/);
                const ext = extMatch ? extMatch[1].toLowerCase() : 'jpg';
                const filename = `photo_${Date.now()}_${idx}.${ext}`;
                const content_type = ext === 'png' ? 'image/png' : 'image/jpeg';
                const dataUrl =
                    `data:${content_type};base64,${base64}`;

                return { photo: dataUrl };
            } catch (err) {
                console.error('Erro ao processar a imagem:', uri, err);
                return null;
            }
        })
    );

    return results.filter((item) => item !== null);
};

const Section = React.forwardRef(({ title, collapsed, onToggle, children, hasError = false }, ref) => {
    return (
        <View ref={ref} style={[styles.section, hasError && styles.sectionError]}>
            <TouchableOpacity onPress={onToggle} style={[styles.sectionHeader, hasError && styles.sectionHeaderError]} accessibilityRole="button">
                <Text style={[styles.sectionTitle, hasError && styles.sectionTitleError]}>{title}</Text>
                <Text style={[styles.sectionToggle, hasError && styles.sectionToggleError]}>{collapsed ? '+' : '−'}</Text>
            </TouchableOpacity>
            {!collapsed && <View style={styles.sectionBody}>{children}</View>}
        </View>
    );
});

function LabeledInput({ label, error, restrictNA, required, ...props }) {
    return (
        <View style={styles.field}>
            {label ? (
                <Text style={styles.label}>
                    {label} {required && <Text style={styles.requiredAsterisk}>*</Text>}
                </Text>
            ) : null}
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

function DateButton({ label, value, onPress, error, required }) {
    return (
        <View style={styles.field}>
            <Text style={styles.label}>
                {label} {required && <Text style={styles.requiredAsterisk}>*</Text>}
            </Text>
            <TouchableOpacity onPress={onPress} style={[styles.dateButton, error && styles.inputError]}>
                <Text>{value ? (value instanceof Date ? value.toLocaleString() : String(value)) : 'Selecionar'}</Text>
            </TouchableOpacity>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </View>
    );
}

function TimeButton({ label, value, onPress, error, required }) {
    return (
        <View style={styles.field}>
            <Text style={styles.label}>
                {label} {required && <Text style={styles.requiredAsterisk}>*</Text>}
            </Text>
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

export default function EditarChecklistQualidadeScreen() {
    const navigation = useNavigation();
    const route = useRoute();
    const { id } = route.params;

    const [selectedColaboradorIndex, setSelectedColaboradorIndex] = useState(null);

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
        checklistcarimbo: [],
    });
    const [areas, setAreas] = useState([]);
    const [colaboradores, setColaboradores] = useState([]);
    const [colaboradorFilter, setColaboradorFilter] = useState('');
    const [selectedColaborador, setSelectedColaborador] = useState('');
    const [modalVisible, setModalVisible] = useState(false);
    const [colaboradorEtapaIndex, setColaboradorEtapaIndex] = useState(null);
    const [sections, setSections] = useState({
        gerais: false,
        unidade: true,
        checklist: false,
        etapas: false,
        colaboradores: false,
        fotos: false,
        inspeccao: true,
    });
    const [datePicker, setDatePicker] = useState({ visible: false, field: null, index: null, mode: 'date' });
    const [loading, setLoading] = useState(true);
    const [imageLoading, setImageLoading] = useState(false); // New state for image loading

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

    const [accessToken, setAccessToken] = useState(null);
    useEffect(() => {
        const loadToken = async () => {
            const { access } = await getStoredTokens();
            console.log("Meu access token:", access);
            setAccessToken(access);
        };
        loadToken();
    }, []);

    useEffect(() => {
        const fetchData = async () => {
            const netInfo = await NetInfo.fetch();
            setIsOnline(netInfo.isConnected);

            try {
                setLoading(true);
                const [areasData, checklistData, colaboradoresData] = await Promise.all([
                    listarAreas(),
                    buscarChecklistPorId(id),
                    fetchColaboradores(),
                ]);

                setAreas(areasData || []);
                setColaboradores(colaboradoresData || []);

                if (checklistData) {
                    setChecklist({
                        cliente: checklistData.cliente || '',
                        tag: checklistData.tag || '',
                        unidade: checklistData.unidade ? String(checklistData.unidade) : '',
                        data: checklistData.data ? new Date(checklistData.data) : new Date(),
                        data_edicao: checklistData.data_edicao ? new Date(checklistData.data_edicao) : new Date(),
                        rec: checklistData.rec || '',
                        nota: checklistData.nota || '',
                        setor: checklistData.setor || '',
                        tipo_serv: checklistData.tipo_serv || '',
                        m2: checklistData.m2 ? String(checklistData.m2) : '',
                        esquema_pintura: checklistData.esquema_pintura || '',
                        tratamento: checklistData.tratamento || '',
                        laudo: checklistData.laudo ? 1 : 0,
                        rnc_n: checklistData.rnc_n ? 1 : 0,
                        obs_final: checklistData.obs_final || '',
                        aprovado: checklistData.aprovado ? 1 : 0,
                        calha_utec: checklistData.calha_utec || 'N/A',
                        guia_pc: checklistData.guia_pc || 'N/A',
                        fita_protec: checklistData.fita_protec || 'N/A',
                        trecho_rec: checklistData.trecho_rec || 'N/A',
                        elastomero: checklistData.elastomero || 'N/A',
                        volante_caps: checklistData.volante_caps || 'N/A',
                        doc: checklistData.doc || null,
                        etapas: (checklistData.checklist || []).map((e, index) => {
                            const parseTime = (timeStr) => {
                                if (!timeStr || timeStr === 'Inval') return null;
                                const [hours, minutes] = timeStr.split(':').map(Number);
                                if (isNaN(hours) || isNaN(minutes)) return null;
                                const date = new Date();
                                date.setHours(hours, minutes, 0, 0);
                                return date;
                            };
                            return {
                                data_inicio: e.data_inicio ? new Date(e.data_inicio) : new Date(),
                                inicio: parseTime(e.inicio),
                                termino: parseTime(e.termino),
                                tipo_substrato: e.tipo_substrato || '',
                                tinta: e.tinta || '',
                                cor_munsell: e.cor_munsell || '',
                                lote_a: e.lote_a || '',
                                lote_b: e.lote_b || '',
                                lote_c: e.lote_c || '',
                                fabricante: e.fabricante || '',
                                data_final: e.data_final ? new Date(e.data_final) : new Date(),
                                colaborador: e.colaborador ? String(e.colaborador) : '',
                                corFundo: ETAPA_BACKGROUNDS[index % ETAPA_BACKGROUNDS.length],
                            };
                        }),
                        colaboradores: (checklistData.colaboradorchecklist_set || []).map((c) => ({
                            colaborador: String(c.colaborador) || '',
                        })),
                        checklistcarimbo: (checklistData.checklistcarimbo || []).map((f) => ({
                            id: f.id,
                            photo: f.photo,
                            created_at: f.created_at,
                            latitude: f.latitude,
                            longitude: f.longitude,
                        })),
                    });
                }
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
    }, [id]);

    const filteredColaboradores = colaboradores.filter(
        (col) =>
            col.nome.toLowerCase().includes(colaboradorFilter.toLowerCase()) ||
            col.matricula.toLowerCase().includes(colaboradorFilter.toLowerCase())
    );

    const [firstSubmitAttempt, setFirstSubmitAttempt] = useState(false);
    const sectionRefs = {
        gerais: useRef(null),
        unidade: useRef(null),
        checklist: useRef(null),
        etapas: useRef(null),
        fotos: useRef(null),
        inspeccao: useRef(null)
    };

    const validate = useCallback((isFirstSubmit = false) => {
        const e = {};
        if (!checklist.cliente?.trim()) e.cliente = 'Cliente é obrigatório';
        if (checklist.cliente?.toUpperCase() === 'N/A') e.cliente = 'Cliente não pode ser "N/A"';
        if (!checklist.tag?.trim()) e.tag = 'Tag é obrigatório';
        if (checklist.tag?.toUpperCase() === 'N/A') e.tag = 'Tag não pode ser "N/A"';
        if (!checklist.data) e.data = 'Data é obrigatória';
        if (!checklist.unidade) e.unidade = 'Unidade é obrigatória';
        if (!checklist.rec?.trim()) e.rec = 'Rec é obrigatório';
        if (checklist.rec?.toUpperCase() === 'N/A') e.rec = 'Rec não pode ser "N/A"';
        if (!checklist.nota?.trim()) e.nota = 'Nota é obrigatória';
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

        const choiceFields = ['calha_utec', 'guia_pc', 'fita_protec', 'trecho_rec', 'elastomero', 'volante_caps'];
        choiceFields.forEach((field) => {
            if (!checklist[field] || checklist[field] === 'N/A') {
                e[field] = 'Este campo deve ser SIM ou NÃO';
            }
        });

        checklist.etapas.forEach((etapa, index) => {
            if (!etapa.tinta?.trim() || etapa.tinta.toUpperCase() === 'N/A') {
                e[`etapa_${index}_tinta`] = 'Tinta é obrigatória e não pode ser "N/A"';
            }
        });

        setErrors(e);

        // Se é a primeira tentativa de envio, vamos rolar para o primeiro erro
        if (isFirstSubmit && Object.keys(e).length > 0) {
            setFirstSubmitAttempt(true);
            scrollToFirstError(e);
        }
        return Object.keys(e).length === 0;
    }, [checklist]);

    const scrollToFirstError = (errors) => {
        const firstError = getFirstErrorField(errors);
        if (!firstError) return;

        // Expande a seção se estiver colapsada
        if (sections[firstError.section]) {
            toggleSection(firstError.section);

            // Aguarda a expansão da seção antes de rolar
            setTimeout(() => {
                if (sectionRefs[firstError.section]?.current) {
                    sectionRefs[firstError.section].current.measureLayout(
                        scrollViewRef.current,
                        (x, y) => {
                            scrollViewRef.current.scrollTo({ y: Math.max(0, y - 20), animated: true });
                        },
                        () => console.log('Erro ao medir layout')
                    );
                }
            }, 300);
        }
    };

    const handleChange = (field, value) => setChecklist((prev) => ({ ...prev, [field]: value }));

    const adicionarEtapa = () => {
        if (checklist.etapas.length >= 3) {
            Alert.alert('Limite atingido', 'O máximo permitido são 3 etapas.');
            return;
        }
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
                    corFundo: ETAPA_BACKGROUNDS[prev.etapas.length % ETAPA_BACKGROUNDS.length],
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

    const deleteEtapa = (index) => {
        Alert.alert(
            'Confirmar Exclusão',
            `Deseja realmente excluir a etapa ${index + 1}?`,
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Excluir',
                    style: 'destructive',
                    onPress: () => {
                        setChecklist((prev) => ({
                            ...prev,
                            etapas: prev.etapas.filter((_, i) => i !== index),
                        }));
                    },
                },
            ]
        );
    };

    const openColaboradorModal = () => {
        setColaboradorFilter('');
        setSelectedColaborador('');
        setShowColaboradorModal(true);
    };

    const adicionarColaborador = (colaboradorId) => {
        if (!colaboradorId) {
            Alert.alert('Erro', 'Selecione um colaborador antes de adicionar.');
            return;
        }

        if (selectedColaboradorIndex !== null) {
            // Editar colaborador existente
            const novosColaboradores = [...checklist.colaboradores];
            novosColaboradores[selectedColaboradorIndex] = { colaborador: colaboradorId };
            setChecklist({ ...checklist, colaboradores: novosColaboradores });
        } else {
            // Adicionar novo colaborador
            setChecklist((prev) => ({
                ...prev,
                colaboradores: [...prev.colaboradores, { colaborador: colaboradorId }],
            }));
        }

        setShowColaboradorModal(false);
        setSections((prev) => ({ ...prev, colaboradores: false }));
    };

    const updateColaborador = (idx, value) => {
        const colaboradores = [...checklist.colaboradores];
        colaboradores[idx] = { colaborador: value };
        setChecklist({ ...checklist, colaboradores });
    };

    const deleteColaborador = (index) => {
        Alert.alert(
            'Confirmar Exclusão',
            `Deseja realmente excluir o colaborador ${index + 1}?`,
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Excluir',
                    style: 'destructive',
                    onPress: () => {
                        setChecklist((prev) => ({
                            ...prev,
                            colaboradores: prev.colaboradores.filter((_, i) => i !== index),
                        }));
                    },
                },
            ]
        );
    };

    const openColaboradorEtapaModal = (index) => {
        setColaboradorEtapaIndex(index);
        setSelectedColaborador(checklist.etapas[index]?.colaborador || '');
        setShowColaboradorEtapaModal(index);
    };

    const adicionarFoto = async () => {
        try {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permissão', 'Permita o acesso à galeria.');
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                allowsEditing: false,
                quality: 0.6,
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
            });

            if (result.canceled) return;

            const uri = result.assets[0].uri;

            console.log('[adicionarFoto] Foto adicionada com URI:', uri);

            setChecklist((prev) => ({
                ...prev,
                checklistcarimbo: [
                    ...prev.checklistcarimbo,
                    {
                        photo: uri,
                        created_at: new Date().toISOString(),
                        latitude: null,
                        longitude: null,
                    },
                ],
            }));

            setSections((prev) => ({ ...prev, fotos: false }));
        } catch (err) {
            console.error('Erro ao adicionar foto:', err);
            Alert.alert('Erro', 'Não foi possível adicionar a foto. Tente novamente.');
        }
    };

    const removerFoto = (idx) => {
        Alert.alert('Remover foto', 'Deseja remover esta foto?', [
            { text: 'Cancelar', style: 'cancel' },
            {
                text: 'Remover',
                style: 'destructive',
                onPress: () =>
                    setChecklist((prev) => ({
                        ...prev,
                        checklistcarimbo: prev.checklistcarimbo.filter((_, i) => i !== idx),
                    })),
            },
        ]);
    };

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
        if (!validate(true)) {
            Alert.alert('Corrija os erros', 'Preencha os campos obrigatórios corretamente.');
            return;
        }

        setLoading(true);
        try {
            const formatDate = (date) => (date ? date.toISOString().split('T')[0] : null);
            const formatTime = (time) => (time ? time.toTimeString().split(' ')[0] : null);


            const isRemote = (uri) => typeof uri === 'string' && /^https?:\/\//i.test(uri);
            const isDataUrl = (uri) => typeof uri === 'string' && /^data:/i.test(uri);

            console.log('[submit] Todas fotos do relatório:', checklist.checklistcarimbo);

            const todasFotos = Array.isArray(checklist.checklistcarimbo) ? checklist.checklistcarimbo : [];
            console.log('[submit] Todas fotos normalizadas:', todasFotos);

            const novasFotos = todasFotos.filter((p) => p && p.photo && !isRemote(p.photo) && !isDataUrl(p.photo));
            console.log('[submit] Novas fotos locais filtradas:', novasFotos);

            const fotosExistentes = todasFotos.filter((p) => p && p.photo && isRemote(p.photo));
            console.log('[submit] Fotos existentes remotas:', fotosExistentes);

            const existing_photo_ids = fotosExistentes.map((p) => p.id).filter(Boolean);
            console.log('[submit] IDs de fotos existentes:', existing_photo_ids);

            let encodedPhotos = [];
            if (novasFotos.length > 0) {
                console.log('[submit] Iniciando codificação de novas fotos');
                encodedPhotos = await encodePhotosToBase64(novasFotos);
                console.log('[submit] Codificação concluída:', encodedPhotos);
            } else {
                console.log('[submit] Nenhuma nova foto para codificar');
            }

            const payload = {
                cliente: checklist.cliente,
                tag: checklist.tag,
                unidade: parseInt(checklist.unidade),
                data: formatDate(checklist.data),
                rec: checklist.rec,
                nota: checklist.nota,
                setor: checklist.setor,
                tipo_serv: checklist.tipo_serv,
                m2: parseFloat(checklist.m2) || 0,
                esquema_pintura: checklist.esquema_pintura,
                tratamento: checklist.tratamento,
                laudo: Boolean(checklist.laudo),
                rnc_n: Boolean(checklist.rnc_n),
                obs_final: checklist.obs_final,
                aprovado: Boolean(checklist.aprovado),
                calha_utec: checklist.calha_utec,
                guia_pc: checklist.guia_pc,
                fita_protec: checklist.fita_protec,
                trecho_rec: checklist.trecho_rec,
                elastomero: checklist.elastomero,
                volante_caps: checklist.volante_caps,
                doc: checklist.doc,
                checklist: checklist.etapas.map((etapa) => ({
                    data_inicio: formatDate(etapa.data_inicio),
                    inicio: formatTime(etapa.inicio),
                    termino: formatTime(etapa.termino),
                    tipo_substrato: etapa.tipo_substrato,
                    tinta: etapa.tinta,
                    cor_munsell: etapa.cor_munsell,
                    lote_a: etapa.lote_a,
                    lote_b: etapa.lote_b,
                    lote_c: etapa.lote_c,
                    fabricante: etapa.fabricante,
                    data_final: formatDate(etapa.data_final),
                })),
                colaboradorchecklist_set: checklist.colaboradores.map((col) => ({
                    colaborador: parseInt(col.colaborador),
                })),
                checklistcarimbo: encodedPhotos.length > 0 ? encodedPhotos : [],
                data_edicao: new Date().toISOString(),
            };

            console.log('Payload enviado:', JSON.stringify(payload, null, 2));
            const result = await atualizarChecklist(id, payload);

            if (result && result.error) {
                throw new Error(result.error);
            }

            Alert.alert('Sucesso', 'Checklist atualizado com sucesso!', [
                { text: 'OK', onPress: () => navigation.goBack() },
            ]);
        } catch (error) {
            console.error('Erro ao atualizar:', error);
            Alert.alert('Erro', error.message || 'Não foi possível atualizar o checklist.');
        } finally {
            setLoading(false);
        }
    };

    const toggleSection = (key) => setSections((prev) => ({ ...prev, [key]: !prev[key] }));

    // Verificar se há erros em cada seção
    const hasErrorsInSection = (sectionFields) => {
        return Object.keys(errors).some(errorKey =>
            sectionFields.some(field => errorKey.includes(field))
        );
    };

    const scrollViewRef = useRef();

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
                        <Section
                            ref={sectionRefs.gerais}
                            title="Informações Gerais"
                            collapsed={sections.gerais}
                            onToggle={() => toggleSection('gerais')}
                            hasError={hasErrorsInSection(['cliente', 'tag', 'data', 'rec', 'nota', 'setor'])}
                        >
                            <LabeledInput
                                label="Cliente"
                                placeholder="Nome do cliente"
                                value={checklist.cliente}
                                onChangeText={(text) => handleChange('cliente', text)}
                                error={errors.cliente}
                                restrictNA
                                required
                                showRequiredHint={firstSubmitAttempt}

                            />
                            <LabeledInput
                                label="Tag"
                                placeholder="Tag"
                                value={checklist.tag}
                                onChangeText={(t) => handleChange('tag', t)}
                                error={errors.tag}
                                restrictNA
                                required
                                showRequiredHint={firstSubmitAttempt}

                            />
                            <DateButton
                                label="Data do Serviço"
                                value={checklist.data}
                                onPress={() => openDateTime('data')}
                                error={errors.data}
                                required
                            />
                            <LabeledInput
                                label="Rec"
                                placeholder="Rec"
                                value={checklist.rec}
                                onChangeText={(t) => handleChange('rec', t)}
                                error={errors.rec}
                                restrictNA
                                required
                                showRequiredHint={firstSubmitAttempt}

                            />
                            <LabeledInput
                                label="Nota"
                                placeholder="Nota"
                                value={checklist.nota}
                                onChangeText={(t) => handleChange('nota', t)}
                                error={errors.nota}
                                restrictNA
                                required
                                showRequiredHint={firstSubmitAttempt}

                            />
                            <LabeledInput
                                label="Setor"
                                placeholder="Setor"
                                value={checklist.setor}
                                onChangeText={(t) => handleChange('setor', t)}
                                error={errors.setor}
                                restrictNA
                                required
                                showRequiredHint={firstSubmitAttempt}

                            />
                        </Section>

                        <Section
                            ref={sectionRefs.unidade}
                            title="Unidade e Tipo de Serviço"
                            collapsed={sections.unidade}
                            onToggle={() => toggleSection('unidade')}
                            hasError={hasErrorsInSection(['tipo_serv', 'unidade'])}
                        >
                            <Text style={styles.label}>Tipo de Serviço *</Text>
                            <TouchableOpacity style={[styles.input, errors.tipo_serv && styles.inputError]} onPress={() => setShowTipoServModal(true)}>
                                <Text style={checklist.tipo_serv ? styles.selectedText : styles.placeholderText}>
                                    {checklist.tipo_serv
                                        ? tipoServOptions.find((t) => t.value === checklist.tipo_serv)?.label || 'Selecione'
                                        : 'Selecione um tipo de serviço'}
                                </Text>
                            </TouchableOpacity>
                            {errors.tipo_serv ? <Text style={styles.errorText}>{errors.tipo_serv}</Text> : null}

                            <Text style={styles.label}>Unidade/Área *</Text>
                            <TouchableOpacity style={[styles.input, errors.unidade && styles.inputError]} onPress={() => setShowUnidadeModal(true)}>
                                <Text style={checklist.unidade ? styles.selectedText : styles.placeholderText}>
                                    {checklist.unidade
                                        ? areas.find((a) => String(a.id) === checklist.unidade)?.area || `Unidade ${checklist.unidade}`
                                        : 'Selecione uma unidade'}
                                </Text>
                            </TouchableOpacity>
                            {errors.unidade ? <Text style={styles.errorText}>{errors.unidade}</Text> : null}
                        </Section>

                        <Section
                            ref={sectionRefs.checklist}
                            title="Checklist Específico"
                            collapsed={sections.checklist}
                            onToggle={() => toggleSection('checklist')}
                            hasError={hasErrorsInSection(['esquema_pintura', 'tratamento', 'm2', 'calha_utec', 'guia_pc', 'fita_protec', 'trecho_rec', 'elastomero', 'volante_caps'])}
                        >
                            <LabeledInput
                                label="Esquema de Pintura"
                                value={checklist.esquema_pintura}
                                onChangeText={(t) => handleChange('esquema_pintura', t)}
                                error={errors.esquema_pintura}
                                restrictNA
                                required
                                showRequiredHint={firstSubmitAttempt}

                            />
                            <LabeledInput
                                label="Tratamento"
                                value={checklist.tratamento}
                                onChangeText={(t) => handleChange('tratamento', t)}
                                error={errors.tratamento}
                                restrictNA
                                required
                                showRequiredHint={firstSubmitAttempt}

                            />
                            <LabeledInput
                                label="M²"
                                keyboardType="numeric"
                                value={checklist.m2}
                                onChangeText={(t) => handleChange('m2', t)}
                                error={errors.m2}
                                restrictNA
                                required
                                showRequiredHint={firstSubmitAttempt}

                            />
                            <Text style={styles.label}>Calha Utec Instalada? *</Text>
                            <TouchableOpacity style={[styles.input, errors.calha_utec && styles.inputError]} onPress={() => setShowCalhaUtecModal(true)}>
                                <Text style={checklist.calha_utec ? styles.selectedText : styles.placeholderText}>
                                    {checklist.calha_utec
                                        ? choiceOptions.find((opt) => opt.value === checklist.calha_utec)?.label || 'Selecione'
                                        : 'Selecione uma opção'}
                                </Text>
                            </TouchableOpacity>
                            {errors.calha_utec ? <Text style={styles.errorText}>{errors.calha_utec}</Text> : null}

                            <Text style={styles.label}>Guias e Pontos de Contato Pintados? *</Text>
                            <TouchableOpacity style={[styles.input, errors.guia_pc && styles.inputError]} onPress={() => setShowGuiaPcModal(true)}>
                                <Text style={checklist.guia_pc ? styles.selectedText : styles.placeholderText}>
                                    {checklist.guia_pc
                                        ? choiceOptions.find((opt) => opt.value === checklist.guia_pc)?.label || 'Selecione'
                                        : 'Selecione uma opção'}
                                </Text>
                            </TouchableOpacity>
                            {errors.guia_pc ? <Text style={styles.errorText}>{errors.guia_pc}</Text> : null}

                            <Text style={styles.label}>Fita de Proteção Aplicada? *</Text>
                            <TouchableOpacity style={[styles.input, errors.fita_protec && styles.inputError]} onPress={() => setShowFitaProtecModal(true)}>
                                <Text style={checklist.fita_protec ? styles.selectedText : styles.placeholderText}>
                                    {checklist.fita_protec
                                        ? choiceOptions.find((opt) => opt.value === checklist.fita_protec)?.label || 'Selecione'
                                        : 'Selecione uma opção'}
                                </Text>
                            </TouchableOpacity>
                            {errors.fita_protec ? <Text style={styles.errorText}>{errors.fita_protec}</Text> : null}

                            <Text style={styles.label}>Trechos da REC Pintados? *</Text>
                            <TouchableOpacity style={[styles.input, errors.trecho_rec && styles.inputError]} onPress={() => setShowTrechoRecModal(true)}>
                                <Text style={checklist.trecho_rec ? styles.selectedText : styles.placeholderText}>
                                    {checklist.trecho_rec
                                        ? choiceOptions.find((opt) => opt.value === checklist.trecho_rec)?.label || 'Selecione'
                                        : 'Selecione uma opção'}
                                </Text>
                            </TouchableOpacity>
                            {errors.trecho_rec ? <Text style={styles.errorText}>{errors.trecho_rec}</Text> : null}

                            <Text style={styles.label}>Elastômero Aplicado? *</Text>
                            <TouchableOpacity style={[styles.input, errors.elastomero && styles.inputError]} onPress={() => setShowElastomeroModal(true)}>
                                <Text style={checklist.elastomero ? styles.selectedText : styles.placeholderText}>
                                    {checklist.elastomero
                                        ? choiceOptions.find((opt) => opt.value === checklist.elastomero)?.label || 'Selecione'
                                        : 'Selecione uma opção'}
                                </Text>
                            </TouchableOpacity>
                            {errors.elastomero ? <Text style={styles.errorText}>{errors.elastomero}</Text> : null}

                            <Text style={styles.label}>Volantes e Caps Pintados? *</Text>
                            <TouchableOpacity style={[styles.input, errors.volante_caps && styles.inputError]} onPress={() => setShowVolanteCapsModal(true)}>
                                <Text style={checklist.volante_caps ? styles.selectedText : styles.placeholderText}>
                                    {checklist.volante_caps
                                        ? choiceOptions.find((opt) => opt.value === checklist.volante_caps)?.label || 'Selecione'
                                        : 'Selecione uma opção'}
                                </Text>
                            </TouchableOpacity>
                            {errors.volante_caps ? <Text style={styles.errorText}>{errors.volante_caps}</Text> : null}

                            <View style={styles.field}>
                                <Text style={styles.label}>Documento</Text>
                                {checklist.doc ? (
                                    <TouchableOpacity onPress={() => Linking.openURL(checklist.doc)}>
                                        <Text style={styles.link}>Abrir documento</Text>
                                    </TouchableOpacity>
                                ) : (
                                    <Text style={styles.noDoc}>Nenhum documento disponível</Text>
                                )}
                            </View>
                        </Section>

                        <Section
                            ref={sectionRefs.etapas}
                            title="Etapas do Checklist"
                            collapsed={sections.etapas}
                            onToggle={() => toggleSection('etapas')}
                            hasError={Object.keys(errors).some(key => key.includes('etapa_'))}
                        >
                            {checklist.etapas.length === 0 ? (
                                <Text style={styles.emptyText}>Nenhuma etapa adicionada.</Text>
                            ) : (
                                checklist.etapas.map((item, index) => (
                                    <View key={index} style={[styles.box, { backgroundColor: item.corFundo }]}>
                                        <View style={styles.etapaHeader}>
                                            <Text style={styles.subSectionTitle}>Etapa {index + 1}</Text>
                                            <TouchableOpacity
                                                style={styles.deleteButton}
                                                onPress={() => deleteEtapa(index)}
                                                accessibilityLabel={`Excluir etapa ${index + 1}`}
                                            >
                                                <Text style={styles.deleteText}>Excluir</Text>
                                            </TouchableOpacity>
                                        </View>
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
                                            label="Tinta"
                                            value={item.tinta}
                                            onChangeText={(t) => updateEtapa(index, 'tinta', t)}
                                            error={errors[`etapa_${index}_tinta`]}
                                            restrictNA
                                            required
                                            showRequiredHint={firstSubmitAttempt}

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
                                        <Text style={styles.label}>Colaborador</Text>
                                        <TouchableOpacity
                                            style={styles.input}
                                            onPress={() => openColaboradorEtapaModal(index)}
                                        >
                                            <Text style={item.colaborador ? styles.selectedText : styles.placeholderText}>
                                                {item.colaborador
                                                    ? colaboradores.find((col) => String(col.id) === item.colaborador)?.nome || 'Selecione'
                                                    : 'Selecione um colaborador'}
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                ))
                            )}
                            <TouchableOpacity style={styles.secondaryButton} onPress={adicionarEtapa}>
                                <Text style={styles.secondaryButtonText}>+ Adicionar Etapa</Text>
                            </TouchableOpacity>
                        </Section>

                        <Section
                            ref={sectionRefs.fotos}
                            title="Fotos"
                            collapsed={sections.fotos}
                            onToggle={() => toggleSection('fotos')}
                        >
                            {imageLoading ? (
                                <ActivityIndicator size="large" color={PRIMARY} />
                            ) : (
                                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                                    {(Array.isArray(checklist.checklistcarimbo) ? checklist.checklistcarimbo : []).length === 0 ? (
                                        <Text style={styles.emptyText}>Nenhuma foto adicionada.</Text>
                                    ) : (
                                        (checklist.checklistcarimbo || []).map((item, idx) => (
                                            <TouchableOpacity
                                                key={idx}
                                                onLongPress={() => removerFoto(idx)}
                                                accessibilityLabel={`Foto ${idx + 1}`}
                                                activeOpacity={0.8}
                                            >
                                                <Image
                                                    source={
                                                        item.photo?.startsWith('file://') || item.photo?.startsWith('content://')
                                                            ? { uri: item.photo } // foto local → não usa headers
                                                            : {
                                                                uri: getImageUrl(item.photo),
                                                                headers: { Authorization: `Bearer ${accessToken}` }, // foto remota → usa token
                                                            }
                                                    }
                                                    style={styles.thumb}
                                                    onError={(e) =>
                                                        console.error('Erro ao carregar imagem (carimbo):', e.nativeEvent.error, item.photo)
                                                    }
                                                />
                                            </TouchableOpacity>
                                        ))
                                    )}
                                </View>
                            )}

                            <TouchableOpacity style={styles.secondaryButton} onPress={adicionarFoto}>
                                <Text style={styles.secondaryButtonText}>+ Adicionar Foto</Text>
                            </TouchableOpacity>
                        </Section>

                        <Section title="Inspeção e Aprovação" collapsed={sections.inspeccao} onToggle={() => toggleSection('inspeccao')}>
                            <View style={styles.field}>
                                <Text style={styles.label}>Data de Edição</Text>
                                <Text style={styles.readOnlyText}>
                                    {checklist.data_edicao ? checklist.data_edicao.toLocaleString() : 'N/A'}
                                </Text>
                            </View>
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
                                    style={styles.primaryButton}
                                >
                                    <Text style={styles.primaryButtonText}>Atualizar Checklist</Text>
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
                            onSelect={(value) => adicionarColaborador(value)}
                            selectedValue={selectedColaborador}
                            title="Selecionar Colaborador"
                        />
                        {checklist.etapas.map((_, index) => (
                            <CustomPickerModal
                                key={index}
                                visible={showColaboradorEtapaModal === index}
                                onClose={() => {
                                    setShowColaboradorEtapaModal(null);
                                    setColaboradorEtapaIndex(null);
                                }}
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
    sectionError: { borderColor: '#b00020' },
    sectionHeader: { backgroundColor: '#f7f7f7', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12 },
    sectionHeaderError: { backgroundColor: '#ffebee' },
    sectionTitle: { fontSize: 16, fontWeight: '700' },
    sectionTitleError: { color: '#b00020' },
    sectionToggle: { fontSize: 20, color: '#666' },
    sectionToggleError: { color: '#b00020' },
    sectionBody: { padding: 12, backgroundColor: 'white' },
    field: { marginBottom: 10 },
    label: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
    requiredAsterisk: { color: '#b00020' },
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
    etapaHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    subSectionTitle: { fontSize: 15, fontWeight: '600', marginBottom: 10, color: PRIMARY },
    deleteButton: { padding: 8, borderRadius: 5, backgroundColor: '#f8d7da' },
    deleteText: { color: '#b00020', fontWeight: '600' },
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
    readOnlyText: { padding: 12, backgroundColor: '#f5f5f5', borderRadius: 5 },
    link: { color: PRIMARY, textDecorationLine: 'underline' },
    noDoc: { color: '#777', fontStyle: 'italic' },
    thumb: { width: 90, height: 90, borderRadius: 6, margin: 6, borderWidth: 1, borderColor: '#ddd' },
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
    // Photo styles
    photoList: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start' },
    photoContainer: { margin: 8, alignItems: 'center' },
    photo: { width: 100, height: 100, borderRadius: 4 },
    removePhotoButton: { marginTop: 4, padding: 4, backgroundColor: '#f8d7da', borderRadius: 4 },
    removePhotoText: { color: '#b00020', fontSize: 12 },
    requiredField: {
        borderLeftWidth: 3,
        borderLeftColor: PRIMARY,
    },
    requiredLabel: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    requiredText: {
        fontSize: 10,
        color: '#b00020',
        fontStyle: 'italic',
    },
});