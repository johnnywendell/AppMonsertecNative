import React, {
    useEffect,
    useState
} from 'react';

import {
    View,
    Text,
    TextInput,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Switch,
    Alert,
    ActivityIndicator
} from 'react-native';

import {
    useNavigation,
    useRoute
} from '@react-navigation/native';

import {
    MaterialIcons
} from '@expo/vector-icons';

import {
    criarChecklist,
    editarChecklist,
    buscarChecklistPorId
} from '../services/checklistQualidadeService';

import {
    fetchUnidades,
    fetchColaboradores
} from '../services/dataService';

import {
    getStoredTokens
} from '../services/authService';

import {
    BASE_URL
} from '../services/api';

import CustomPickerModal
    from '../components/CustomPickerModal';

import DatePicker
    from '../components/DatePicker';

import PhotoField
    from '../components/PhotoField';


const PRIMARY = '#00315c';


// =========================================================
// CHOICES
// =========================================================

const TIPO_SERV_CHOICES = [
    {
        label: 'PARADA',
        value: 'PARADA'
    },
    {
        label: 'PROJETO',
        value: 'PROJETO'
    },
    {
        label: 'NOTA',
        value: 'NOTA'
    },
    {
        label: 'PLANO DE PINTURA',
        value: 'PLANO DE PINTURA'
    },
    {
        label: 'INTEGRIDADE',
        value: 'INTEGRIDADE'
    },
    {
        label: 'MANUTENÇÃO',
        value: 'MANUTENCAO'
    },
];


const SIM_NAO_CHOICES = [
    {
        label: 'SIM',
        value: 'SIM'
    },
    {
        label: 'NÃO',
        value: 'NAO'
    },
    {
        label: 'N/A',
        value: 'N/A'
    },
];


// =========================================================
// HELPERS
// =========================================================

const normalizeDate = value => {

    if (!value) {
        return null;
    }

    return String(value)
        .substring(0, 10);
};


const normalizeTime = value => {

    if (!value) {
        return '';
    }

    return String(value)
        .substring(0, 5);
};


const getNewEtapa = () => ({

    id:
        `${Date.now()}-${Math.random()}`,

    data_inicio: null,

    inicio: '',

    termino: '',

    tipo_substrato: '',

    tinta: '',

    cor_munsell: '',

    lote_a: '',

    lote_b: '',

    lote_c: '',

    fabricante: '',

    data_final: null,

    colaborador: null,
});


// =========================================================
// URL FOTO PROTEGIDA
// =========================================================

const getImageUrl = uri => {

    if (!uri) {
        return null;
    }

    if (
        uri.startsWith('file://') ||
        uri.startsWith('content://') ||
        uri.startsWith('data:')
    ) {
        return uri;
    }

    if (/^https?:\/\//i.test(uri)) {

        try {

            const parsed =
                new URL(uri);

            uri =
                parsed.pathname;

        } catch {

            uri = uri.replace(
                /^https?:\/\/[^/]+/i,
                ''
            );
        }
    }

    let path =
        uri.startsWith('/')
            ? uri
            : `/${uri}`;

    if (
        path.startsWith(
            '/geral/api/media/'
        )
    ) {

        return (
            BASE_URL.replace(/\/+$/, '') +
            path
        );
    }

    if (
        path.startsWith('/media/')
    ) {

        path =
            `/geral/api${path}`;

    } else {

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


// =========================================================
// SCREEN
// =========================================================

export default function ChecklistFormScreen() {

    const navigation =
        useNavigation();

    const route =
        useRoute();

    const id =
        route.params?.id;

    const isEditing =
        Boolean(id);


    // =====================================================
    // STATE
    // =====================================================

    const [loading, setLoading] =
        useState(false);

    const [initialLoading, setInitialLoading] =
        useState(isEditing);

    const [errors, setErrors] =
        useState({});

    const [accessToken, setAccessToken] =
        useState(null);


    const [unidades, setUnidades] =
        useState([]);

    const [
        colaboradoresOptions,
        setColaboradoresOptions
    ] = useState([]);


    const [checklist, setChecklist] =
        useState({

            cliente: '',

            tag: '',

            unidade: null,

            data: null,

            rec: '',

            nota: '',

            setor: '',

            tipo_serv: '',

            m2: '',

            esquema_pintura: '',

            tratamento: '',

            laudo: true,

            rnc_n: false,

            obs_final: '',

            aprovado: true,

            calha_utec: null,

            guia_pc: null,

            fita_protec: null,

            trecho_rec: null,

            elastomero: null,

            volante_caps: null,

            doc: null,

            checklist: [],

            colaboradorchecklist_set: [],

            checklistcarimbo: [],
        });


    // =====================================================
    // PICKER
    // =====================================================

    const [pickerState, setPickerState] =
        useState({

            visible: false,

            fieldKey: null,

            listKey: null,

            itemId: null,

            title: '',

            options: [],
        });


    // =====================================================
    // CARREGAR OPTIONS
    // =====================================================

    useEffect(() => {

        const loadOptions = async () => {

            try {

                const [
                    unidadesData,
                    colaboradoresData
                ] = await Promise.all([

                    fetchUnidades(),

                    fetchColaboradores(),
                ]);

                setUnidades(
                    unidadesData || []
                );

                setColaboradoresOptions(
                    colaboradoresData || []
                );

            } catch (error) {

                console.error(
                    'Erro carregando opções:',
                    error
                );
            }
        };


        loadOptions();

    }, []);


    // =====================================================
    // TOKEN
    // =====================================================

    useEffect(() => {

        const loadToken = async () => {

            const tokens =
                await getStoredTokens();

            setAccessToken(
                tokens?.access || null
            );
        };


        loadToken();

    }, []);


    // =====================================================
    // CARREGAR EDIÇÃO
    // =====================================================

    useEffect(() => {

        if (!isEditing) {
            return;
        }


        const loadChecklist = async () => {

            try {

                setInitialLoading(true);


                const data =
                    await buscarChecklistPorId(
                        id
                    );


                setChecklist({

                    cliente:
                        data.cliente || '',

                    tag:
                        data.tag || '',

                    unidade:
                        data.unidade?.id ??
                        data.unidade ??
                        null,

                    data:
                        normalizeDate(
                            data.data
                        ),

                    rec:
                        data.rec || '',

                    nota:
                        data.nota || '',

                    setor:
                        data.setor || '',

                    tipo_serv:
                        data.tipo_serv || '',

                    m2:
                        data.m2 != null
                            ? String(data.m2)
                            : '',

                    esquema_pintura:
                        data.esquema_pintura ||
                        '',

                    tratamento:
                        data.tratamento || '',

                    laudo:
                        Boolean(data.laudo),

                    rnc_n:
                        Boolean(data.rnc_n),

                    obs_final:
                        data.obs_final || '',

                    aprovado:
                        Boolean(
                            data.aprovado
                        ),

                    calha_utec:
                        data.calha_utec ||
                        null,

                    guia_pc:
                        data.guia_pc ||
                        null,

                    fita_protec:
                        data.fita_protec ||
                        null,

                    trecho_rec:
                        data.trecho_rec ||
                        null,

                    elastomero:
                        data.elastomero ||
                        null,

                    volante_caps:
                        data.volante_caps ||
                        null,

                    doc:
                        data.doc || null,


                    // =============================
                    // ETAPAS
                    // =============================

                    checklist:
                        (
                            data.checklist ||
                            []
                        ).map(
                            (
                                item,
                                index
                            ) => ({

                                ...item,

                                id:
                                    item.id ??
                                    `${Date.now()}-${index}`,

                                data_inicio:
                                    normalizeDate(
                                        item.data_inicio
                                    ),

                                data_final:
                                    normalizeDate(
                                        item.data_final
                                    ),

                                inicio:
                                    normalizeTime(
                                        item.inicio
                                    ),

                                termino:
                                    normalizeTime(
                                        item.termino
                                    ),

                                colaborador:
                                    item.colaborador?.id ??
                                    item.colaborador ??
                                    null,
                            })
                        ),


                    // =============================
                    // COLABORADORES
                    // =============================

                    colaboradorchecklist_set:
                        (
                            data.colaboradorchecklist_set ||
                            []
                        ).map(
                            (
                                item,
                                index
                            ) => ({

                                id:
                                    item.id ??
                                    `${Date.now()}-col-${index}`,

                                colaborador:
                                    item.colaborador?.id ??
                                    item.colaborador ??
                                    null,
                            })
                        ),


                    // =============================
                    // FOTOS
                    // =============================

                    checklistcarimbo:
                        data.checklistcarimbo ||
                        [],
                });


            } catch (error) {

                console.error(
                    'Erro carregando checklist:',
                    error.response?.data ||
                    error.message
                );


                Alert.alert(
                    'Erro',
                    'Não foi possível carregar o checklist.'
                );

            } finally {

                setInitialLoading(false);
            }
        };


        loadChecklist();

    }, [id, isEditing]);


    // =====================================================
    // CHANGE PAI
    // =====================================================

    const handleChange = (
        key,
        value
    ) => {

        setChecklist(prev => ({

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


    // =====================================================
    // ETAPAS
    // =====================================================

    const addEtapa = () => {

        if (
            checklist.checklist.length >= 3
        ) {

            Alert.alert(
                'Limite atingido',
                'O máximo permitido são 3 etapas.'
            );

            return;
        }


        setChecklist(prev => ({

            ...prev,

            checklist: [

                ...prev.checklist,

                getNewEtapa(),
            ],
        }));
    };


    const removeEtapa = itemId => {

        setChecklist(prev => ({

            ...prev,

            checklist:
                prev.checklist.filter(
                    item =>
                        item.id !== itemId
                ),
        }));
    };


    const handleEtapaChange = (
        itemId,
        field,
        value
    ) => {

        setChecklist(prev => ({

            ...prev,

            checklist:
                prev.checklist.map(
                    item =>
                        item.id === itemId
                            ? {
                                ...item,
                                [field]: value
                            }
                            : item
                ),
        }));


        const errorKey =
            `${field}_${itemId}`;


        if (errors[errorKey]) {

            setErrors(prev => ({

                ...prev,

                [errorKey]: null,
            }));
        }
    };


    // =====================================================
    // COLABORADORES
    // =====================================================

    const addColaborador = () => {

        setChecklist(prev => ({

            ...prev,

            colaboradorchecklist_set: [

                ...prev.colaboradorchecklist_set,

                {
                    id:
                        `${Date.now()}-${Math.random()}`,

                    colaborador:
                        null,
                },
            ],
        }));
    };


    const removeColaborador = itemId => {

        setChecklist(prev => ({

            ...prev,

            colaboradorchecklist_set:
                prev
                    .colaboradorchecklist_set
                    .filter(
                        item =>
                            item.id !== itemId
                    ),
        }));
    };


    // =====================================================
    // PICKER
    // =====================================================

    const openPicker = (
        fieldKey,
        title,
        listKey = null,
        itemId = null
    ) => {

        let options = [];


        if (
            fieldKey === 'tipo_serv'
        ) {

            options =
                TIPO_SERV_CHOICES;

        } else if (
            fieldKey === 'unidade'
        ) {

            options =
                unidades;

        } else if (
            [
                'calha_utec',
                'guia_pc',
                'fita_protec',
                'trecho_rec',
                'elastomero',
                'volante_caps',
            ].includes(fieldKey)
        ) {

            options =
                SIM_NAO_CHOICES;

        } else if (
            fieldKey === 'colaborador'
        ) {

            options =
                colaboradoresOptions;
        }


        setPickerState({

            visible: true,

            fieldKey,

            listKey,

            itemId,

            title,

            options,
        });
    };


    const handlePickerSelect = value => {

        const {
            fieldKey,
            listKey,
            itemId
        } = pickerState;


        // =============================
        // PAI
        // =============================

        if (!listKey) {

            handleChange(
                fieldKey,
                value
            );
        }


        // =============================
        // ETAPA
        // =============================

        else if (
            listKey === 'checklist'
        ) {

            handleEtapaChange(
                itemId,
                fieldKey,
                value
            );
        }


        // =============================
        // COLABORADOR
        // =============================

        else if (
            listKey ===
            'colaboradorchecklist_set'
        ) {

            setChecklist(prev => ({

                ...prev,

                colaboradorchecklist_set:
                    prev
                        .colaboradorchecklist_set
                        .map(
                            item =>
                                item.id === itemId
                                    ? {
                                        ...item,
                                        colaborador:
                                            value
                                    }
                                    : item
                        ),
            }));
        }


        setPickerState(prev => ({

            ...prev,

            visible: false,
        }));
    };


    const getPickerLabel = (
        field,
        value
    ) => {

        if (
            value === null ||
            value === undefined ||
            value === ''
        ) {
            return 'Selecione';
        }


        let options = [];


        if (field === 'tipo_serv') {

            options =
                TIPO_SERV_CHOICES;

        } else if (
            field === 'unidade'
        ) {

            options =
                unidades;

        } else if (
            field === 'colaborador'
        ) {

            options =
                colaboradoresOptions;

        } else {

            options =
                SIM_NAO_CHOICES;
        }


        return (
            options.find(
                item =>
                    String(item.value) ===
                    String(value)
            )?.label ||
            String(value)
        );
    };


    // =====================================================
    // VALIDAR
    // =====================================================

    const validate = () => {

        const newErrors = {};


        if (
            !String(
                checklist.cliente || ''
            ).trim()
        ) {

            newErrors.cliente =
                'Cliente é obrigatório';
        }


        if (
            !String(
                checklist.tag || ''
            ).trim()
        ) {

            newErrors.tag =
                'TAG é obrigatória';
        }


        if (!checklist.data) {

            newErrors.data =
                'Data é obrigatória';
        }


        if (!checklist.unidade) {

            newErrors.unidade =
                'Unidade é obrigatória';
        }


        if (
            !String(
                checklist.rec || ''
            ).trim()
        ) {

            newErrors.rec =
                'REC é obrigatório';
        }


        if (
            !String(
                checklist.nota || ''
            ).trim()
        ) {

            newErrors.nota =
                'Nota é obrigatória';
        }


        if (
            !String(
                checklist.setor || ''
            ).trim()
        ) {

            newErrors.setor =
                'Setor é obrigatório';
        }


        if (!checklist.tipo_serv) {

            newErrors.tipo_serv =
                'Tipo de serviço é obrigatório';
        }


        if (
            !String(
                checklist.m2 || ''
            ).trim()
        ) {

            newErrors.m2 =
                'M² é obrigatório';
        }


        if (
            !String(
                checklist.esquema_pintura ||
                ''
            ).trim()
        ) {

            newErrors.esquema_pintura =
                'Esquema de pintura é obrigatório';
        }


        if (
            !String(
                checklist.tratamento || ''
            ).trim()
        ) {

            newErrors.tratamento =
                'Tratamento é obrigatório';
        }


        const choiceFields = [

            'calha_utec',

            'guia_pc',

            'fita_protec',

            'trecho_rec',

            'elastomero',

            'volante_caps',
        ];



        checklist.checklist.forEach(
            (item) => {

                if (
                    !String(
                        item.tinta || ''
                    ).trim()
                ) {

                    newErrors[
                        `tinta_${item.id}`
                    ] =
                        'Tinta é obrigatória';
                }
            }
        );


        setErrors(newErrors);


        return (
            Object.keys(
                newErrors
            ).length === 0
        );
    };


    // =====================================================
    // SAVE
    // =====================================================

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

                ...checklist,


                unidade:
                    checklist.unidade ||
                    null,


                m2:
                    checklist.m2 !== ''
                        ? Number(
                            String(
                                checklist.m2
                            ).replace(
                                ',',
                                '.'
                            )
                        )
                        : null,


                laudo:
                    Boolean(
                        checklist.laudo
                    ),


                rnc_n:
                    Boolean(
                        checklist.rnc_n
                    ),


                aprovado:
                    Boolean(
                        checklist.aprovado
                    ),


                // =============================
                // ETAPAS
                // =============================

                checklist:
                    checklist.checklist.map(
                        item => ({

                            data_inicio:
                                item.data_inicio ||
                                null,

                            inicio:
                                item.inicio
                                    ? `${item.inicio}:00`
                                    : null,

                            termino:
                                item.termino
                                    ? `${item.termino}:00`
                                    : null,

                            tipo_substrato:
                                item.tipo_substrato ||
                                '',

                            tinta:
                                item.tinta ||
                                '',

                            cor_munsell:
                                item.cor_munsell ||
                                '',

                            lote_a:
                                item.lote_a ||
                                '',

                            lote_b:
                                item.lote_b ||
                                '',

                            lote_c:
                                item.lote_c ||
                                '',

                            fabricante:
                                item.fabricante ||
                                '',

                            data_final:
                                item.data_final ||
                                null,

                            // Mantive porque existia
                            // na estrutura da tela antiga.
                            colaborador:
                                item.colaborador ||
                                null,
                        })
                    ),


                // =============================
                // COLABORADORES
                // =============================

                colaboradorchecklist_set:
                    checklist
                        .colaboradorchecklist_set
                        .filter(
                            item =>
                                item.colaborador
                        )
                        .map(
                            item => ({

                                colaborador:
                                    Number(
                                        item.colaborador
                                    ),
                            })
                        ),


                // Fotos permanecem no state.
                // O service será responsável
                // pela conversão Base64.
                checklistcarimbo:
                    checklist.checklistcarimbo ||
                    [],
            };


            if (isEditing) {

                await editarChecklist(
                    id,
                    payload
                );


                Alert.alert(
                    'Sucesso',
                    'Checklist atualizado com sucesso.',
                    [
                        {
                            text: 'OK',
                            onPress:
                                () =>
                                    navigation.goBack()
                        }
                    ]
                );

            } else {

                const result =
                    await criarChecklist(
                        payload
                    );


                if (result?.pending) {

                    Alert.alert(
                        'Salvo',
                        'Checklist salvo para sincronização quando houver conexão.',
                        [
                            {
                                text: 'OK',
                                onPress:
                                    () =>
                                        navigation.goBack()
                            }
                        ]
                    );

                    return;
                }


                Alert.alert(
                    'Sucesso',
                    'Checklist criado com sucesso.',
                    [
                        {
                            text: 'OK',
                            onPress:
                                () =>
                                    navigation.goBack()
                        }
                    ]
                );
            }


        } catch (error) {

            console.error(
                'Erro salvando checklist:',
                error.response?.data ||
                error.message
            );


            Alert.alert(
                'Erro',
                error.message ||
                'Não foi possível salvar o checklist.'
            );

        } finally {

            setLoading(false);
        }
    };


    // =====================================================
    // FIELD
    // =====================================================

    const renderInput = (
        label,
        field,
        options = {}
    ) => (

        <View style={styles.field}>

            <Text style={styles.label}>
                {label}

                {options.required && (
                    <Text
                        style={
                            styles.required
                        }
                    >
                        {' *'}
                    </Text>
                )}
            </Text>

            <TextInput
                style={[
                    styles.input,

                    errors[field] &&
                    styles.inputError,

                    options.multiline &&
                    styles.textArea
                ]}
                value={
                    checklist[field] != null
                        ? String(
                            checklist[field]
                        )
                        : ''
                }
                onChangeText={
                    value =>
                        handleChange(
                            field,
                            value
                        )
                }
                keyboardType={
                    options.keyboardType ||
                    'default'
                }
                multiline={
                    options.multiline
                }
            />

            {errors[field] && (

                <Text
                    style={
                        styles.errorText
                    }
                >
                    {errors[field]}
                </Text>
            )}

        </View>
    );


    const renderPicker = (
        label,
        field,
        title,
        required = false
    ) => (

        <View style={styles.field}>

            <Text style={styles.label}>
                {label}

                {required && (
                    <Text
                        style={
                            styles.required
                        }
                    >
                        {' *'}
                    </Text>
                )}
            </Text>

            <TouchableOpacity
                style={[
                    styles.pickerPlaceholder,

                    errors[field] &&
                    styles.inputError
                ]}
                onPress={() =>
                    openPicker(
                        field,
                        title
                    )
                }
            >

                <Text
                    style={
                        checklist[field]
                            ? styles.pickerText
                            : styles.placeholderText
                    }
                >
                    {
                        getPickerLabel(
                            field,
                            checklist[field]
                        )
                    }
                </Text>

                <MaterialIcons
                    name="keyboard-arrow-down"
                    size={24}
                    color="#666"
                />

            </TouchableOpacity>

            {errors[field] && (

                <Text
                    style={
                        styles.errorText
                    }
                >
                    {errors[field]}
                </Text>
            )}

        </View>
    );


    // =====================================================
    // LOADING
    // =====================================================

    if (initialLoading) {

        return (
            <View style={styles.center}>

                <ActivityIndicator
                    size="large"
                    color={PRIMARY}
                />

            </View>
        );
    }


    // =====================================================
    // RENDER
    // =====================================================

    return (

        <ScrollView
            style={styles.container}
            contentContainerStyle={
                styles.content
            }
            keyboardShouldPersistTaps="handled"
        >

            {/* =================================================
                DADOS GERAIS
            ================================================= */}

            <View style={styles.section}>

                <Text style={styles.sectionTitle}>
                    Dados Gerais
                </Text>


                {renderInput(
                    'Cliente',
                    'cliente',
                    {
                        required: true
                    }
                )}


                {renderInput(
                    'TAG',
                    'tag',
                    {
                        required: true
                    }
                )}


                <Text style={styles.label}>
                    Data
                    <Text style={styles.required}>
                        {' *'}
                    </Text>
                </Text>

                <DatePicker
                    value={
                        checklist.data
                    }
                    onDateChange={
                        value =>
                            handleChange(
                                'data',
                                value
                            )
                    }
                    inputStyle={[
                        styles.input,
                        errors.data &&
                        styles.inputError
                    ]}
                />

                {errors.data && (
                    <Text style={styles.errorText}>
                        {errors.data}
                    </Text>
                )}


                <View style={styles.row}>

                    <View
                        style={
                            styles.rowItem
                        }
                    >
                        {renderInput(
                            'REC',
                            'rec',
                            {
                                required: true
                            }
                        )}
                    </View>

                    <View
                        style={
                            styles.rowItem
                        }
                    >
                        {renderInput(
                            'Nota',
                            'nota',
                            {
                                required: true
                            }
                        )}
                    </View>

                </View>


                {renderInput(
                    'Setor',
                    'setor',
                    {
                        required: true
                    }
                )}


                {renderPicker(
                    'Tipo de Serviço',
                    'tipo_serv',
                    'Selecione o tipo de serviço',
                    true
                )}


                {renderPicker(
                    'Unidade',
                    'unidade',
                    'Selecione a unidade',
                    true
                )}

            </View>


            {/* =================================================
                CHECKLIST ESPECÍFICO
            ================================================= */}

            <View style={styles.section}>

                <Text style={styles.sectionTitle}>
                    Checklist Específico
                </Text>


                {renderInput(
                    'Esquema de Pintura',
                    'esquema_pintura',
                    {
                        required: true
                    }
                )}


                {renderInput(
                    'Tratamento',
                    'tratamento',
                    {
                        required: true
                    }
                )}


                {renderInput(
                    'M²',
                    'm2',
                    {
                        required: true,
                        keyboardType:
                            'decimal-pad'
                    }
                )}


                {renderPicker(
                    'Calha Utec Instalada?',
                    'calha_utec',
                    'Calha Utec Instalada?',
                    true
                )}


                {renderPicker(
                    'Guias e Pontos de Contato Pintados?',
                    'guia_pc',
                    'Guias e Pontos de Contato Pintados?',
                    true
                )}


                {renderPicker(
                    'Fita de Proteção Aplicada?',
                    'fita_protec',
                    'Fita de Proteção Aplicada?',
                    true
                )}


                {renderPicker(
                    'Trechos da REC Pintados?',
                    'trecho_rec',
                    'Trechos da REC Pintados?',
                    true
                )}


                {renderPicker(
                    'Elastômero Aplicado?',
                    'elastomero',
                    'Elastômero Aplicado?',
                    true
                )}


                {renderPicker(
                    'Volantes e Caps Pintados?',
                    'volante_caps',
                    'Volantes e Caps Pintados?',
                    true
                )}

            </View>


            {/* =================================================
                ETAPAS
            ================================================= */}

            <View style={styles.section}>

                <View
                    style={
                        styles.sectionHeader
                    }
                >

                    <Text
                        style={
                            styles.sectionTitle
                        }
                    >
                        Etapas
                    </Text>

                    <TouchableOpacity
                        style={
                            styles.addButton
                        }
                        onPress={
                            addEtapa
                        }
                    >

                        <MaterialIcons
                            name="add"
                            size={20}
                            color="#fff"
                        />

                        <Text
                            style={
                                styles.addButtonText
                            }
                        >
                            Adicionar
                        </Text>

                    </TouchableOpacity>

                </View>


                {checklist.checklist.length ===
                0 ? (

                    <Text style={styles.emptyText}>
                        Nenhuma etapa adicionada.
                    </Text>

                ) : (

                    checklist.checklist.map(
                        (
                            item,
                            index
                        ) => (

                            <View
                                key={item.id}
                                style={
                                    styles.childCard
                                }
                            >

                                <View
                                    style={
                                        styles.childHeader
                                    }
                                >

                                    <Text
                                        style={
                                            styles.childTitle
                                        }
                                    >
                                        Etapa {index + 1}
                                    </Text>

                                    <TouchableOpacity
                                        onPress={() =>
                                            removeEtapa(
                                                item.id
                                            )
                                        }
                                    >

                                        <MaterialIcons
                                            name="delete-outline"
                                            size={24}
                                            color="#dc3545"
                                        />

                                    </TouchableOpacity>

                                </View>


                                <Text style={styles.label}>
                                        Data Início
                                    </Text>

                                    <DatePicker
                                        value={
                                            item.data_inicio
                                        }
                                        onDateChange={
                                            value =>
                                                handleEtapaChange(
                                                    item.id,
                                                    'data_inicio',
                                                    value
                                                )
                                        }
                                        inputStyle={
                                            styles.input
                                        }
                                        nullable
                                    />


                                <View style={styles.row}>

                                    <View
                                        style={
                                            styles.rowItem
                                        }
                                    >

                                        <Text
                                            style={
                                                styles.label
                                            }
                                        >
                                            Hora Início
                                        </Text>

                                        <TextInput
                                            style={
                                                styles.input
                                            }
                                            placeholder="08:00"
                                            value={
                                                item.inicio ||
                                                ''
                                            }
                                            onChangeText={
                                                value =>
                                                    handleEtapaChange(
                                                        item.id,
                                                        'inicio',
                                                        value
                                                    )
                                            }
                                        />

                                    </View>


                                    <View
                                        style={
                                            styles.rowItem
                                        }
                                    >

                                        <Text
                                            style={
                                                styles.label
                                            }
                                        >
                                            Hora Término
                                        </Text>

                                        <TextInput
                                            style={
                                                styles.input
                                            }
                                            placeholder="17:00"
                                            value={
                                                item.termino ||
                                                ''
                                            }
                                            onChangeText={
                                                value =>
                                                    handleEtapaChange(
                                                        item.id,
                                                        'termino',
                                                        value
                                                    )
                                            }
                                        />

                                    </View>

                                </View>


                                <Text
                                    style={
                                        styles.label
                                    }
                                >
                                    Tipo do Substrato
                                </Text>

                                <TextInput
                                    style={styles.input}
                                    value={
                                        item.tipo_substrato ||
                                        ''
                                    }
                                    onChangeText={
                                        value =>
                                            handleEtapaChange(
                                                item.id,
                                                'tipo_substrato',
                                                value
                                            )
                                    }
                                />


                                <Text style={styles.label}>
                                    Tinta
                                    <Text
                                        style={
                                            styles.required
                                        }
                                    >
                                        {' *'}
                                    </Text>
                                </Text>

                                <TextInput
                                    style={[
                                        styles.input,

                                        errors[
                                            `tinta_${item.id}`
                                        ] &&
                                        styles.inputError
                                    ]}
                                    value={
                                        item.tinta ||
                                        ''
                                    }
                                    onChangeText={
                                        value =>
                                            handleEtapaChange(
                                                item.id,
                                                'tinta',
                                                value
                                            )
                                    }
                                />

                                {
                                    errors[
                                        `tinta_${item.id}`
                                    ] && (

                                        <Text
                                            style={
                                                styles.errorText
                                            }
                                        >
                                            {
                                                errors[
                                                    `tinta_${item.id}`
                                                ]
                                            }
                                        </Text>
                                    )
                                }


                                <Text
                                    style={
                                        styles.label
                                    }
                                >
                                    Cor Munsell
                                </Text>

                                <TextInput
                                    style={
                                        styles.input
                                    }
                                    value={
                                        item.cor_munsell ||
                                        ''
                                    }
                                    onChangeText={
                                        value =>
                                            handleEtapaChange(
                                                item.id,
                                                'cor_munsell',
                                                value
                                            )
                                    }
                                />


                                <View style={styles.row}>

                                    {[
                                        [
                                            'Lote A',
                                            'lote_a'
                                        ],

                                        [
                                            'Lote B',
                                            'lote_b'
                                        ],

                                        [
                                            'Lote C',
                                            'lote_c'
                                        ]
                                    ].map(
                                        (
                                            [
                                                label,
                                                field
                                            ]
                                        ) => (

                                            <View
                                                key={
                                                    field
                                                }
                                                style={
                                                    styles.rowItem
                                                }
                                            >

                                                <Text
                                                    style={
                                                        styles.label
                                                    }
                                                >
                                                    {label}
                                                </Text>

                                                <TextInput
                                                    style={
                                                        styles.input
                                                    }
                                                    value={
                                                        item[
                                                            field
                                                        ] ||
                                                        ''
                                                    }
                                                    onChangeText={
                                                        value =>
                                                            handleEtapaChange(
                                                                item.id,
                                                                field,
                                                                value
                                                            )
                                                    }
                                                />

                                            </View>
                                        )
                                    )}

                                </View>


                                <Text
                                    style={
                                        styles.label
                                    }
                                >
                                    Fabricante
                                </Text>

                                <TextInput
                                    style={
                                        styles.input
                                    }
                                    value={
                                        item.fabricante ||
                                        ''
                                    }
                                    onChangeText={
                                        value =>
                                            handleEtapaChange(
                                                item.id,
                                                'fabricante',
                                                value
                                            )
                                    }
                                />


                                <Text style={styles.label}>
                                        Data Final
                                    </Text>

                                    <DatePicker
                                        value={
                                            item.data_final
                                        }
                                        onDateChange={
                                            value =>
                                                handleEtapaChange(
                                                    item.id,
                                                    'data_final',
                                                    value
                                                )
                                        }
                                        inputStyle={
                                            styles.input
                                        }
                                        nullable
                                    />


                            </View>
                        )
                    )
                )}

            </View>


            {/* =================================================
                COLABORADORES
            ================================================= */}

            <View style={styles.section}>

                <View style={styles.sectionHeader}>

                    <Text style={styles.sectionTitle}>
                        Colaboradores
                    </Text>

                    <TouchableOpacity
                        style={styles.addButton}
                        onPress={
                            addColaborador
                        }
                    >

                        <MaterialIcons
                            name="add"
                            size={20}
                            color="#fff"
                        />

                        <Text
                            style={
                                styles.addButtonText
                            }
                        >
                            Adicionar
                        </Text>

                    </TouchableOpacity>

                </View>


                {
                    checklist
                        .colaboradorchecklist_set
                        .length === 0 ? (

                        <Text style={styles.emptyText}>
                            Nenhum colaborador adicionado.
                        </Text>

                    ) : (

                        checklist
                            .colaboradorchecklist_set
                            .map(
                                (
                                    item,
                                    index
                                ) => (

                                    <View
                                        key={
                                            item.id
                                        }
                                        style={
                                            styles.colaboradorRow
                                        }
                                    >

                                        <TouchableOpacity
                                            style={[
                                                styles.pickerPlaceholder,
                                                {
                                                    flex: 1
                                                }
                                            ]}
                                            onPress={() =>
                                                openPicker(
                                                    'colaborador',
                                                    `Colaborador ${index + 1}`,
                                                    'colaboradorchecklist_set',
                                                    item.id
                                                )
                                            }
                                        >

                                            <Text
                                                style={
                                                    item.colaborador
                                                        ? styles.pickerText
                                                        : styles.placeholderText
                                                }
                                            >
                                                {
                                                    getPickerLabel(
                                                        'colaborador',
                                                        item.colaborador
                                                    )
                                                }
                                            </Text>

                                            <MaterialIcons
                                                name="keyboard-arrow-down"
                                                size={24}
                                                color="#666"
                                            />

                                        </TouchableOpacity>


                                        <TouchableOpacity
                                            style={
                                                styles.removeButton
                                            }
                                            onPress={() =>
                                                removeColaborador(
                                                    item.id
                                                )
                                            }
                                        >

                                            <MaterialIcons
                                                name="delete-outline"
                                                size={24}
                                                color="#dc3545"
                                            />

                                        </TouchableOpacity>

                                    </View>
                                )
                            )
                    )
                }

            </View>


            {/* =================================================
                FOTOS
            ================================================= */}

            <View style={styles.section}>

                <Text style={styles.sectionTitle}>
                    Fotos
                </Text>

                <PhotoField
                    photos={
                        checklist.checklistcarimbo
                    }
                    onChange={
                        photos =>
                            handleChange(
                                'checklistcarimbo',
                                photos
                            )
                    }
                    accessToken={
                        accessToken
                    }
                    getRemoteUri={
                        getImageUrl
                    }
                />

            </View>


            {/* =================================================
                INSPEÇÃO
            ================================================= */}

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
                            Boolean(
                                checklist.laudo
                            )
                        }
                        onValueChange={
                            value =>
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
                            Boolean(
                                checklist.rnc_n
                            )
                        }
                        onValueChange={
                            value =>
                                handleChange(
                                    'rnc_n',
                                    value
                                )
                        }
                    />

                </View>


                {renderInput(
                    'Observações Finais',
                    'obs_final',
                    {
                        multiline: true
                    }
                )}


                <View style={styles.switchRow}>

                    <Text style={styles.label}>
                        Aprovado
                    </Text>

                    <Switch
                        value={
                            Boolean(
                                checklist.aprovado
                            )
                        }
                        onValueChange={
                            value =>
                                handleChange(
                                    'aprovado',
                                    value
                                )
                        }
                    />

                </View>

            </View>


            {/* =================================================
                SALVAR
            ================================================= */}

            <TouchableOpacity
                style={[
                    styles.saveButton,

                    loading &&
                    styles.disabledButton
                ]}
                disabled={loading}
                onPress={handleSave}
            >

                {
                    loading ? (

                        <ActivityIndicator
                            color="#fff"
                        />

                    ) : (

                        <Text
                            style={
                                styles.saveButtonText
                            }
                        >
                            {
                                isEditing
                                    ? 'Atualizar Checklist'
                                    : 'Salvar Checklist'
                            }
                        </Text>
                    )
                }

            </TouchableOpacity>


            {/* =================================================
                PICKER ÚNICO
            ================================================= */}

            <CustomPickerModal
                visible={
                    pickerState.visible
                }
                title={
                    pickerState.title
                }
                options={
                    pickerState.options
                }
                selectedValue={null}
                onClose={() =>
                    setPickerState(
                        prev => ({
                            ...prev,
                            visible: false,
                        })
                    )
                }
                onSelect={
                    handlePickerSelect
                }
            />

        </ScrollView>
    );
}


// =========================================================
// STYLES
// =========================================================

const styles = StyleSheet.create({

    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },

    content: {
        padding: 12,
        paddingBottom: 40,
    },

    center: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f5f5f5',
    },

    section: {
        backgroundColor: '#fff',
        borderRadius: 8,
        padding: 14,
        marginBottom: 12,

        elevation: 2,

        shadowColor: '#000',
        shadowOpacity: 0.04,
        shadowRadius: 3,
        shadowOffset: {
            width: 0,
            height: 1,
        },
    },

    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },

    sectionTitle: {
        fontSize: 17,
        fontWeight: '700',
        color: PRIMARY,
        marginBottom: 12,
    },

    field: {
        marginBottom: 12,
    },

    label: {
        fontSize: 13,
        fontWeight: '600',
        color: '#444',
        marginBottom: 5,
    },

    required: {
        color: '#dc3545',
    },

    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        backgroundColor: '#fff',
        borderRadius: 6,
        minHeight: 44,
        paddingHorizontal: 10,
        fontSize: 14,
        color: '#333',
    },

    textArea: {
        minHeight: 100,
        textAlignVertical: 'top',
        paddingTop: 10,
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
    },

    row: {
        flexDirection: 'row',
        gap: 8,
    },

    rowItem: {
        flex: 1,
    },

    pickerPlaceholder: {
        minHeight: 44,
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 6,
        paddingHorizontal: 10,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#fff',
    },

    pickerText: {
        color: '#333',
        fontSize: 14,
        flex: 1,
    },

    placeholderText: {
        color: '#999',
        fontSize: 14,
        flex: 1,
    },

    addButton: {
        backgroundColor: PRIMARY,
        borderRadius: 6,
        paddingHorizontal: 10,
        paddingVertical: 7,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
    },

    addButtonText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
    },

    childCard: {
        borderWidth: 1,
        borderColor: '#e2e2e2',
        borderRadius: 8,
        padding: 12,
        marginBottom: 12,
        backgroundColor: '#fafafa',
    },

    childHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },

    childTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: PRIMARY,
    },

    colaboradorRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
        gap: 6,
    },

    removeButton: {
        width: 44,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
    },

    emptyText: {
        textAlign: 'center',
        color: '#888',
        fontSize: 13,
        paddingVertical: 10,
    },

    switchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        minHeight: 48,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        marginBottom: 10,
    },

    saveButton: {
        backgroundColor: PRIMARY,
        height: 52,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 4,
        marginBottom: 20,
    },

    saveButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },

    disabledButton: {
        opacity: 0.6,
    },
});