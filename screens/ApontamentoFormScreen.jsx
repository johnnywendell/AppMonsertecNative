import React, {
    useCallback,
    useEffect,
    useState
} from 'react';

import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ScrollView,
    StyleSheet,
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform
} from 'react-native';

import {
    useNavigation
} from '@react-navigation/native';

import {
    MaterialIcons
} from '@expo/vector-icons';

import CustomPickerModal
    from '../components/CustomPickerModal';

import DatePicker
    from '../components/DatePicker';

import {
    criarApontamento,
    editarApontamento,
    buscarApontamentoPorId
} from '../services/apontamentosService';

import {
    fetchUnidades,
    fetchProjetoCodigos,
    fetchColaboradores
} from '../services/dataService';


const PRIMARY = '#00315c';


// =========================================================
// CHOICES
// =========================================================

const DISCIPLINA_CHOICES = [

    {
        label: 'ANDAIME',
        value: 'AND'
    },

    {
        label: 'PINTURA',
        value: 'PIN'
    },

    {
        label: 'ISOLAMENTO',
        value: 'ISO'
    },
];


const STATUS_CHOICES = [

    {
        label: 'PRESENTE',
        value: 'PRESENTE'
    },

    {
        label: 'FALTA',
        value: 'FALTA'
    },

    {
        label: 'EXAMES',
        value: 'EXAMES'
    },

    {
        label: 'TREINAMENTO',
        value: 'TREINAMENTO'
    },
];


const LIDER_CHOICES = [

    {
        label: 'NÃO',
        value: '0'
    },

    {
        label: 'SIM',
        value: '1'
    },
];


// =========================================================
// HELPERS
// =========================================================

const createLocalId = () =>
    `${Date.now()}-${Math.random()}`;


const getNewEfetivo = () => ({

    _localId:
        createLocalId(),

    colaborador:
        null,

    status:
        null,

    lider:
        '0',
});


const normalizeDate = value => {

    if (!value) {
        return null;
    }

    return String(value)
        .substring(0, 10);
};


// =========================================================
// SCREEN
// =========================================================

export default function ApontamentoFormScreen({
    route
}) {

    const navigation =
        useNavigation();


    const id =
    route.params?.id || null;

    const copyFromId =
        route.params?.copyFromId || null;

    const isEditing =
        !!id;

    const isCopying =
        !!copyFromId;


    // =====================================================
    // ESTADOS
    // =====================================================

    const [
        loading,
        setLoading
    ] = useState(
        isEditing || isCopying
    );


    const [
        saving,
        setSaving
    ] = useState(false);


    const [
        errors,
        setErrors
    ] = useState({});


    // =====================================================
    // FORM
    // =====================================================

    const [
        form,
        setForm
    ] = useState({

        data:
            new Date()
                .toISOString()
                .split('T')[0],

        area:
            null,

        projeto_cod:
            null,

        disciplina:
            null,

        obs:
            '',

        apontamentos: [
            getNewEfetivo()
        ],
    });


    // =====================================================
    // OPÇÕES
    // =====================================================

    const [
        pickerOptions,
        setPickerOptions
    ] = useState({

        area:
            [],

        projeto_cod:
            [],

        colaborador:
            [],

        disciplina:
            DISCIPLINA_CHOICES,

        status:
            STATUS_CHOICES,

        lider:
            LIDER_CHOICES,
    });


    // =====================================================
    // PICKER GENÉRICO
    // =====================================================

    const [
        pickerState,
        setPickerState
    ] = useState({

        visible:
            false,

        fieldKey:
            null,

        listKey:
            null,

        itemId:
            null,

        title:
            '',

        options:
            [],

        searchable: true,
    });


    // =====================================================
    // CARREGAR OPÇÕES
    // =====================================================

    const loadPickerOptions =
        useCallback(async () => {

            try {

                const [
                    unidades,
                    projetos,
                    colaboradores
                ] = await Promise.all([

                    fetchUnidades(),

                    fetchProjetoCodigos(),

                    fetchColaboradores(),
                ]);


                setPickerOptions(
                    prev => ({

                        ...prev,

                        // fetchUnidades já retorna:
                        // [{ label, value }]
                        area:
                            unidades || [],

                        // fetchProjetoCodigos já retorna:
                        // [{ label, value }]
                        projeto_cod:
                            projetos || [],

                        // fetchColaboradores já retorna:
                        // [{ label, value }]
                        colaborador:
                            colaboradores || [],
                    })
                );


            } catch (error) {

                console.error(
                    'Erro carregando opções:',
                    error
                );


                Alert.alert(
                    'Erro',
                    'Não foi possível carregar as opções do formulário.'
                );
            }

        }, []);


    // =====================================================
    // CARREGAMENTO
    // =====================================================
    useEffect(() => {

        const load = async () => {

            try {

                setLoading(true);


                // -----------------------------------------
                // OPTIONS
                // -----------------------------------------

                await loadPickerOptions();


                // -----------------------------------------
                // NOVO APONTAMENTO EM BRANCO
                // -----------------------------------------

                if (
                    !isEditing &&
                    !isCopying
                ) {
                    return;
                }


                // -----------------------------------------
                // DEFINE QUAL APONTAMENTO SERÁ CARREGADO
                // -----------------------------------------

                const sourceId =
                    isEditing
                        ? id
                        : copyFromId;


                // -----------------------------------------
                // BUSCA APONTAMENTO
                // -----------------------------------------

                const data =
                    await buscarApontamentoPorId(
                        sourceId
                    );


                const filhos =
                    data.apontamentos || [];


                // -----------------------------------------
                // PREENCHE FORM
                // -----------------------------------------

                setForm({

                    // Se for cópia:
                    // usa a data de hoje.
                    //
                    // Se for edição:
                    // mantém a data original.

                    data:
                        isCopying
                            ? new Date()
                                .toISOString()
                                .split('T')[0]

                            : normalizeDate(
                                data.data
                            ) ||
                            new Date()
                                .toISOString()
                                .split('T')[0],


                    area:
                        data.area?.id ??
                        data.area ??
                        null,


                    projeto_cod:
                        data.projeto_cod?.id ??
                        data.projeto_cod ??
                        null,


                    disciplina:
                        data.disciplina ||
                        null,


                    obs:
                        data.obs ||
                        '',


                    apontamentos:
                        filhos.length > 0

                            ? filhos.map(
                                (
                                    item,
                                    index
                                ) => ({

                                    // ID apenas local para React
                                    _localId:
                                        `${isCopying ? 'copy' : 'server'}-${item.id ?? index}-${Date.now()}-${index}`,


                                    colaborador:
                                        item.colaborador?.id ??
                                        item.colaborador ??
                                        null,


                                    // Na cópia:
                                    // todos os status começam vazios.

                                    status:
                                        isCopying
                                            ? null
                                            : item.status ||
                                            null,


                                    // Líder é mantido.
                                    lider:
                                        normalizeLider(
                                            item.lider
                                        ),
                                })
                            )

                            : [
                                getNewEfetivo()
                            ],
                });


            } catch (error) {

                console.error(
                    'Erro carregando apontamento:',
                    error.response?.data ||
                    error.message
                );


                Alert.alert(
                    'Erro',
                    isCopying
                        ? 'Não foi possível carregar o apontamento para cópia.'
                        : 'Não foi possível carregar o apontamento.',
                    [
                        {
                            text: 'OK',

                            onPress: () =>
                                navigation.goBack()
                        }
                    ]
                );


            } finally {

                setLoading(false);
            }
        };


        load();

    }, [
        id,
        copyFromId,
        isEditing,
        isCopying,
        loadPickerOptions,
        navigation
    ]);


    // =====================================================
    // NORMALIZAÇÃO LÍDER
    // =====================================================

    function normalizeLider(value) {

        if (
            value === 1 ||
            value === '1' 

        ) {
            return '1';
        }


        return '0';
    }


    // =====================================================
    // CAMPOS DO PAI
    // =====================================================

    const handleChange = (
        key,
        value
    ) => {

        setForm(
            prev => ({

                ...prev,

                [key]:
                    value,
            })
        );


        if (errors[key]) {

            setErrors(
                prev => ({

                    ...prev,

                    [key]:
                        null,
                })
            );
        }
    };


    // =====================================================
    // FILHOS
    // =====================================================

    const handleEfetivoChange = (
        itemId,
        field,
        value
    ) => {

        setForm(
            prev => ({

                ...prev,

                apontamentos:
                    prev.apontamentos.map(
                        item =>

                            item._localId === itemId

                                ? {
                                    ...item,

                                    [field]:
                                        value,
                                }

                                : item
                    ),
            })
        );


        const errorKey =
            `${itemId}_${field}`;


        if (
            errors[
                errorKey
            ]
        ) {

            setErrors(
                prev => ({

                    ...prev,

                    [errorKey]:
                        null,
                })
            );
        }
    };


    const adicionarEfetivo = () => {

        setForm(
            prev => ({

                ...prev,

                apontamentos: [

                    ...prev.apontamentos,

                    getNewEfetivo(),
                ],
            })
        );
    };


    const removerEfetivo =
        itemId => {

            if (
                form.apontamentos.length <=
                1
            ) {

                Alert.alert(
                    'Atenção',
                    'O apontamento precisa possuir pelo menos um colaborador.'
                );

                return;
            }


            setForm(
                prev => ({

                    ...prev,

                    apontamentos:
                        prev.apontamentos.filter(
                            item =>
                                item._localId !==
                                itemId
                        ),
                })
            );
        };


    // =====================================================
    // PICKER
    // =====================================================

    const openPicker = (
        fieldKey,
        title,
        listKey = null,
        itemId = null,
        searchable = true
    ) => {

        setPickerState({

            visible:
                true,

            fieldKey,

            listKey,

            itemId,

            title,

            options:
                pickerOptions[
                    fieldKey
                ] || [],

            searchable,
        });
    };

    const closePicker = () => {

        setPickerState(
            prev => ({

                ...prev,

                visible:
                    false,
            })
        );
    };


    const handlePickerSelect =
        value => {

            const {
                fieldKey,
                listKey,
                itemId
            } =
                pickerState;


            if (
                listKey ===
                'apontamentos'
            ) {

                handleEfetivoChange(
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


        const options =
            pickerOptions[
                optionKey
            ] || [];


        const selected =
            options.find(
                option =>
                    option.value ==
                    value
            );


        return selected

            ? String(
                selected.label
            )

            : 'Selecione...';
    };


    // =====================================================
    // VALIDAÇÃO
    // =====================================================

    const validate = () => {

        const newErrors = {};


        if (!form.data) {

            newErrors.data =
                'Informe a data.';
        }


        if (!form.area) {

            newErrors.area =
                'Selecione a unidade.';
        }


        if (!form.projeto_cod) {

            newErrors.projeto_cod =
                'Selecione o projeto.';
        }


        if (!form.disciplina) {

            newErrors.disciplina =
                'Selecione a disciplina.';
        }


        form.apontamentos.forEach(
            (
                item,
                index
            ) => {

                if (
                    !item.colaborador
                ) {

                    newErrors[
                        `${item._localId}_colaborador`
                    ] =
                        `Selecione o colaborador ${index + 1}.`;
                }


                if (
                    !item.status
                ) {

                    newErrors[
                        `${item._localId}_status`
                    ] =
                        `Selecione o status do colaborador ${index + 1}.`;
                }
            }
        );


        setErrors(
            newErrors
        );


        return (
            Object.keys(
                newErrors
            ).length === 0
        );
    };


    // =====================================================
    // SALVAR
    // =====================================================

    const handleSave =
        async () => {

            if (!validate()) {

                Alert.alert(
                    'Atenção',
                    'Preencha os campos obrigatórios.'
                );

                return;
            }


            const dados = {

                data:
                    form.data,

                area:
                    form.area,

                projeto_cod:
                    form.projeto_cod,

                disciplina:
                    form.disciplina,

                obs:
                    form.obs,

                apontamentos:
                    form.apontamentos.map(
                        item => ({

                            colaborador:
                                item.colaborador,

                            status:
                                item.status,

                            lider:
                                item.lider,
                        })
                    ),
            };


            try {

                setSaving(true);


                // -----------------------------------------
                // EDITAR
                // -----------------------------------------

                if (isEditing) {

                    await editarApontamento(
                        id,
                        dados
                    );


                    Alert.alert(
                        'Sucesso',
                        'Apontamento atualizado com sucesso.',
                        [
                            {
                                text: 'OK',

                                onPress: () =>
                                    navigation.goBack()
                            }
                        ]
                    );


                    return;
                }


                // -----------------------------------------
                // CRIAR
                // -----------------------------------------

                const result =
                    await criarApontamento(
                        dados
                    );


                if (
                    result?.offline
                ) {

                    Alert.alert(
                        'Salvo',
                        'Apontamento salvo e aguardando sincronização.',
                        [
                            {
                                text: 'OK',

                                onPress: () =>
                                    navigation.goBack()
                            }
                        ]
                    );


                    return;
                }


                Alert.alert(
                    'Sucesso',
                    'Apontamento criado com sucesso.',
                    [
                        {
                            text: 'OK',

                            onPress: () =>
                                navigation.goBack()
                        }
                    ]
                );


            } catch (error) {

                console.error(
                    'Erro salvando apontamento:',
                    error.response?.data ||
                    error.message
                );


                let mensagem =
                    error.message ||
                    'Erro ao salvar apontamento.';


                if (
                    error.response?.data
                ) {

                    const apiData =
                        error.response.data;


                    if (
                        typeof apiData ===
                        'string'
                    ) {

                        mensagem =
                            apiData;

                    } else {

                        mensagem =
                            JSON.stringify(
                                apiData
                            );
                    }
                }


                Alert.alert(
                    'Erro',
                    mensagem
                );


            } finally {

                setSaving(false);
            }
        };


    // =====================================================
    // LOADING
    // =====================================================

    if (loading) {

        return (

            <View
                style={
                    styles.loadingContainer
                }
            >

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

        <KeyboardAvoidingView

            style={{
                flex: 1
            }}

            behavior={
                Platform.OS === 'ios'
                    ? 'padding'
                    : undefined
            }
        >

            <ScrollView

                style={
                    styles.container
                }

                contentContainerStyle={
                    styles.content
                }

                keyboardShouldPersistTaps="handled"
            >

                {/* ===================================== */}
                {/* DADOS GERAIS */}
                {/* ===================================== */}
                {
                    isEditing &&
                    (
                        <TouchableOpacity

                            style={
                                styles.copyButton
                            }

                            onPress={() => {

                                navigation.push(
                                    'ApontamentoForm',
                                    {
                                        copyFromId:
                                            id
                                    }
                                );

                            }}
                        >

                            <MaterialIcons
                                name="content-copy"
                                size={20}
                                color="#00315c"
                            />


                            <Text
                                style={
                                    styles.copyButtonText
                                }
                            >
                                Copiar apontamento
                            </Text>

                        </TouchableOpacity>
                    )
                }
                <Text
                    style={
                        styles.sectionTitle
                    }
                >
                    Dados do Apontamento
                </Text>


                {/* DATA */}

                <Text
                    style={
                        styles.label
                    }
                >
                    Data
                    <Text
                        style={
                            styles.required
                        }
                    >
                        {' *'}
                    </Text>
                </Text>


                <DatePicker

                    value={
                        form.data
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


                {
                    errors.data &&
                    (
                        <Text
                            style={
                                styles.errorText
                            }
                        >
                            {errors.data}
                        </Text>
                    )
                }


                {/* UNIDADE / ÁREA */}

                <Text
                    style={
                        styles.label
                    }
                >
                    Unidade
                    <Text
                        style={
                            styles.required
                        }
                    >
                        {' *'}
                    </Text>
                </Text>


                <TouchableOpacity

                    style={[
                        styles.input,
                        styles.pickerInput,

                        errors.area &&
                        styles.inputError
                    ]}

                    onPress={() =>
                        openPicker(
                            'area',
                            'Selecione uma unidade'
                        )
                    }
                >

                    <Text
                        style={
                            form.area
                                ? styles.selectedText
                                : styles.placeholderText
                        }
                    >

                        {getPickerLabel(
                            'area',
                            form.area
                        )}

                    </Text>


                    <MaterialIcons
                        name="keyboard-arrow-down"
                        size={24}
                        color="#777"
                    />

                </TouchableOpacity>


                {
                    errors.area &&
                    (
                        <Text
                            style={
                                styles.errorText
                            }
                        >
                            {errors.area}
                        </Text>
                    )
                }


                {/* DISCIPLINA */}

                <Text
                    style={
                        styles.label
                    }
                >
                    Disciplina
                    <Text
                        style={
                            styles.required
                        }
                    >
                        {' *'}
                    </Text>
                </Text>


                <TouchableOpacity

                    style={[
                        styles.input,
                        styles.pickerInput,

                        errors.disciplina &&
                        styles.inputError
                    ]}

                    onPress={() =>
                        openPicker(
                            'disciplina',
                            'Selecione uma disciplina'
                        )
                    }
                >

                    <Text
                        style={
                            form.disciplina
                                ? styles.selectedText
                                : styles.placeholderText
                        }
                    >

                        {getPickerLabel(
                            'disciplina',
                            form.disciplina
                        )}

                    </Text>


                    <MaterialIcons
                        name="keyboard-arrow-down"
                        size={24}
                        color="#777"
                    />

                </TouchableOpacity>


                {
                    errors.disciplina &&
                    (
                        <Text
                            style={
                                styles.errorText
                            }
                        >
                            {errors.disciplina}
                        </Text>
                    )
                }


                {/* PROJETO */}

                <Text
                    style={
                        styles.label
                    }
                >
                    Código do Projeto
                    <Text
                        style={
                            styles.required
                        }
                    >
                        {' *'}
                    </Text>
                </Text>


                <TouchableOpacity

                    style={[
                        styles.input,
                        styles.pickerInput,

                        errors.projeto_cod &&
                        styles.inputError
                    ]}

                    onPress={() =>
                        openPicker(
                            'projeto_cod',
                            'Selecione um projeto'
                        )
                    }
                >

                    <Text
                        style={
                            form.projeto_cod
                                ? styles.selectedText
                                : styles.placeholderText
                        }
                    >

                        {getPickerLabel(
                            'projeto_cod',
                            form.projeto_cod
                        )}

                    </Text>


                    <MaterialIcons
                        name="keyboard-arrow-down"
                        size={24}
                        color="#777"
                    />

                </TouchableOpacity>


                {
                    errors.projeto_cod &&
                    (
                        <Text
                            style={
                                styles.errorText
                            }
                        >
                            {errors.projeto_cod}
                        </Text>
                    )
                }


                {/* OBSERVAÇÕES */}

                <Text
                    style={
                        styles.label
                    }
                >
                    Observações
                </Text>


                <TextInput

                    style={[
                        styles.input,
                        styles.textArea
                    ]}

                    value={
                        form.obs
                    }

                    onChangeText={
                        value =>
                            handleChange(
                                'obs',
                                value
                            )
                    }

                    placeholder="Digite observações"

                    placeholderTextColor="#999"

                    multiline

                    maxLength={255}
                />


                {/* ===================================== */}
                {/* EFETIVO */}
                {/* ===================================== */}

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
                        Efetivo
                    </Text>


                    <TouchableOpacity

                        style={
                            styles.addButtonSmall
                        }

                        onPress={
                            adicionarEfetivo
                        }
                    >

                        <MaterialIcons
                            name="add"
                            size={20}
                            color="#fff"
                        />

                        <Text
                            style={
                                styles.addButtonSmallText
                            }
                        >
                            Adicionar
                        </Text>

                    </TouchableOpacity>

                </View>


                {
                    form.apontamentos.map(
                        (
                            item,
                            index
                        ) => (

                            <View

                                key={
                                    item._localId
                                }

                                style={
                                    styles.efetivoCard
                                }
                            >

                                <View
                                    style={
                                        styles.cardHeader
                                    }
                                >

                                    <Text
                                        style={
                                            styles.cardTitle
                                        }
                                    >
                                        Colaborador {index + 1}
                                    </Text>


                                    {
                                        form.apontamentos.length >
                                        1 &&
                                        (
                                            <TouchableOpacity

                                                onPress={() =>
                                                    removerEfetivo(
                                                        item._localId
                                                    )
                                                }
                                            >

                                                <MaterialIcons
                                                    name="delete-outline"
                                                    size={25}
                                                    color="#c62828"
                                                />

                                            </TouchableOpacity>
                                        )
                                    }

                                </View>


                                {/* COLABORADOR */}

                                <Text
                                    style={
                                        styles.label
                                    }
                                >
                                    Colaborador
                                    <Text
                                        style={
                                            styles.required
                                        }
                                    >
                                        {' *'}
                                    </Text>
                                </Text>


                                <TouchableOpacity

                                    style={[
                                        styles.input,
                                        styles.pickerInput,

                                        errors[
                                            `${item._localId}_colaborador`
                                        ] &&
                                        styles.inputError
                                    ]}

                                    onPress={() =>
                                        openPicker(
                                            'colaborador',
                                            'Selecione um colaborador',
                                            'apontamentos',
                                            item._localId,
                                            true
                                        )
                                    }
                                >

                                    <Text
                                        style={
                                            item.colaborador
                                                ? styles.selectedText
                                                : styles.placeholderText
                                        }
                                    >

                                        {getPickerLabel(
                                            'colaborador',
                                            item.colaborador
                                        )}

                                    </Text>


                                    <MaterialIcons
                                        name="keyboard-arrow-down"
                                        size={24}
                                        color="#777"
                                    />

                                </TouchableOpacity>


                                {
                                    errors[
                                        `${item._localId}_colaborador`
                                    ] &&
                                    (
                                        <Text
                                            style={
                                                styles.errorText
                                            }
                                        >
                                            {
                                                errors[
                                                    `${item._localId}_colaborador`
                                                ]
                                            }
                                        </Text>
                                    )
                                }


                                {/* STATUS */}

                                <Text
                                    style={
                                        styles.label
                                    }
                                >
                                    Status
                                    <Text
                                        style={
                                            styles.required
                                        }
                                    >
                                        {' *'}
                                    </Text>
                                </Text>


                                <TouchableOpacity

                                    style={[
                                        styles.input,
                                        styles.pickerInput,

                                        errors[
                                            `${item._localId}_status`
                                        ] &&
                                        styles.inputError
                                    ]}

                                    onPress={() =>
                                        openPicker(
                                            'status',
                                            'Selecione um status',
                                            'apontamentos',
                                            item._localId
                                        )
                                    }
                                >

                                    <Text
                                        style={
                                            item.status
                                                ? styles.selectedText
                                                : styles.placeholderText
                                        }
                                    >

                                        {getPickerLabel(
                                            'status',
                                            item.status
                                        )}

                                    </Text>


                                    <MaterialIcons
                                        name="keyboard-arrow-down"
                                        size={24}
                                        color="#777"
                                    />

                                </TouchableOpacity>


                                {
                                    errors[
                                        `${item._localId}_status`
                                    ] &&
                                    (
                                        <Text
                                            style={
                                                styles.errorText
                                            }
                                        >
                                            {
                                                errors[
                                                    `${item._localId}_status`
                                                ]
                                            }
                                        </Text>
                                    )
                                }


                                {/* LÍDER */}

                                <Text
                                    style={
                                        styles.label
                                    }
                                >
                                    Líder
                                </Text>


                                <TouchableOpacity

                                    style={[
                                        styles.input,
                                        styles.pickerInput
                                    ]}

                                    onPress={() =>
                                        openPicker(
                                            'lider',
                                            'É líder?',
                                            'apontamentos',
                                            item._localId
                                        )
                                    }
                                >

                                    <Text
                                        style={
                                            styles.selectedText
                                        }
                                    >

                                        {getPickerLabel(
                                            'lider',
                                            item.lider
                                        )}

                                    </Text>


                                    <MaterialIcons
                                        name="keyboard-arrow-down"
                                        size={24}
                                        color="#777"
                                    />

                                </TouchableOpacity>

                            </View>
                        )
                    )
                }


                {/* ===================================== */}
                {/* SALVAR */}
                {/* ===================================== */}

                <TouchableOpacity

                    style={[
                        styles.saveButton,

                        saving &&
                        styles.saveButtonDisabled
                    ]}

                    onPress={
                        handleSave
                    }

                    disabled={
                        saving
                    }
                >

                    {
                        saving
                            ? (

                                <ActivityIndicator
                                    color="#fff"
                                />

                            )
                            : (

                                <>

                                    <MaterialIcons
                                        name="save"
                                        size={22}
                                        color="#fff"
                                    />

                                    <Text
                                        style={
                                            styles.saveButtonText
                                        }
                                    >
                                        {
                                            isEditing
                                                ? 'Salvar Alterações'
                                                : 'Salvar Apontamento'
                                        }
                                    </Text>

                                </>
                            )
                    }

                </TouchableOpacity>


                {/* ===================================== */}
                {/* PICKER */}
                {/* ===================================== */}

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

                    searchable={
                        pickerState.searchable
                    }


                    selectedValue={

                        pickerState.listKey ===
                        'apontamentos'

                            ? form.apontamentos.find(
                                item =>
                                    item._localId ===
                                    pickerState.itemId
                            )?.[
                                pickerState.fieldKey
                            ]

                            : form[
                                pickerState.fieldKey
                            ]
                    }

                    onSelect={
                        handlePickerSelect
                    }

                    onClose={
                        closePicker
                    }
                />

            </ScrollView>

        </KeyboardAvoidingView>
    );
}


// =========================================================
// STYLES
// =========================================================

const styles =
    StyleSheet.create({

        container: {

            flex: 1,

            backgroundColor:
                '#f5f5f5',
        },


        content: {

            padding: 16,

            paddingBottom: 50,
        },


        loadingContainer: {

            flex: 1,

            justifyContent:
                'center',

            alignItems:
                'center',

            backgroundColor:
                '#f5f5f5',
        },


        sectionTitle: {

            fontSize: 18,

            fontWeight: '700',

            color: PRIMARY,

            marginBottom: 14,

            marginTop: 8,
        },


        sectionHeader: {

            flexDirection: 'row',

            justifyContent:
                'space-between',

            alignItems: 'center',

            marginTop: 15,
        },


        label: {

            fontSize: 13,

            fontWeight: '600',

            color: '#444',

            marginBottom: 6,

            marginTop: 10,
        },


        required: {

            color: '#c62828',
        },


        input: {

            minHeight: 48,

            backgroundColor: '#fff',

            borderWidth: 1,

            borderColor: '#d9d9d9',

            borderRadius: 8,

            paddingHorizontal: 12,

            justifyContent:
                'center',

            fontSize: 14,

            color: '#333',
        },


        pickerInput: {

            flexDirection: 'row',

            justifyContent:
                'space-between',

            alignItems: 'center',
        },


        inputError: {

            borderColor:
                '#c62828',
        },


        errorText: {

            color: '#c62828',

            fontSize: 12,

            marginTop: 4,
        },


        selectedText: {

            flex: 1,

            color: '#333',

            fontSize: 14,
        },


        placeholderText: {

            flex: 1,

            color: '#999',

            fontSize: 14,
        },


        textArea: {

            minHeight: 90,

            paddingTop: 12,

            textAlignVertical:
                'top',
        },


        efetivoCard: {

            backgroundColor:
                '#fff',

            borderRadius: 10,

            padding: 14,

            marginBottom: 14,

            borderWidth: 1,

            borderColor:
                '#e3e3e3',
        },


        cardHeader: {

            flexDirection: 'row',

            alignItems: 'center',

            justifyContent:
                'space-between',

            marginBottom: 5,
        },


        cardTitle: {

            fontSize: 15,

            fontWeight: '700',

            color: PRIMARY,
        },


        addButtonSmall: {

            flexDirection: 'row',

            alignItems: 'center',

            backgroundColor:
                PRIMARY,

            paddingHorizontal: 12,

            paddingVertical: 8,

            borderRadius: 7,
        },


        addButtonSmallText: {

            marginLeft: 4,

            color: '#fff',

            fontSize: 13,

            fontWeight: '600',
        },


        saveButton: {

            marginTop: 22,

            minHeight: 52,

            borderRadius: 8,

            backgroundColor:
                PRIMARY,

            flexDirection: 'row',

            justifyContent:
                'center',

            alignItems: 'center',
        },


        saveButtonDisabled: {

            opacity: 0.6,
        },


        saveButtonText: {

            color: '#fff',

            fontSize: 16,

            fontWeight: '700',

            marginLeft: 8,
        },
        copyButton: {

            flexDirection:
                'row',

            alignItems:
                'center',

            justifyContent:
                'center',

            backgroundColor:
                '#eef4f8',

            borderWidth:
                1,

            borderColor:
                '#00315c',

            borderRadius:
                8,

            paddingVertical:
                12,

            paddingHorizontal:
                15,

            marginBottom:
                15,
        },


        copyButtonText: {

            color:
                '#00315c',

            fontSize:
                14,

            fontWeight:
                '700',

            marginLeft:
                7,
        },
    });