import React, { useState, useEffect, useLayoutEffect, useCallback } from 'react';
import { 
    View, Text, TextInput, TouchableOpacity, ScrollView, 
    StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, Alert 
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';

import CustomPickerModal from '../../components/CustomPickerModal'; 
// Supondo que rdcService está no mesmo nível que dataService
import { salvarRdcLocal, buscarRdc } from '../../services/rdcService'; 

// Importa todos os novos fetches e choices mock
import { 
    fetchSolicitantes, fetchAprovadores, fetchUnidades, fetchASOptions, 
    fetchProjetoCodigos, fetchColaboradores, fetchItemContratoOptions,
    MOCK_OPTIONS_CHOICES 
} from '../../services/dataService'; 

// --- Choices Específicas Solicitadas (RDC Filho) ---

const MATERIAL_CHOICES = [
    { label: 'Perfil I', value: 'perfil_I' },
    { label: 'Perfil H', value: 'perfil_H' },
    { label: 'Perfil U', value: 'perfil_U' },
    { label: 'Perfil L', value: 'perfil_L' },
    { label: 'Barra Chata', value: 'barra_chata' },
    { label: 'Tubulação', value: 'tubulacao' },
    { label: 'Acessório T', value: 'acess_T' },
    { label: 'Acessório FLG', value: 'acess_FLG' },
    { label: 'Acessório RED', value: 'acess_RED' },
    { label: 'Acessório CV90', value: 'acess_CV90' },
    { label: 'Acessório CV45', value: 'acess_CV45' },
    { label: 'Acessório VV', value: 'acess_VV' },
    { label: 'Acessório VVC', value: 'acess_VVC' },
    { label: 'Acessório CAP', value: 'acess_CAP' },
    { label: 'Boleado', value: 'boleado' },
    { label: 'Carretel', value: 'carretel' },
    { label: 'Cubo', value: 'cubo' },
    { label: 'Cone', value: 'cone' },
    { label: 'Janela', value: 'janela' },
];

const INT_EXT_CHOICES = [
    { label: 'INTERNO', value: 'INT' },
    { label: 'EXTERNO', value: 'EXT' },
];

// --- NOVAS CHOICES ADICIONADAS (RDC Pai) ---
const TIPO_RDC_CHOICES = [
    { label: 'PARADA', value: 'PARADA' },
    { label: 'PACOTE', value: 'PACOTE' },
    { label: 'ROTINA', value: 'ROTINA' },
    { label: 'PROJETO', value: 'PROJETO' },
];

const DISCIPLINA_RDC_CHOICES = [
    { label: 'PINTURA', value: 'PINTURA' },
    { label: 'ANDAIME', value: 'ANDAIME' },
    { label: 'ISOLAMENTO', value: 'ISOLAMENTO' },
];

const CLIMA_RDC_CHOICES = [
    { label: 'BOM', value: 'BOM' },
    { label: 'NUBLADO', value: 'NUBLADO' },
    { label: 'CHUVOSO', value: 'CHUVOSO' },
];

// MOCK para BM, pois o fetch não está definido neste arquivo



// --- Helpers de Itens (Atualizado: solicita_pt agora é String para tempo) ---

const getNewServico = () => ({ 
    id: Date.now(), descricao: '', ordem: '', n_pt: '', 
    solicita_pt: '08:00', // String para TimeInput
    inicio_pt: '07:05', termino_pt: '17:18',
});

const getNewHH = () => ({ 
    id: Date.now(), item_contrato: null, colaborador: null, tipo_serv: null, tag: '', 
    inicio: '07:05', // Adicionado
    termino: '17:18', // Adicionado
    total: '9.22', 
});

const getNewPin = () => ({ 
    id: Date.now(), item_contrato: null, descricao: '', tag: '', material: null, 
    polegada: '0', m_quantidade: '0', m2: '0', raio: '0', largura: '0', 
    altura: '0', comprimento: '0', lados: '0',
});
// -----------------------------------------------------------------


export default function RdcFormScreen({ route }) {
    const navigation = useNavigation();
    const id = route.params?.id || null; 
    const isEditing = !!id;

    const [loading, setLoading] = useState(isEditing);
    
    // --- NOVO ESTADO: Armazena as opções carregadas via fetch e mocks ---
    const [pickerOptions, setPickerOptions] = useState({
        unidade: [], solicitante: [], aprovador: [], AS: [], projeto_cod: [],
        colaborador: [], item_contrato: [], 
        
        // Mocks e Choices solicitadas
        ...MOCK_OPTIONS_CHOICES,
        material_pin: MATERIAL_CHOICES, // Adicionado lista de materiais PIN
        tipo_serv_hh: INT_EXT_CHOICES,  // Adicionado lista INT/EXT para HH
        
        // NOVOS - Choices Solicitadas (RDC Pai)
        tipo_rdc: TIPO_RDC_CHOICES,
        disciplina_rdc: DISCIPLINA_RDC_CHOICES,
        clima_rdc: CLIMA_RDC_CHOICES,
    });
    // -----------------------------------------------------------

    const [rdc, setRdc] = useState({
        // Campos de Seleção (FKs/Choices) - Armazenam apenas o ID
        unidade: null, solicitante: null, aprovador: null, 
        tipo: 'MONTAGEM', disciplina: null, // Campos de Choices no Parent
        AS: null, 
        projeto_cod: null, 
        clima: null, // Campo de Choices no Parent
        
        // Campos de Input/Outros
        data: new Date().toISOString().split('T')[0], // Input Data
        local: '', // Input Text
        obs: '', // Input Text (TextArea)
        encarregado: '', // Input Text
        inicio: '07:00', // Input Time
        termino: '17:00', // Input Time
        aprovado: false, // Toggle
        doc: '', // Input Text
        
        // Arrays de filhos
        rdcsserv: [getNewServico()],
        rdcshh: [getNewHH()],
        rdcspupin: [getNewPin()],
    });

    const [pickerState, setPickerState] = useState({
        visible: false,
        fieldKey: null,
        listKey: null,
        itemId: null,
        title: '',
        options: [],
    });

    // -----------------------------------------------------------
    // --- FUNÇÃO PARA CARREGAR AS OPÇÕES (MANTIDA) ---
    // -----------------------------------------------------------
    const loadAllPickerOptions = useCallback(async () => {
        try {
            const [
                solicitantes, aprovadores, unidades, asOptions, projetos,
                colaboradores, itemContrato
            ] = await Promise.all([
                fetchSolicitantes(),
                fetchAprovadores(),
                fetchUnidades(),
                fetchASOptions(),
                fetchProjetoCodigos(),
                fetchColaboradores(),
                fetchItemContratoOptions()
            ]);

            setPickerOptions(prev => ({
                ...prev,
                solicitante: solicitantes,
                aprovador: aprovadores,
                unidade: unidades,
                AS: asOptions,
                projeto_cod: projetos,
                colaborador: colaboradores,
                item_contrato: itemContrato,
                // MOCK_OPTIONS_CHOICES e as novas choices já estão definidas na inicialização do estado.
            }));
        } catch (error) {
            console.error("Falha ao carregar opções de seleção:", error);
            Alert.alert("Erro de Carga", "Não foi possível carregar algumas opções de seleção do servidor.");
        }
    }, []);

    // -----------------------------------------------------------
    // --- FUNÇÕES DE MANIPULAÇÃO DE ITENS FILHOS ---
    // -----------------------------------------------------------
    
    const addItem = (listKey, getNewItem) => {
        setRdc(prev => ({
            ...prev,
            [listKey]: [...prev[listKey], getNewItem()],
        }));
    };

    const removeItem = (listKey, idToRemove) => {
        Alert.alert(
            "Confirmação",
            "Tem certeza que deseja remover este item?",
            [
                { text: "Cancelar", style: "cancel" },
                { 
                    text: "Remover", 
                    onPress: () => {
                        setRdc(prev => ({
                            ...prev,
                            [listKey]: prev[listKey].filter(item => item.id !== idToRemove),
                        }));
                    },
                    style: "destructive"
                }
            ],
            { cancelable: true }
        );
    };

    // -----------------------------------------------------------
    // --- FUNÇÃO DE SALVAMENTO ---
    // -----------------------------------------------------------

    const handleSave = async () => {
        // Validação básica (adicionar validações mais robustas aqui)
        if (!rdc.solicitante || !rdc.unidade) {
            Alert.alert("Erro", "Campos Solicitante e Unidade são obrigatórios.");
            return;
        }

        setLoading(true);
        try {
            // Prepara os dados para salvar (limpeza/conversão de tipos se necessário)
            const payload = { 
                ...rdc,
                // Garantir que os campos de hora sejam strings ou null
                rdcsserv: rdc.rdcsserv.map(serv => ({
                    ...serv,
                    solicita_pt: serv.solicita_pt || null,
                    inicio_pt: serv.inicio_pt || null,
                    termino_pt: serv.termino_pt || null,
                    // Garante que o número seja Number ou null
                    ordem: serv.ordem && !isNaN(Number(serv.ordem)) ? Number(serv.ordem) : null,
                })),
                // Lidar com campos numéricos que vieram como strings
                rdcshh: rdc.rdcshh.map(hh => ({
                    ...hh,
                    total: hh.total && !isNaN(Number(hh.total)) ? Number(hh.total) : null,
                })),
                rdcspupin: rdc.rdcspupin.map(pin => ({
                    ...pin,
                    // Garante que o número seja Number ou null
                    polegada: pin.polegada && !isNaN(Number(pin.polegada)) ? Number(pin.polegada) : null,
                    m_quantidade: pin.m_quantidade && !isNaN(Number(pin.m_quantidade)) ? Number(pin.m_quantidade) : null,
                    m2: pin.m2 && !isNaN(Number(pin.m2)) ? Number(pin.m2) : null,
                    raio: pin.raio && !isNaN(Number(pin.raio)) ? Number(pin.raio) : null,
                    largura: pin.largura && !isNaN(Number(pin.largura)) ? Number(pin.largura) : null,
                    altura: pin.altura && !isNaN(Number(pin.altura)) ? Number(pin.altura) : null,
                    comprimento: pin.comprimento && !isNaN(Number(pin.comprimento)) ? Number(pin.comprimento) : null,
                    lados: pin.lados && !isNaN(Number(pin.lados)) ? Number(pin.lados) : null,
                })),
                // Exemplo de como limpar campos vazios para evitar erros de tipo no backend
                unidade: rdc.unidade || null, 
                aprovador: rdc.aprovador || null, 
                // etc.
            };

            await salvarRdcLocal(payload); // Use a função para salvar local/API
            Alert.alert("Sucesso", `RDC ${isEditing ? 'atualizado' : 'salvo'} com sucesso!`);
            navigation.goBack(); // Retorna para a lista após salvar
        } catch (error) {
            console.error("Erro ao salvar RDC:", error);
            Alert.alert("Erro", "Falha ao salvar o RDC. Tente novamente.");
        } finally {
            setLoading(false);
        }
    };

    // -----------------------------------------------------------
    // --- EFEITO DE CARREGAMENTO (MANTIDO) ---
    // -----------------------------------------------------------

    useEffect(() => {
        loadAllPickerOptions(); 
        if (isEditing) {
             const loadData = async () => {
                 try {
                     const data = await buscarRdc(id);
                     if (data) {
                         const convertChildren = (list) => list.map(item => {
                             const newItem = { ...item };
                             const numericKeys = ['total', 'ordem', 'polegada', 'm_quantidade', 'm2', 'raio', 'largura', 'altura', 'comprimento', 'lados'];
                             numericKeys.forEach(key => {
                                 if (newItem[key] !== undefined && newItem[key] !== null) {
                                     // Converte número para string para exibição no TextInput
                                     newItem[key] = String(newItem[key]);
                                 }
                             });
                             if (!item.id) newItem.id = Date.now(); 
                             // Corrigindo a conversão de boolean/null para string de hora (se vier do backend)
                             if (newItem.solicita_pt === true) newItem.solicita_pt = '08:00'; 
                             if (newItem.solicita_pt === false) newItem.solicita_pt = null;
                             return newItem;
                         });
                         
                         setRdc({
                             ...data,
                             // Garante que os arrays de filhos existam para evitar erros.
                             rdcsserv: convertChildren(data.rdcsserv || []),
                             rdcshh: convertChildren(data.rdcshh || []),
                             rdcspupin: convertChildren(data.rdcspupin || []),
                         });
                     }
                 } catch (error) {
                     console.error('Erro ao carregar RDC:', error);
                 } finally {
                     setLoading(false);
                 }
             };
             loadData();
        } else {
             setLoading(false);
        }
    }, [id, loadAllPickerOptions]);

    // -----------------------------------------------------------
    // --- CONTROLE DE PICKER E MANIPULADORES (MANTIDOS) ---
    // -----------------------------------------------------------

    const openPicker = (fieldKey, title, listKey = null, itemId = null) => {
            // 1. Determina a chave usada para buscar as opções na lista estática
            let optionKey = fieldKey;
            
            // Mapeamento de FieldKey (nome do campo de dados) para OptionKey (nome da lista de opções)
            if (fieldKey === 'tipo') optionKey = 'tipo_rdc';
            else if (fieldKey === 'disciplina') optionKey = 'disciplina_rdc';
            else if (fieldKey === 'clima') optionKey = 'clima_rdc';
            else if (fieldKey === 'tipo_serv') optionKey = 'tipo_serv_hh';
            else if (fieldKey === 'material') optionKey = 'material_pin';
            
            // 2. Busca as opções usando a chave mapeada
            const optionsToUse = pickerOptions[optionKey] || []; 

            // 3. Define o estado: fieldKey armazena o NOME DO CAMPO REAL
            setPickerState({
                visible: true, 
                fieldKey: fieldKey, // <-- ESTA CHAVE É USADA PARA SALVAR o dado no RDC
                title: title, 
                options: optionsToUse,
                listKey: listKey, 
                itemId: itemId,
            });
        };

    const handlePickerSelect = (value) => {
                const { fieldKey, listKey, itemId, title } = pickerState; // Obter os dados de quem abriu
                
                // **DEBUG**
                console.log(`[Picker Select] Field: ${fieldKey}, Value: ${value}, List: ${listKey}, ID: ${itemId}`);

                if (listKey && itemId) {
                    // --- Lógica de atualização para ITENS FILHOS ---
                    setRdc(prev => ({
                        ...prev, 
                        [listKey]: prev[listKey].map(item => {
                            if (item.id === itemId) {
                                // CÓDIGO CRÍTICO: Atualiza o campo (fieldKey) do item específico (itemId)
                                return { ...item, [fieldKey]: value }; 
                            }
                            return item;
                        })
                    }));
                } else {
                    // --- Lógica de atualização para CAMPOS DO PAI ---
                    setRdc(prev => ({ ...prev, [fieldKey]: value }));
                }
                
                // Fecha o modal
                setPickerState(prev => ({ ...prev, visible: false }));
            };
    
    const closePicker = () => setPickerState(prev => ({ ...prev, visible: false }));
    
    const getPickerLabel = (key, value) => {
        if (value === null || value === undefined) return 'Selecione...';
        const options = pickerOptions[key] || [];
        const selected = options.find(opt => opt.value === value);
        // O valor é convertido para string aqui se for um ID numérico que não tem label
        return selected ? selected.label : `ID: ${value}`; 
    };
    
    // Handler para campos do RDC pai
    const handleChange = (key, value) => setRdc(prev => ({ ...prev, [key]: value }));

    // Handler genérico para campos numéricos em filhos
    const handleNumericChange = (listKey, itemId, field, text) => {
        const normalized = text.replace(',', '.');
        if (/^\d*\.?\d*$/.test(normalized) || normalized === '') { 
            setRdc(prev => ({
                ...prev,
                [listKey]: prev[listKey].map(item => item.id === itemId ? { ...item, [field]: normalized } : item)
            }));
        }
    };

    // Handler genérico para campos de texto/hora em filhos
    const handleTextChangeChild = (listKey, itemId, field, text) => {
        setRdc(prev => ({
            ...prev,
            [listKey]: prev[listKey].map(item => item.id === itemId ? { ...item, [field]: text } : item)
        }));
    };

    // -----------------------------------------------------------
    // --- RENDERIZAÇÃO DE ITENS FILHOS ---
    // -----------------------------------------------------------

    const renderServicoItem = (item, index) => (
        <View key={item.id} style={styles.cardItem}>
            <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Serviço #{index + 1}</Text>
                <TouchableOpacity onPress={() => removeItem('rdcsserv', item.id)}>
                    <MaterialIcons name="delete" size={24} color="#d9534f" />
                </TouchableOpacity>
            </View>
            
            <View style={styles.row}>
                <View style={styles.col}>
                    <Text style={styles.labelSmall}>Ordem</Text>
                    <TextInput style={styles.input} keyboardType="numeric" value={item.ordem} 
                        onChangeText={t => handleNumericChange('rdcsserv', item.id, 'ordem', t)} />
                </View>
                <View style={styles.col}>
                    <Text style={styles.labelSmall}>N° PT</Text>
                    <TextInput style={styles.input} value={item.n_pt} 
                        onChangeText={t => handleTextChangeChild('rdcsserv', item.id, 'n_pt', t)} />
                </View>
                {/* AJUSTE: solicita_pt é TimeInput */}
                <View style={styles.col}>
                    <Text style={styles.labelSmall}>Solicita PT (HH:mm)</Text>
                    <TextInput 
                        style={styles.input} 
                        placeholder="08:00" 
                        value={item.solicita_pt} 
                        onChangeText={t => handleTextChangeChild('rdcsserv', item.id, 'solicita_pt', t)} 
                        keyboardType="numbers-and-punctuation" // Sugestão para formato HH:mm
                    />
                </View>
            </View>
            
            <Text style={styles.labelSmall}>Descrição</Text>
            <TextInput 
                style={[styles.input, styles.textArea]} 
                placeholder="Descrição atividade" 
                value={item.descricao} 
                onChangeText={t => handleTextChangeChild('rdcsserv', item.id, 'descricao', t)} 
                multiline
            />
            
            <View style={styles.row}>
                <View style={styles.col}>
                    <Text style={styles.labelSmall}>Início PT (HH:mm)</Text>
                    <TextInput 
                        style={styles.input} 
                        placeholder="07:00" 
                        value={item.inicio_pt} 
                        onChangeText={t => handleTextChangeChild('rdcsserv', item.id, 'inicio_pt', t)} 
                        keyboardType="numbers-and-punctuation"
                    />
                </View>
                <View style={styles.col}>
                    <Text style={styles.labelSmall}>Término PT (HH:mm)</Text>
                    <TextInput 
                        style={styles.input} 
                        placeholder="17:00" 
                        value={item.termino_pt} 
                        onChangeText={t => handleTextChangeChild('rdcsserv', item.id, 'termino_pt', t)} 
                        keyboardType="numbers-and-punctuation"
                    />
                </View>
                <View style={styles.col}></View> {/* Coluna vazia para alinhar */}
            </View>
        </View>
    );

    const renderHHItem = (item, index) => (
        <View key={item.id} style={styles.cardItem}>
            <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Medição HH #{index + 1}</Text>
                <TouchableOpacity onPress={() => removeItem('rdcshh', item.id)}>
                    <MaterialIcons name="delete" size={24} color="#d9534f" />
                </TouchableOpacity>
            </View>
            
            {/* FK: Colaborador */}
            <Text style={styles.labelSmall}>Colaborador</Text>
            <TouchableOpacity style={styles.pickerPlaceholder}
                onPress={() => openPicker('colaborador', 'Selecione Colaborador', 'rdcshh', item.id)}>
                <Text style={styles.pickerText}>{getPickerLabel('colaborador', item.colaborador)}</Text>
            </TouchableOpacity>

            {/* FK: Item Contrato */}
            <Text style={styles.labelSmall}>Item Contrato</Text>
            <TouchableOpacity style={styles.pickerPlaceholder}
                 onPress={() => openPicker('item_contrato', 'Selecione Item Contrato', 'rdcshh', item.id)}>
                <Text style={styles.pickerText}>{getPickerLabel('item_contrato', item.item_contrato)}</Text>
            </TouchableOpacity>
            
            {/* Choice: Tipo Serviço (INT/EXT) */}
            <Text style={styles.labelSmall}>Tipo Serviço (INT/EXT)</Text>
            <TouchableOpacity style={styles.pickerPlaceholder}
                 onPress={() => openPicker('tipo_serv', 'Selecione Tipo', 'rdcshh', item.id)}>
                <Text style={styles.pickerText}>{getPickerLabel('tipo_serv_hh', item.tipo_serv)}</Text>
            </TouchableOpacity>
            
            {/* TAG e Horários e Total */}
             <View style={styles.row}>
                <View style={styles.col}>
                    <Text style={styles.labelSmall}>Início (HH:mm)</Text>
                    <TextInput 
                        style={styles.input} 
                        placeholder="07:05" 
                        value={item.inicio} 
                        onChangeText={t => handleTextChangeChild('rdcshh', item.id, 'inicio', t)} 
                        keyboardType="numbers-and-punctuation"
                    />
                </View>
                <View style={styles.col}>
                    <Text style={styles.labelSmall}>Término (HH:mm)</Text>
                    <TextInput 
                        style={styles.input} 
                        placeholder="17:18" 
                        value={item.termino} 
                        onChangeText={t => handleTextChangeChild('rdcshh', item.id, 'termino', t)} 
                        keyboardType="numbers-and-punctuation"
                    />
                </View>
                <View style={styles.col}>
                    <Text style={styles.labelSmall}>Total Horas</Text>
                    <TextInput style={styles.input} keyboardType="numeric" value={item.total} 
                        onChangeText={t => handleNumericChange('rdcshh', item.id, 'total', t)} />
                </View>
            </View>
            <View>
                <Text style={styles.labelSmall}>Tag (Opcional)</Text>
                <TextInput style={styles.input} value={item.tag} 
                    onChangeText={t => handleTextChangeChild('rdcshh', item.id, 'tag', t)} />
            </View>
        </View>
    );

    const renderPinItem = (item, index) => (
        <View key={item.id} style={styles.cardItem}>
             <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Medição PIN #{index + 1}</Text>
                <TouchableOpacity onPress={() => removeItem('rdcspupin', item.id)}>
                    <MaterialIcons name="delete" size={24} color="#d9534f" />
                </TouchableOpacity>
            </View>

            {/* FK: Item Contrato */}
            <Text style={styles.labelSmall}>Item Contrato</Text>
            <TouchableOpacity style={styles.pickerPlaceholder}
                 onPress={() => openPicker('item_contrato', 'Selecione Item Contrato', 'rdcspupin', item.id)}>
                <Text style={styles.pickerText}>{getPickerLabel('item_contrato', item.item_contrato)}</Text>
            </TouchableOpacity>
            
            {/* Choice: Material */}
            <Text style={styles.labelSmall}>Material</Text>
            <TouchableOpacity style={styles.pickerPlaceholder}
                 onPress={() => openPicker('material', 'Selecione Material', 'rdcspupin', item.id)}>
                <Text style={styles.pickerText}>{getPickerLabel('material_pin', item.material)}</Text>
            </TouchableOpacity>

            <Text style={styles.labelSmall}>Descrição</Text>
            <TextInput 
                style={styles.input} 
                placeholder="Descrição do serviço Pin" 
                value={item.descricao} 
                onChangeText={t => handleTextChangeChild('rdcspupin', item.id, 'descricao', t)} 
            />
            
            <Text style={styles.labelSmall}>Tag</Text>
            <TextInput style={styles.input} value={item.tag} 
                onChangeText={t => handleTextChangeChild('rdcspupin', item.id, 'tag', t)} />

            {/* Linha 1 de Medições (3 colunas) */}
            <View style={styles.row}>
                <View style={styles.col}>
                    <Text style={styles.labelSmall}>Polegada</Text>
                    <TextInput style={styles.input} keyboardType="numeric" value={item.polegada} 
                        onChangeText={t => handleNumericChange('rdcspupin', item.id, 'polegada', t)} />
                </View>
                <View style={styles.col}>
                    <Text style={styles.labelSmall}>Qtd (M.)</Text>
                    <TextInput style={styles.input} keyboardType="numeric" value={item.m_quantidade} 
                        onChangeText={t => handleNumericChange('rdcspupin', item.id, 'm_quantidade', t)} />
                </View>
                <View style={styles.col}>
                    <Text style={styles.labelSmall}>M²</Text>
                    <TextInput style={styles.input} keyboardType="numeric" value={item.m2} 
                        onChangeText={t => handleNumericChange('rdcspupin', item.id, 'm2', t)} />
                </View>
            </View>

            {/* Linha 2 de Medições (3 colunas) */}
            <View style={styles.row}>
                <View style={styles.col}>
                    <Text style={styles.labelSmall}>Raio</Text>
                    <TextInput style={styles.input} keyboardType="numeric" value={item.raio} 
                        onChangeText={t => handleNumericChange('rdcspupin', item.id, 'raio', t)} />
                </View>
                <View style={styles.col}>
                    <Text style={styles.labelSmall}>Largura</Text>
                    <TextInput style={styles.input} keyboardType="numeric" value={item.largura} 
                        onChangeText={t => handleNumericChange('rdcspupin', item.id, 'largura', t)} />
                </View>
                <View style={styles.col}>
                    <Text style={styles.labelSmall}>Altura</Text>
                    <TextInput style={styles.input} keyboardType="numeric" value={item.altura} 
                        onChangeText={t => handleNumericChange('rdcspupin', item.id, 'altura', t)} />
                </View>
            </View>
            
            {/* Linha 3 de Medições (2 colunas) */}
            <View style={styles.row}>
                <View style={styles.colTwoThirds}>
                    <Text style={styles.labelSmall}>Comprimento</Text>
                    <TextInput style={styles.input} keyboardType="numeric" value={item.comprimento} 
                        onChangeText={t => handleNumericChange('rdcspupin', item.id, 'comprimento', t)} />
                </View>
                <View style={styles.colOneThird}>
                    <Text style={styles.labelSmall}>Lados</Text>
                    <TextInput style={styles.input} keyboardType="numeric" value={item.lados} 
                        onChangeText={t => handleNumericChange('rdcspupin', item.id, 'lados', t)} />
                </View>
            </View>
        </View>
    );

    // -----------------------------------------------------------
    // --- RENDERIZAÇÃO FINAL ---
    // -----------------------------------------------------------

    if (loading || pickerOptions.unidade.length === 0) return <View style={styles.loadingCenter}><ActivityIndicator size="large" color="#00315c" /></View>;

    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{flex:1}}>
            <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
                
                {/* --- SEÇÃO 1: CABEÇALHO (Dados Gerais) --- */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Dados Gerais (RDC)</Text>
                    
                    {/* Linha 1: Data, Tipo, Disciplina */}
                    <View style={styles.row}>
                        <View style={styles.col}>
                            <Text style={styles.labelSmall}>Data</Text>
                            <TextInput style={styles.input} placeholder="YYYY-MM-DD" value={rdc.data} 
                                onChangeText={t => handleChange('data', t)} keyboardType="numbers-and-punctuation"/>
                        </View>
                        <View style={styles.col}>
                            <Text style={styles.labelSmall}>Tipo</Text>
                            <TouchableOpacity style={styles.pickerPlaceholder}
                                onPress={() => openPicker('tipo', 'Selecione o Tipo')}> // MUDOU DE 'tipo_rdc' PARA 'tipo'
                                <Text style={styles.pickerText}>{getPickerLabel('tipo_rdc', rdc.tipo)}</Text>
                            </TouchableOpacity>
                        </View>
                        <View style={styles.col}>
                            <Text style={styles.labelSmall}>Disciplina</Text>
                            <TouchableOpacity style={styles.pickerPlaceholder}
                                onPress={() => openPicker('disciplina', 'Selecione a Disciplina')}>
                                <Text style={styles.pickerText}>{getPickerLabel('disciplina_rdc', rdc.disciplina)}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* FKs no Pai (Unidade, Solicitante, Aprovador) */}
                    <Text style={styles.label}>Área/Unidade</Text>
                    <TouchableOpacity style={styles.pickerPlaceholder}
                        onPress={() => openPicker('unidade', 'Selecione a Unidade')}>
                        <Text style={styles.pickerText}>{getPickerLabel('unidade', rdc.unidade)}</Text>
                    </TouchableOpacity>

                    <Text style={styles.label}>Solicitante</Text>
                    <TouchableOpacity style={styles.pickerPlaceholder}
                        onPress={() => openPicker('solicitante', 'Selecione o Solicitante')}>
                        <Text style={styles.pickerText}>{getPickerLabel('solicitante', rdc.solicitante)}</Text>
                    </TouchableOpacity>

                    <Text style={styles.label}>Aprovador</Text>
                    <TouchableOpacity style={styles.pickerPlaceholder}
                        onPress={() => openPicker('aprovador', 'Selecione o Aprovador')}>
                        <Text style={styles.pickerText}>{getPickerLabel('aprovador', rdc.aprovador)}</Text>
                    </TouchableOpacity>

                    {/* Linha 2: AS, CIP, BM */}
                    <View style={styles.row}>
                        <View style={styles.col}>
                            <Text style={styles.labelSmall}>AS</Text>
                            <TouchableOpacity style={styles.pickerPlaceholder}
                                onPress={() => openPicker('AS', 'Selecione o AS')}>
                                <Text style={styles.pickerText}>{getPickerLabel('AS', rdc.AS)}</Text>
                            </TouchableOpacity>
                        </View>
                        <View style={styles.col}>
                            <Text style={styles.labelSmall}>CIP (projeto_cod)</Text>
                            <TouchableOpacity style={styles.pickerPlaceholder}
                                onPress={() => openPicker('projeto_cod', 'Selecione o CIP')}>
                                <Text style={styles.pickerText}>{getPickerLabel('projeto_cod', rdc.projeto_cod)}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Local, Encarregado e Clima */}
                    <Text style={styles.labelSmall}>Local</Text>
                    <TextInput style={styles.input} value={rdc.local} 
                        onChangeText={t => handleChange('local', t)} placeholder="Local da atividade" />
                    
                    <View style={styles.row}>
                        <View style={styles.colTwoThirds}>
                            <Text style={styles.labelSmall}>Encarregado</Text>
                            <TextInput style={styles.input} value={rdc.encarregado} 
                                onChangeText={t => handleChange('encarregado', t)} placeholder="Nome do Encarregado" />
                        </View>
                        <View style={styles.colOneThird}>
                            <Text style={styles.labelSmall}>Clima</Text>
                            <TouchableOpacity style={styles.pickerPlaceholder}
                                onPress={() => openPicker('clima', 'Selecione o Clima')}>
                                <Text style={styles.pickerText}>{getPickerLabel('clima_rdc', rdc.clima)}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                    
                    {/* Início, Término e Doc */}
                    <View style={styles.row}>
                        <View style={styles.col}>
                            <Text style={styles.labelSmall}>Início (HH:mm)</Text>
                            <TextInput 
                                style={styles.input} 
                                placeholder="07:00" 
                                value={rdc.inicio} 
                                onChangeText={t => handleChange('inicio', t)} 
                                keyboardType="numbers-and-punctuation"
                            />
                        </View>
                        <View style={styles.col}>
                            <Text style={styles.labelSmall}>Término (HH:mm)</Text>
                            <TextInput 
                                style={styles.input} 
                                placeholder="17:00" 
                                value={rdc.termino} 
                                onChangeText={t => handleChange('termino', t)} 
                                keyboardType="numbers-and-punctuation"
                            />
                        </View>
                        <View style={styles.col}>
                            <Text style={styles.labelSmall}>Doc (Opcional)</Text>
                            <TextInput style={styles.input} value={rdc.doc} 
                                onChangeText={t => handleChange('doc', t)} placeholder="Nº Documento" />
                        </View>
                    </View>

                    {/* Observações */}
                    <Text style={styles.labelSmall}>Observações</Text>
                    <TextInput 
                        style={[styles.input, styles.textArea]} 
                        placeholder="Observações adicionais" 
                        value={rdc.obs} 
                        onChangeText={t => handleChange('obs', t)} 
                        multiline
                    />
                    
                    {/* Toggle: Aprovado */}
                    <View style={{alignItems: 'center', marginVertical: 10}}>
                        <Text style={styles.label}>Status Aprovado</Text>
                        <TouchableOpacity 
                            style={[styles.toggleBtn, { backgroundColor: rdc.aprovado ? '#28a745' : '#ccc', width: 120 }]}
                            onPress={() => handleChange('aprovado', !rdc.aprovado)}>
                            <Text style={styles.toggleText}>{rdc.aprovado ? 'APROVADO' : 'PENDENTE'}</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* --- SEÇÃO DE SERVIÇOS (RDCSSERV) --- */}
                <View style={styles.section}>
                    <View style={styles.sectionHeaderRow}>
                        <Text style={styles.sectionTitle}>Serviços RDC</Text>
                        <TouchableOpacity style={styles.addButton} onPress={() => addItem('rdcsserv', getNewServico)}>
                            <MaterialIcons name="add-circle" size={30} color="#00315c" />
                        </TouchableOpacity>
                    </View>
                    {rdc.rdcsserv.length === 0 ? (
                        <Text style={styles.emptyText}>Nenhum serviço adicionado.</Text>
                    ) : (
                        rdc.rdcsserv.map(renderServicoItem)
                    )}
                </View>
                
                {/* --- SEÇÃO DE MEDIÇÃO HH (RDCSHH) --- */}
                 <View style={styles.section}>
                    <View style={styles.sectionHeaderRow}>
                        <Text style={styles.sectionTitle}>Medição de Horas</Text>
                        <TouchableOpacity style={styles.addButton} onPress={() => addItem('rdcshh', getNewHH)}>
                            <MaterialIcons name="add-circle" size={30} color="#00315c" />
                        </TouchableOpacity>
                    </View>
                    {rdc.rdcshh.length === 0 ? (
                        <Text style={styles.emptyText}>Nenhuma medição de HH adicionada.</Text>
                    ) : (
                        rdc.rdcshh.map(renderHHItem)
                    )}
                </View>

                {/* --- SEÇÃO DE MEDIÇÃO PIN (RDCSPUPIN) --- */}
                <View style={styles.section}>
                    <View style={styles.sectionHeaderRow}>
                        <Text style={styles.sectionTitle}>Medição Pintura (PIN)</Text>
                        <TouchableOpacity style={styles.addButton} onPress={() => addItem('rdcspupin', getNewPin)}>
                            <MaterialIcons name="add-circle" size={30} color="#00315c" />
                        </TouchableOpacity>
                    </View>
                    {rdc.rdcspupin.length === 0 ? (
                        <Text style={styles.emptyText}>Nenhuma medição de PIN adicionada.</Text>
                    ) : (
                        rdc.rdcspupin.map(renderPinItem)
                    )}
                </View>
                
                {/* --- BOTÃO SALVAR --- */}
                <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={loading}>
                    {loading ? (
                         <ActivityIndicator size="small" color="#fff" />
                    ) : (
                        <Text style={styles.saveBtnText}>SALVAR RDC</Text>
                    )}
                </TouchableOpacity>
                <View style={{height: 50}} /> {/* Espaço extra no final */}

            </ScrollView>

            {/* --- O MODAL DE SELEÇÃO --- */}
            <CustomPickerModal
                visible={pickerState.visible}
                onClose={closePicker}
                options={pickerState.options}
                onSelect={handlePickerSelect}
                title={pickerState.title}
                // Adicione a lógica para passar o valor selecionado atual se precisar de pré-seleção no modal
                selectedValue={
                    pickerState.listKey && pickerState.itemId
                        ? rdc[pickerState.listKey].find(item => item.id === pickerState.itemId)?.[pickerState.fieldKey]
                        : rdc[pickerState.fieldKey]
                }
            />
        </KeyboardAvoidingView>
    );
}

// ... (Styles) ...

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f2f2f2' },
    scrollContent: { padding: 15, paddingBottom: 50 },
    loadingCenter: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    
    section: { backgroundColor: '#fff', padding: 15, borderRadius: 10, marginBottom: 15, elevation: 2 },
    sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#00315c' },
    
    label: { fontSize: 14, fontWeight: '600', color: '#555', marginBottom: 5 },
    labelSmall: { fontSize: 12, color: '#777', marginBottom: 2 },
    
    input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10, fontSize: 14, marginBottom: 8, backgroundColor: '#fafafa' },
    textArea: { minHeight: 80, textAlignVertical: 'top' },
    
    row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
    col: { flex: 0.33, marginHorizontal: 2 }, // Ajustado para 3 colunas
    colTwoThirds: { flex: 0.66, marginHorizontal: 2 },
    colOneThird: { flex: 0.33, marginHorizontal: 2 },
    
    cardItem: { backgroundColor: '#f9f9f9', padding: 10, borderRadius: 8, marginBottom: 10, borderWidth: 1, borderColor: '#eee' },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5, alignItems: 'center' },
    cardTitle: { fontWeight: 'bold', color: '#444' },
    
    saveBtn: { backgroundColor: '#00315c', padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 10 },
    saveBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
    
    emptyText: { fontStyle: 'italic', color: '#999', textAlign: 'center', marginVertical: 10 },
    addButton: { padding: 5, borderRadius: 5 },

    // Estilos do Picker
    toggleBtn: { padding: 5, borderRadius: 5, alignItems: 'center', justifyContent: 'center', height: 40 },
    toggleText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
    pickerPlaceholder: { 
        borderWidth: 1, 
        borderColor: '#ddd', 
        borderRadius: 8, 
        paddingHorizontal: 10,
        marginBottom: 12, 
        backgroundColor: '#eef', 
        minHeight: 40, 
        justifyContent: 'center' 
    },
    pickerText: { color: '#00315c', fontSize: 14, fontWeight: '500' }
});