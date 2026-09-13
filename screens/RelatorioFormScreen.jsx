import React, {
    useState,
    useEffect,
    useCallback
} from 'react';

import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ScrollView,
    StyleSheet,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Alert,
    Switch,
} from 'react-native';

import { useNavigation } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';

import CustomPickerModal from '../components/CustomPickerModal';
import DatePicker from '../components/DatePicker';
import PhotoField from '../components/PhotoField';

import {
    criarRelatorio,
    editarRelatorio,
    buscarRelatorioPorId,
} from '../services/relatorioQualidadeService';

import {
    fetchUnidades,
    fetchColaboradores,
} from '../services/dataService';

import {
    getStoredTokens
} from '../services/authService';

import {
    BASE_URL
} from '../services/api';

const PRIMARY = '#00315c';

const TIPO_SERV_CHOICES = [
    { label: 'PARADA', value: 'PARADA' },
    { label: 'PROJETO', value: 'PROJETO' },
    { label: 'NOTA', value: 'NOTA' },
    { label: 'PLANO DE PINTURA', value: 'PLANO DE PINTURA' },
    { label: 'INTEGRIDADE', value: 'INTEGRIDADE' },
    { label: 'MANUTENÇÃO', value: 'MANUTENCAO' },
];

const CORROSIVIDADE_CHOICES = [
    { label: 'N/A', value: 'N/A' },
    { label: 'C1', value: 'C1' },
    { label: 'C2', value: 'C2' },
    { label: 'C3', value: 'C3' },
    { label: 'C4', value: 'C4' },
    { label: 'C5', value: 'C5' },
    { label: 'C6', value: 'C6' },
];

const AMBIENTE_CHOICES = [
    { label: 'INTERNO', value: 'INTERNO' },
    { label: 'EXTERNO', value: 'EXTERNO' },
];

const RESULTADO_CHOICES = [
    { label: 'APROVADO', value: '0' },
    { label: 'REPROVADO', value: '1' },
];

const getNewEtapa = () => ({
    id: Date.now(),

    tinta: '',

    lote_a: '',
    val_a: new Date().toISOString().split('T')[0],

    lote_b: '',
    val_b: new Date().toISOString().split('T')[0],

    lote_c: '',
    val_c: new Date().toISOString().split('T')[0],

    cor_munsell: '',

    temp_amb: '',
    ura: '',
    po: '',
    temp_substrato: '',

    diluente: '',
    met_aplic: '',

    inicio: new Date().toISOString(),
    termino: new Date().toISOString(),

    inter_repintura: '',
    epe: '',
    eps: '',

    insp_visual: '0',

    aderencia: '',
    holiday: '',

    laudo: '0',

    data_insp:
        new Date()
            .toISOString()
            .split('T')[0],

    pintor: '',
});

export default function RelatorioFormScreen({
    route
}) {
    const navigation = useNavigation();

    const id =
        route.params?.id || null;

    const isEditing = !!id;

    const [loading, setLoading] =
        useState(isEditing);

    const [errors, setErrors] = useState({});

    const [accessToken, setAccessToken] =
        useState(null);

    // =============================================
    // OPÇÕES
    // =============================================

    const [pickerOptions, setPickerOptions] =
        useState({
            unidade: [],
            colaborador: [],

            tipo_serv:
                TIPO_SERV_CHOICES,

            corrosividade:
                CORROSIVIDADE_CHOICES,

            ambiente_pintura:
                AMBIENTE_CHOICES,

            insp_visual:
                RESULTADO_CHOICES,

            laudo_etapa:
                RESULTADO_CHOICES,
        });

    // =============================================
    // RELATÓRIO
    // =============================================

    const [relatorio, setRelatorio] =
        useState({
            cliente: '',

            data:
                new Date()
                    .toISOString()
                    .split('T')[0],

            rec: '',
            nota: '',
            tag: '',

            tipo_serv: null,

            unidade: null,
            contrato: null,

            setor: '',
            corrosividade: null,

            fiscal: '',
            inspetor: null,

            inicio: new Date().toISOString(),
            termino: new Date().toISOString(),

            tratamento: '',
            tipo_subs: '',

            temp_ambiente: '',
            ura: '',
            po: '',
            temp_super: '',

            intemperismo: '',
            descontaminacao: '',

            poeira_tam: '',
            poeira_quant: '',
            teor_sais: '',

            ambiente_pintura: null,
            rugosidade: '',

            laudo: true,
            rnc_n: false,

            obs_inst: '',
            obs_final: '',

            aprovado: true,

            m2: '',
            checklist_n: null,

            relatorios: [],
            relatorio: [],
        });

    // =============================================
    // PICKER GENÉRICO
    // =============================================

    const [pickerState, setPickerState] =
        useState({
            visible: false,

            fieldKey: null,
            listKey: null,
            itemId: null,

            title: '',
            options: [],
        });

    // =============================================
    // CARREGAR OPTIONS
    // =============================================

    const loadPickerOptions =
        useCallback(async () => {

            try {

                const [
                    unidades,
                    colaboradores
                ] = await Promise.all([

                    fetchUnidades(),

                    fetchColaboradores(),
                ]);


                setPickerOptions(prev => ({

                    ...prev,

                    unidade:
                        unidades || [],

                    colaborador:
                        colaboradores || [],
                }));


            } catch (error) {

                console.error(
                    'Erro carregando opções:',
                    error
                );
            }

        }, []);

    // =============================================
    // CARREGAMENTO
    // =============================================

    useEffect(() => {
        const load = async () => {
            await loadPickerOptions();

            try {
                const tokens =
                    await getStoredTokens();

                setAccessToken(
                    tokens?.access || null
                );

                if (!isEditing) {
                    setLoading(false);
                    return;
                }

                const data =
                    await buscarRelatorioPorId(id);

                setRelatorio({
                    ...data,

                    unidade:
                        data.unidade?.id ??
                        data.unidade ??
                        null,

                    contrato:
                        data.contrato?.id ??
                        data.contrato ??
                        null,

                    checklist_n:
                        data.checklist_n?.id ??
                        data.checklist_n ??
                        null,

                    m2:
                        data.m2 != null
                            ? String(data.m2)
                            : '',

                    relatorios:
                        (data.relatorios || [])
                            .map(
                                (item, index) => ({
                                    ...item,

                                    id:
                                        item.id ||
                                        Date.now() +
                                        index,

                                    temp_amb:
                                        item.temp_amb != null
                                            ? String(
                                                item.temp_amb
                                            )
                                            : '',

                                    ura:
                                        item.ura != null
                                            ? String(item.ura)
                                            : '',

                                    po:
                                        item.po != null
                                            ? String(item.po)
                                            : '',

                                    temp_substrato:
                                        item.temp_substrato != null
                                            ? String(
                                                item.temp_substrato
                                            )
                                            : '',

                                    epe:
                                        item.epe != null
                                            ? String(item.epe)
                                            : '',

                                    eps:
                                        item.eps != null
                                            ? String(item.eps)
                                            : '',
                                })
                            ),

                    relatorio:
                        data.relatorio || [],
                });

            } catch (error) {
                console.error(
                    'Erro ao carregar relatório:',
                    error
                );

                Alert.alert(
                    'Erro',
                    'Não foi possível carregar o relatório.'
                );

            } finally {
                setLoading(false);
            }
        };

        load();

    }, [
        id,
        isEditing,
        loadPickerOptions
    ]);

    // =============================================
    // HANDLERS
    // =============================================

    const handleChange = (key, value) => {
        setRelatorio(prev => ({
            ...prev,
            [key]: value,
        }));

        if (errors[key]) {
            setErrors(prev => ({
                ...prev,
                [key]: null,
            }));
        }
    };

    const addEtapa = () => {
        if (
            relatorio.relatorios.length >= 3
        ) {
            Alert.alert(
                'Limite',
                'Máximo de 3 etapas de pintura.'
            );

            return;
        }

        setRelatorio(prev => ({
            ...prev,

            relatorios: [
                ...prev.relatorios,
                getNewEtapa(),
            ],
        }));
    };

    const removeEtapa = itemId => {
        setRelatorio(prev => ({
            ...prev,

            relatorios:
                prev.relatorios.filter(
                    item =>
                        item.id !== itemId
                ),
        }));
    };

    const handleChildChange = (
        itemId,
        field,
        value
    ) => {
        setRelatorio(prev => ({
            ...prev,

            relatorios:
                prev.relatorios.map(
                    item =>
                        item.id === itemId
                            ? {
                                ...item,
                                [field]: value,
                            }
                            : item
                ),
        }));

        const errorKey = `${field}_${itemId}`;

        if (errors[errorKey]) {
            setErrors(prev => ({
                ...prev,
                [errorKey]: null,
            }));
        }
    };

    // =============================================
    // PICKER
    // =============================================

    const openPicker = (
        fieldKey,
        title,
        listKey = null,
        itemId = null
    ) => {
        const map = {
            pintor: 'colaborador',
            inspetor: 'colaborador',
            laudo: 'laudo_etapa',
        };

        const optionKey =
            map[fieldKey] ||
            fieldKey;

        setPickerState({
            visible: true,
            fieldKey,
            listKey,
            itemId,
            title,

            options:
                pickerOptions[
                    optionKey
                ] || [],
        });
    };

    const closePicker = () => {
        setPickerState(prev => ({
            ...prev,
            visible: false,
        }));
    };

    const handlePickerSelect =
        value => {

            const {
                fieldKey,
                listKey,
                itemId
            } = pickerState;

            if (
                listKey &&
                itemId
            ) {
                handleChildChange(
                    itemId,
                    fieldKey,
                    value
                );
            } else {
                handleChange(
                    fieldKey,
                    value
                );
            }

            closePicker();
        };

    const getPickerLabel = (
        optionKey,
        value
    ) => {
        if (
            value === null ||
            value === undefined ||
            value === ''
        ) {
            return 'Selecione...';
        }

        const selected =
            (
                pickerOptions[
                    optionKey
                ] || []
            ).find(
                item =>
                    item.value == value
            );

        return selected
            ? String(selected.label)
            : String(value);
    };

    // =============================================
    // FOTO REMOTA
    // =============================================

    const getImageUrl = uri => {
        if (!uri) return null;

        // Foto local recém selecionada
        if (
            uri.startsWith('file://') ||
            uri.startsWith('content://') ||
            uri.startsWith('data:')
        ) {
            return uri;
        }

        // Se veio URL absoluta do backend:
        // http://192.168.../media/...
        // https://scaip.../media/...
        //
        // remove domínio e mantém somente o path.
        if (/^https?:\/\//i.test(uri)) {
            try {
                const parsed = new URL(uri);

                uri = parsed.pathname;
            } catch {
                uri = uri.replace(
                    /^https?:\/\/[^/]+/i,
                    ''
                );
            }
        }

        let path = uri.startsWith('/')
            ? uri
            : `/${uri}`;

        // Já está na rota protegida
        if (path.startsWith('/geral/api/media/')) {
            return (
                BASE_URL.replace(/\/+$/, '') +
                path
            );
        }

        // Veio /media/...
        if (path.startsWith('/media/')) {
            path = `/geral/api${path}`;
        }

        // Veio apenas imagens/...
        else {
            path =
                `/geral/api/media/${path.replace(
                    /^\/+/,
                    ''
                )}`;
        }

        return (
            BASE_URL.replace(/\/+$/, '') +
            path
        );
    };

    // =============================================
    // SAVE
    // =============================================
    const validate = () => {
        const newErrors = {};

        if (!relatorio.cliente?.trim())
            newErrors.cliente = 'Cliente é obrigatório';

        if (!relatorio.rec?.trim())
            newErrors.rec = 'REC é obrigatório';

        if (!relatorio.nota?.trim())
            newErrors.nota = 'Nota é obrigatória';

        if (!relatorio.tag?.trim())
            newErrors.tag = 'TAG é obrigatória';

        if (!relatorio.tipo_serv)
            newErrors.tipo_serv = 'Tipo de serviço é obrigatório';

        if (!relatorio.unidade)
            newErrors.unidade = 'Unidade é obrigatória';

        if (!relatorio.setor?.trim())
            newErrors.setor = 'Setor é obrigatório';

        if (!relatorio.corrosividade)
            newErrors.corrosividade = 'Corrosividade é obrigatória';

        if (!relatorio.tratamento?.trim())
            newErrors.tratamento = 'Tratamento é obrigatório';

        if (!relatorio.tipo_subs?.trim())
            newErrors.tipo_subs = 'Tipo do substrato é obrigatório';

        if (!String(relatorio.m2 || '').trim())
            newErrors.m2 = 'M² é obrigatório';

        relatorio.relatorios.forEach((item, index) => {
            if (!item.tinta?.trim()) {
                newErrors[`tinta_${item.id}`] =
                    `Tinta da etapa ${index + 1} é obrigatória`;
            }
        });

        setErrors(newErrors);

        return Object.keys(newErrors).length === 0;
    };
    const handleSave = async () => {
        if (!validate()) {
            Alert.alert(
                'Campos obrigatórios',
                'Verifique os campos destacados em vermelho.'
            );

            return;
        }

        setLoading(true);

        try {
            const payload = {
                ...relatorio,

                unidade:
                    relatorio.unidade ||
                    null,

                contrato:
                    relatorio.contrato ||
                    null,

                checklist_n:
                    relatorio.checklist_n ||
                    null,

                m2:
                    relatorio.m2
                        ? Number(
                            String(
                                relatorio.m2
                            ).replace(
                                ',',
                                '.'
                            )
                        )
                        : null,

                relatorios:
                    relatorio.relatorios.map(
                        item => ({
                            ...item,

                            // ID não é necessário,
                            // porque o backend apaga
                            // e recria as etapas.
                            id: undefined,
                        })
                    ),
            };

            if (isEditing) {
                await editarRelatorio(
                    id,
                    payload
                );

                Alert.alert(
                    'Sucesso',
                    'Relatório atualizado com sucesso!'
                );

            } else {
                const result =
                    await criarRelatorio(
                        payload
                    );

                if (result.pending) {
                    Alert.alert(
                        'Salvo offline',
                        'O relatório será enviado automaticamente quando a conexão voltar.'
                    );

                } else {
                    Alert.alert(
                        'Sucesso',
                        'Relatório criado com sucesso!'
                    );
                }
            }

            navigation.goBack();

        } catch (error) {
            console.error(
                'Erro ao salvar relatório:',
                error.response?.data ||
                error.message
            );

            Alert.alert(
                'Erro',
                error.message ||
                'Falha ao salvar relatório.'
            );

        } finally {
            setLoading(false);
        }
    };

    // =============================================
    // ETAPA
    // =============================================

    const renderEtapa = (
        item,
        index
    ) => (
        <View
            key={item.id}
            style={styles.cardItem}
        >
            <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>
                    Etapa #{index + 1}
                </Text>

                <TouchableOpacity
                    onPress={() =>
                        removeEtapa(
                            item.id
                        )
                    }
                >
                    <MaterialIcons
                        name="delete"
                        size={24}
                        color="#d9534f"
                    />
                </TouchableOpacity>
            </View>

            <Text style={styles.labelSmall}>
                Tinta *
            </Text>

            <TextInput
                    style={[
                            styles.input,
                            errors[`tinta_${item.id}`] &&
                                styles.inputError
                        ]}
                        value={item.tinta ?? ''}
                        onChangeText={text =>
                            handleChildChange(
                                item.id,
                                'tinta',
                                text
                            )
                        }
                    />

                    {errors[`tinta_${item.id}`] && (
                        <Text style={styles.errorText}>
                            {errors[`tinta_${item.id}`]}
                        </Text>
                    )}

            <View style={styles.row}>
                <View style={styles.col}>
                    <Text style={styles.labelSmall}>
                        Lote A
                    </Text>

                    <TextInput
                        style={styles.input}
                        value={
                            item.lote_a ??
                            ''
                        }
                        onChangeText={text =>
                            handleChildChange(
                                item.id,
                                'lote_a',
                                text
                            )
                        }
                    />
                </View>

                <View style={styles.col}>
                    <Text style={styles.labelSmall}>
                        Validade A
                    </Text>

                    <DatePicker
                        value={
                            item.val_a
                        }
                        onDateChange={value =>
                            handleChildChange(
                                item.id,
                                'val_a',
                                value
                            )
                        }
                        inputStyle={
                            styles.input
                        }
                        nullable
                    />
                </View>
            </View>

            <View style={styles.row}>
                <View style={styles.col}>
                    <Text style={styles.labelSmall}>
                        Lote B
                    </Text>

                    <TextInput
                        style={styles.input}
                        value={
                            item.lote_b ??
                            ''
                        }
                        onChangeText={text =>
                            handleChildChange(
                                item.id,
                                'lote_b',
                                text
                            )
                        }
                    />
                </View>

                <View style={styles.col}>
                    <Text style={styles.labelSmall}>
                        Validade B
                    </Text>

                    <DatePicker
                        value={
                            item.val_b
                        }
                        onDateChange={value =>
                            handleChildChange(
                                item.id,
                                'val_b',
                                value
                            )
                        }
                        inputStyle={
                            styles.input
                        }
                        nullable
                    />
                </View>
            </View>

            <View style={styles.row}>
                <View style={styles.col}>
                    <Text style={styles.labelSmall}>
                        Lote C
                    </Text>

                    <TextInput
                        style={styles.input}
                        value={
                            item.lote_c ??
                            ''
                        }
                        onChangeText={text =>
                            handleChildChange(
                                item.id,
                                'lote_c',
                                text
                            )
                        }
                    />
                </View>

                <View style={styles.col}>
                    <Text style={styles.labelSmall}>
                        Validade C
                    </Text>

                    <DatePicker
                        value={
                            item.val_c
                        }
                        onDateChange={value =>
                            handleChildChange(
                                item.id,
                                'val_c',
                                value
                            )
                        }
                        inputStyle={
                            styles.input
                        }
                        nullable
                    />
                </View>
            </View>

            <Text style={styles.labelSmall}>
                Cor Munsell
            </Text>

            <TextInput
                style={styles.input}
                value={
                    item.cor_munsell ??
                    ''
                }
                onChangeText={text =>
                    handleChildChange(
                        item.id,
                        'cor_munsell',
                        text
                    )
                }
            />

            <View style={styles.row}>
                <View style={styles.col}>
                    <Text style={styles.labelSmall}>
                        Temp. Ambiente
                    </Text>

                    <TextInput
                        style={styles.input}
                        keyboardType="decimal-pad"
                        value={
                            item.temp_amb ??
                            ''
                        }
                        onChangeText={text =>
                            handleChildChange(
                                item.id,
                                'temp_amb',
                                text
                            )
                        }
                    />
                </View>

                <View style={styles.col}>
                    <Text style={styles.labelSmall}>
                        URA
                    </Text>

                    <TextInput
                        style={styles.input}
                        keyboardType="decimal-pad"
                        value={
                            item.ura ?? ''
                        }
                        onChangeText={text =>
                            handleChildChange(
                                item.id,
                                'ura',
                                text
                            )
                        }
                    />
                </View>

                <View style={styles.col}>
                    <Text style={styles.labelSmall}>
                        P.O.
                    </Text>

                    <TextInput
                        style={styles.input}
                        keyboardType="decimal-pad"
                        value={
                            item.po ?? ''
                        }
                        onChangeText={text =>
                            handleChildChange(
                                item.id,
                                'po',
                                text
                            )
                        }
                    />
                </View>
            </View>

            <Text style={styles.labelSmall}>
                Temperatura Substrato
            </Text>

            <TextInput
                style={styles.input}
                keyboardType="decimal-pad"
                value={
                    item.temp_substrato ??
                    ''
                }
                onChangeText={text =>
                    handleChildChange(
                        item.id,
                        'temp_substrato',
                        text
                    )
                }
            />

            <Text style={styles.labelSmall}>
                Diluente
            </Text>

            <TextInput
                style={styles.input}
                value={
                    item.diluente ?? ''
                }
                onChangeText={text =>
                    handleChildChange(
                        item.id,
                        'diluente',
                        text
                    )
                }
            />

            <Text style={styles.labelSmall}>
                Método Aplicação
            </Text>

            <TextInput
                style={styles.input}
                value={
                    item.met_aplic ??
                    ''
                }
                onChangeText={text =>
                    handleChildChange(
                        item.id,
                        'met_aplic',
                        text
                    )
                }
            />

            <Text style={styles.labelSmall}>
                Intervalo Repintura
            </Text>

            <TextInput
                style={styles.input}
                value={
                    item.inter_repintura ??
                    ''
                }
                onChangeText={text =>
                    handleChildChange(
                        item.id,
                        'inter_repintura',
                        text
                    )
                }
            />

            <View style={styles.row}>
                <View style={styles.col}>
                    <Text style={styles.labelSmall}>
                        EPE
                    </Text>

                    <TextInput
                        style={styles.input}
                        keyboardType="decimal-pad"
                        value={
                            item.epe ?? ''
                        }
                        onChangeText={text =>
                            handleChildChange(
                                item.id,
                                'epe',
                                text
                            )
                        }
                    />
                </View>

                <View style={styles.col}>
                    <Text style={styles.labelSmall}>
                        EPS
                    </Text>

                    <TextInput
                        style={styles.input}
                        keyboardType="decimal-pad"
                        value={
                            item.eps ?? ''
                        }
                        onChangeText={text =>
                            handleChildChange(
                                item.id,
                                'eps',
                                text
                            )
                        }
                    />
                </View>
            </View>

            <Text style={styles.labelSmall}>
                Inspeção Visual
            </Text>

            <TouchableOpacity
                style={
                    styles.pickerPlaceholder
                }
                onPress={() =>
                    openPicker(
                        'insp_visual',
                        'Inspeção Visual',
                        'relatorios',
                        item.id
                    )
                }
            >
                <Text style={styles.pickerText}>
                    {getPickerLabel(
                        'insp_visual',
                        item.insp_visual
                    )}
                </Text>
            </TouchableOpacity>

            <Text style={styles.labelSmall}>
                Aderência
            </Text>

            <TextInput
                style={styles.input}
                value={
                    item.aderencia ?? ''
                }
                onChangeText={text =>
                    handleChildChange(
                        item.id,
                        'aderencia',
                        text
                    )
                }
            />

            <Text style={styles.labelSmall}>
                Holiday
            </Text>

            <TextInput
                style={styles.input}
                value={
                    item.holiday ?? ''
                }
                onChangeText={text =>
                    handleChildChange(
                        item.id,
                        'holiday',
                        text
                    )
                }
            />

            <Text style={styles.labelSmall}>
                Laudo
            </Text>

            <TouchableOpacity
                style={
                    styles.pickerPlaceholder
                }
                onPress={() =>
                    openPicker(
                        'laudo',
                        'Laudo',
                        'relatorios',
                        item.id
                    )
                }
            >
                <Text style={styles.pickerText}>
                    {getPickerLabel(
                        'laudo_etapa',
                        item.laudo
                    )}
                </Text>
            </TouchableOpacity>

            <Text style={styles.labelSmall}>
                Pintor / Executante
            </Text>

            <TouchableOpacity
                style={
                    styles.pickerPlaceholder
                }
                onPress={() =>
                    openPicker(
                        'pintor',
                        'Selecione Pintor',
                        'relatorios',
                        item.id
                    )
                }
            >
                <Text style={styles.pickerText}>
                    {getPickerLabel(
                        'colaborador',
                        item.pintor
                    )}
                </Text>
            </TouchableOpacity>
        </View>
    );

    // =============================================
    // LOADING
    // =============================================

    if (loading) {
        return (
            <View style={styles.loadingCenter}>
                <ActivityIndicator
                    size="large"
                    color={PRIMARY}
                />
            </View>
        );
    }

    // =============================================
    // RENDER
    // =============================================

    return (
        <KeyboardAvoidingView
            behavior={
                Platform.OS === 'ios'
                    ? 'padding'
                    : 'height'
            }
            style={{ flex: 1 }}
        >
            <ScrollView
                style={styles.container}
                contentContainerStyle={
                    styles.scrollContent
                }
            >
                {/* DADOS GERAIS */}

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>
                        Dados Gerais
                    </Text>

                    <Text style={styles.label}>
                        Cliente *
                    </Text>

                    <TextInput
                        style={[
                            styles.input,
                            errors.cliente && styles.inputError
                        ]}
                        value={relatorio.cliente}
                        onChangeText={text =>
                            handleChange(
                                'cliente',
                                text
                            )
                        }
                    />

                    {errors.cliente && (
                        <Text style={styles.errorText}>
                            {errors.cliente}
                        </Text>
                    )}

                    <Text style={styles.label}>
                        Data
                    </Text>

                    <DatePicker
                        value={relatorio.data}
                        onDateChange={value =>
                            handleChange(
                                'data',
                                value
                            )
                        }
                        inputStyle={
                            styles.input
                        }
                    />

                    <View style={styles.row}>
                        <View style={styles.col}>
                            <Text style={styles.labelSmall}>
                                REC *
                            </Text>

                            <TextInput
                                    style={[
                                        styles.input,
                                        errors.rec && styles.inputError
                                    ]}
                                    value={relatorio.rec}
                                    onChangeText={text =>
                                        handleChange(
                                            'rec',
                                            text
                                        )
                                    }
                                />

                                {errors.rec && (
                                    <Text style={styles.errorText}>
                                        {errors.rec}
                                    </Text>
                                )}
                        </View>

                        <View style={styles.col}>
                            <Text style={styles.labelSmall}>
                                Nota *
                            </Text>

                            <TextInput
                                    style={[
                                        styles.input,
                                        errors.nota && styles.inputError
                                    ]}
                                    value={relatorio.nota}
                                    onChangeText={text =>
                                        handleChange(
                                            'nota',
                                            text
                                        )
                                    }
                                />

                                {errors.nota && (
                                    <Text style={styles.errorText}>
                                        {errors.nota}
                                    </Text>
                                )}
                        </View>

                        <View style={styles.col}>
                            <Text style={styles.labelSmall}>
                                TAG *
                            </Text>

                            <TextInput
                                    style={[
                                        styles.input,
                                        errors.tag && styles.inputError
                                    ]}
                                    value={relatorio.tag}
                                    onChangeText={text =>
                                        handleChange(
                                            'tag',
                                            text
                                        )
                                    }
                                />

                                {errors.tag && (
                                    <Text style={styles.errorText}>
                                        {errors.tag}
                                    </Text>
                                )}
                        </View>
                    </View>

                    <Text style={styles.label}>
                        Tipo Serviço *
                    </Text>

                        <TouchableOpacity
                                style={[
                                    styles.pickerPlaceholder,
                                    errors.tipo_serv && styles.inputError
                                ]}
                                onPress={() =>
                                    openPicker(
                                        'tipo_serv',
                                        'Tipo Serviço'
                                    )
                                }
                            >
                                <Text style={styles.pickerText}>
                                    {getPickerLabel(
                                        'tipo_serv',
                                        relatorio.tipo_serv
                                    )}
                                </Text>
                            </TouchableOpacity>

                            {errors.tipo_serv && (
                                <Text style={styles.errorText}>
                                    {errors.tipo_serv}
                                </Text>
                            )}

                    <Text style={styles.label}>
                        Unidade *
                    </Text>

                    <TouchableOpacity
                            style={[
                                styles.pickerPlaceholder,
                                errors.unidade && styles.inputError
                            ]}
                            onPress={() =>
                                openPicker(
                                    'unidade',
                                    'Unidade'
                                )
                            }
                        >
                            <Text style={styles.pickerText}>
                                {getPickerLabel(
                                    'unidade',
                                    relatorio.unidade
                                )}
                            </Text>
                        </TouchableOpacity>

                        {errors.unidade && (
                            <Text style={styles.errorText}>
                                {errors.unidade}
                            </Text>
                        )}

                    <Text style={styles.label}>
                        Inspetor
                    </Text>

                    <TextInput
                        style={[
                            styles.input,
                            errors.inspetor && styles.inputError
                        ]}
                        value={relatorio.inspetor}
                        onChangeText={text =>
                            handleChange(
                                'inspetor',
                                text
                            )
                        }
                    />

                    <View style={styles.row}>
                        <View style={styles.col}>
                            <Text style={styles.labelSmall}>
                                Contrato
                            </Text>

                            <TextInput
                                style={styles.input}
                                keyboardType="numeric"
                                value={
                                    relatorio.contrato
                                        ? String(
                                            relatorio.contrato
                                        )
                                        : ''
                                }
                                onChangeText={text =>
                                    handleChange(
                                        'contrato',
                                        text
                                    )
                                }
                            />
                        </View>

                        <View style={styles.col}>
                            <Text style={styles.labelSmall}>
                                Setor *
                            </Text>

                            <TextInput
                                style={styles.input}
                                value={
                                    relatorio.setor
                                }
                                onChangeText={text =>
                                    handleChange(
                                        'setor',
                                        text
                                    )
                                }
                            />
                        </View>
                    </View>

                    <Text style={styles.label}>
                        Corrosividade *
                    </Text>

                    <TouchableOpacity
                            style={[
                                styles.pickerPlaceholder,
                                errors.corrosividade && styles.inputError
                            ]}
                            onPress={() =>
                                openPicker(
                                    'corrosividade',
                                    'Corrosividade'
                                )
                            }
                        >
                            <Text style={styles.pickerText}>
                                {getPickerLabel(
                                    'corrosividade',
                                    relatorio.corrosividade
                                )}
                            </Text>
                        </TouchableOpacity>

                        {errors.corrosividade && (
                            <Text style={styles.errorText}>
                                {errors.corrosividade}
                            </Text>
                        )}

                    <Text style={styles.label}>
                        Fiscal
                    </Text>

                    <TextInput
                        style={styles.input}
                        value={relatorio.fiscal}
                        onChangeText={text =>
                            handleChange(
                                'fiscal',
                                text
                            )
                        }
                    />
                </View>

                {/* CONDIÇÕES */}

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>
                        Condições / Preparação
                    </Text>

                    <View style={styles.row}>
                        <View style={styles.col}>
                            <Text style={styles.labelSmall}>
                                Temp. Ambiente
                            </Text>

                            <TextInput
                                style={styles.input}
                                value={
                                    relatorio.temp_ambiente
                                }
                                onChangeText={text =>
                                    handleChange(
                                        'temp_ambiente',
                                        text
                                    )
                                }
                            />
                        </View>

                        <View style={styles.col}>
                            <Text style={styles.labelSmall}>
                                URA
                            </Text>

                            <TextInput
                                style={styles.input}
                                value={
                                    relatorio.ura
                                }
                                onChangeText={text =>
                                    handleChange(
                                        'ura',
                                        text
                                    )
                                }
                            />
                        </View>

                        <View style={styles.col}>
                            <Text style={styles.labelSmall}>
                                P.O.
                            </Text>

                            <TextInput
                                style={styles.input}
                                value={
                                    relatorio.po
                                }
                                onChangeText={text =>
                                    handleChange(
                                        'po',
                                        text
                                    )
                                }
                            />
                        </View>
                    </View>

                    <Text style={styles.label}>
                        Tratamento *
                    </Text>

                    <TextInput
                        style={[
                            styles.input,
                            errors.tratamento && styles.inputError
                        ]}
                        value={relatorio.tratamento}
                        onChangeText={text =>
                            handleChange(
                                'tratamento',
                                text
                            )
                        }
                    />

                    {errors.tratamento && (
                        <Text style={styles.errorText}>
                            {errors.tratamento}
                        </Text>
                    )}

                    <Text style={styles.label}>
                        Tipo Substrato *
                    </Text>

                    <TextInput
                            style={[
                                styles.input,
                                errors.tipo_subs && styles.inputError
                            ]}
                            value={relatorio.tipo_subs}
                            onChangeText={text =>
                                handleChange(
                                    'tipo_subs',
                                    text
                                )
                            }
                        />

                        {errors.tipo_subs && (
                            <Text style={styles.errorText}>
                                {errors.tipo_subs}
                            </Text>
                        )}

                    <Text style={styles.label}>
                        Ambiente Pintura
                    </Text>

                    <TouchableOpacity
                        style={
                            styles.pickerPlaceholder
                        }
                        onPress={() =>
                            openPicker(
                                'ambiente_pintura',
                                'Ambiente Pintura'
                            )
                        }
                    >
                        <Text style={styles.pickerText}>
                            {getPickerLabel(
                                'ambiente_pintura',
                                relatorio
                                    .ambiente_pintura
                            )}
                        </Text>
                    </TouchableOpacity>

                    <Text style={styles.label}>
                        Rugosidade
                    </Text>

                    <TextInput
                        style={styles.input}
                        value={
                            relatorio.rugosidade
                        }
                        onChangeText={text =>
                            handleChange(
                                'rugosidade',
                                text
                            )
                        }
                    />

                    <Text style={styles.label}>
                        Intemperismo
                    </Text>

                    <TextInput
                        style={styles.input}
                        value={
                            relatorio.intemperismo
                        }
                        onChangeText={text =>
                            handleChange(
                                'intemperismo',
                                text
                            )
                        }
                    />

                    <Text style={styles.label}>
                        Descontaminação
                    </Text>

                    <TextInput
                        style={styles.input}
                        value={
                            relatorio.descontaminacao
                        }
                        onChangeText={text =>
                            handleChange(
                                'descontaminacao',
                                text
                            )
                        }
                    />
                </View>

                {/* ETAPAS */}

                <View style={styles.section}>
                    <View
                        style={
                            styles.sectionHeaderRow
                        }
                    >
                        <Text
                            style={
                                styles.sectionTitle
                            }
                        >
                            Etapas de Pintura
                        </Text>

                        <TouchableOpacity
                            onPress={addEtapa}
                        >
                            <MaterialIcons
                                name="add-circle"
                                size={30}
                                color={PRIMARY}
                            />
                        </TouchableOpacity>
                    </View>

                    {relatorio.relatorios.length ===
                    0 ? (
                        <Text style={styles.emptyText}>
                            Nenhuma etapa.
                        </Text>
                    ) : (
                        relatorio.relatorios.map(
                            renderEtapa
                        )
                    )}
                </View>

                {/* FOTOS */}

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>
                        Fotos
                    </Text>

                    <PhotoField
                        photos={
                            relatorio.relatorio
                        }
                        onChange={photos =>
                            handleChange(
                                'relatorio',
                                photos
                            )
                        }
                        getRemoteUri={
                            getImageUrl
                        }
                        accessToken={
                            accessToken
                        }
                    />
                </View>

                {/* FINAL */}

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>
                        Inspeção / Aprovação
                    </Text>

                    <View style={styles.switchRow}>
                        <Text style={styles.label}>
                            Laudo
                        </Text>

                        <Switch
                            value={
                                !!relatorio.laudo
                            }
                            onValueChange={value =>
                                handleChange(
                                    'laudo',
                                    value
                                )
                            }
                        />
                    </View>

                    <View style={styles.switchRow}>
                        <Text style={styles.label}>
                            RNC
                        </Text>

                        <Switch
                            value={
                                !!relatorio.rnc_n
                            }
                            onValueChange={value =>
                                handleChange(
                                    'rnc_n',
                                    value
                                )
                            }
                        />
                    </View>

                    <Text style={styles.label}>
                        Instrumentos
                    </Text>

                    <TextInput
                        style={[
                            styles.input,
                            styles.textArea
                        ]}
                        multiline
                        value={
                            relatorio.obs_inst
                        }
                        onChangeText={text =>
                            handleChange(
                                'obs_inst',
                                text
                            )
                        }
                    />

                    <Text style={styles.label}>
                        Observações Finais
                    </Text>

                    <TextInput
                        style={[
                            styles.input,
                            styles.textArea
                        ]}
                        multiline
                        value={
                            relatorio.obs_final
                        }
                        onChangeText={text =>
                            handleChange(
                                'obs_final',
                                text
                            )
                        }
                    />

                    <Text style={styles.label}>
                        M² *
                    </Text>

                    <TextInput
                            style={[
                                styles.input,
                                errors.m2 && styles.inputError
                            ]}
                            keyboardType="decimal-pad"
                            value={relatorio.m2}
                            onChangeText={text =>
                                handleChange(
                                    'm2',
                                    text
                                )
                            }
                        />

                        {errors.m2 && (
                            <Text style={styles.errorText}>
                                {errors.m2}
                            </Text>
                        )}
                </View>

                <TouchableOpacity
                    style={styles.saveBtn}
                    onPress={handleSave}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator
                            color="#fff"
                        />
                    ) : (
                        <Text
                            style={
                                styles.saveBtnText
                            }
                        >
                            {isEditing
                                ? 'SALVAR ALTERAÇÕES'
                                : 'SALVAR RELATÓRIO'}
                        </Text>
                    )}
                </TouchableOpacity>

                <View style={{ height: 50 }} />
            </ScrollView>

            <CustomPickerModal
                visible={
                    pickerState.visible
                }
                onClose={closePicker}
                options={
                    pickerState.options
                }
                onSelect={
                    handlePickerSelect
                }
                title={
                    pickerState.title
                }
                selectedValue={
                    pickerState.listKey &&
                    pickerState.itemId
                        ? relatorio[
                            pickerState.listKey
                        ]?.find(
                            item =>
                                item.id ===
                                pickerState.itemId
                        )?.[
                            pickerState.fieldKey
                        ]
                        : relatorio[
                            pickerState.fieldKey
                        ]
                }
            />
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    scrollContent: {
        padding: 12,
    },
    loadingCenter: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    section: {
        backgroundColor: '#fff',
        borderRadius: 8,
        padding: 12,
        marginBottom: 12,
        elevation: 2,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: PRIMARY,
        marginBottom: 12,
    },
    sectionHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    label: {
        fontWeight: '600',
        marginTop: 8,
        marginBottom: 4,
    },
    labelSmall: {
        fontSize: 12,
        fontWeight: '600',
        marginBottom: 4,
    },
    input: {
        minHeight: 42,
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 6,
        paddingHorizontal: 10,
        backgroundColor: '#fff',
    },
    pickerPlaceholder: {
        minHeight: 42,
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 6,
        paddingHorizontal: 10,
        justifyContent: 'center',
        backgroundColor: '#fff',
    },
    pickerText: {
        color: '#333',
    },
    textArea: {
        height: 80,
        paddingTop: 10,
        textAlignVertical: 'top',
    },
    row: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 8,
    },
    col: {
        flex: 1,
    },
    cardItem: {
        backgroundColor: '#f8f9fa',
        borderRadius: 7,
        padding: 10,
        marginTop: 10,
        borderWidth: 1,
        borderColor: '#e1e1e1',
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    cardTitle: {
        fontWeight: '700',
        color: PRIMARY,
    },
    emptyText: {
        color: '#777',
        textAlign: 'center',
        marginVertical: 10,
    },
    switchRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginVertical: 6,
    },
    saveBtn: {
        height: 50,
        borderRadius: 7,
        backgroundColor: PRIMARY,
        alignItems: 'center',
        justifyContent: 'center',
    },
    saveBtnText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 15,
    },
    inputError: {
        borderColor: '#dc3545',
        borderWidth: 1.5,
        backgroundColor: '#fff8f8',
    },

    errorText: {
        color: '#dc3545',
        fontSize: 11,
        fontWeight: '500',
        marginTop: 3,
        marginBottom: 4,
    },
});