import React, { useState, useEffect, useCallback } from 'react';
import { 
    View, Text, TextInput, TouchableOpacity, ScrollView, 
    StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, Alert 
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';

import CustomPickerModal from '../../components/CustomPickerModal'; 
import DatePicker from '../../components/DatePicker'; 
// Supondo que levantamentoService está no mesmo nível
import { salvarLevantamentoLocal, buscarLevantamento } from '../../services/levantamentoService'; 

// Importa os fetches e choices
import { 
    fetchSolicitantes, fetchAprovadores, fetchUnidades, fetchASOptions, 
    fetchProjetoCodigos, fetchItemContratoOptions,
    MOCK_OPTIONS_CHOICES, // Opções de mock genéricas
    // Reutilizando fetchASOptions para 'auth_serv'
} from '../../services/dataService'; 

// --- Choices Específicas para Levantamento de Pintura ---

// 'tipo_serv' é um novo campo de Choice no Item
const TIPO_SERV_CHOICES = [
    { label: 'INTERNO', value: 'INT' },
    { label: 'EXTERNO', value: 'EXT' },
];

// 'material' (que estava no item anterior, pode ser mantido se o seu back-end o usa)
// Usaremos um exemplo de material específico para pintura
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

// PC_CHOICES e ELASTOMERO_CHOICES removidos/ignorados, agora são campos de texto livre.
// --- Helpers de Itens (Estrutura do Array de Itens - ItemLevantamentoPintura) ---

const getNewItemLevantamentoPintura = () => ({ 
    // Usamos o Date.now() localmente, mas o back-end pode gerar o ID no create.
    // Manter por segurança para mapeamento de array local.
    id: Date.now(), 
    area: '',           // Input Text
    descricao: '',      // Input Text
    om_rec_pj: '',      // Input Text (OM, REC ou PJ)
    referencia: '',     // Input Text (Desenho/Referência)
    folha_rev: '',      // Input Text (Folha/Revisão)
    obs: '',            // Input Text (Observação do item)
    pc: '',             // AGORA É INPUT TEXT (livre)
    elastomero: '',     // AGORA É INPUT TEXT (livre)
    tipo_serv: null,    // Choice: Tipo Serviço
    material: null,     // Choice: Material
    polegada: '0',      // Input Numérico
    m_quantidade: '0',  // Input Numérico (M Quantidade)
    m2: '0',            // Input Numérico (M2)
    raio: '0',          // Input Numérico
    largura: '0',       // Input Numérico
    altura: '0',        // Input Numérico
    comprimento: '0',   // Input Numérico
    lados: '1',         // Input Numérico
});
// -----------------------------------------------------------------


export default function LevantamentoFormScreen({ route }) {
    const navigation = useNavigation();
    const id = route.params?.id || null; 
    const isEditing = !!id;

    const [loading, setLoading] = useState(isEditing);
    
    // --- ESTADO: Armazena as opções carregadas via fetch e mocks ---
    const [pickerOptions, setPickerOptions] = useState({
        unidade: [], 
        auth_serv: [], // Renomeado de AS para auth_serv
        projeto_cod: [],
        
        // Choices Específicas
        ...MOCK_OPTIONS_CHOICES, 
        tipo_serv: TIPO_SERV_CHOICES,
        material: MATERIAL_CHOICES,
        // pc: PC_CHOICES, // REMOVIDO
        // elastomero: ELASTOMERO_CHOICES, // REMOVIDO
    });
    // -----------------------------------------------------------

    const [levantamento, setLevantamento] = useState({
        // Campos de Seleção (FKs/Choices) - Armazenam apenas o ID
        auth_serv: null, // Novo campo de FK (Autorização de Serviço)
        unidade: null, 
        projeto_cod: null, 
        
        // Campos de Input/Outros
        data: new Date().toISOString().split('T')[0], // Input Data
        escopo: '', // Input Text (Novo)
        local: '', // Input Text
        doc: '', // Input Text (Novo: Documento de Referência)
        
        // Array de itens filhos (Chave deve ser 'itens_pintura' conforme o Serializer)
        itens_pintura: [getNewItemLevantamentoPintura()],
    });

    // --- ESTADO DO PICKER DO RDC (O QUE FUNCIONA BEM) ---
    const [pickerState, setPickerState] = useState({
        visible: false,
        fieldKey: null, 
        listKey: null, 
        itemId: null, 
        title: '',
        options: [],
    });

    // -----------------------------------------------------------
    // --- FUNÇÃO PARA CARREGAR AS OPÇÕES (AJUSTADA) ---
    // -----------------------------------------------------------
    const loadAllPickerOptions = useCallback(async () => {
        try {
            // Ajuste dos fetches para os campos usados: unidade, auth_serv, projeto_cod
            const [
                authServOptions, unidades, projetos
            ] = await Promise.all([
                fetchASOptions(), // Usando o fetchASOptions para o auth_serv
                fetchUnidades(),
                fetchProjetoCodigos(),
            ]);

            setPickerOptions(prev => ({
                ...prev,
                auth_serv: authServOptions, // Renomeado
                unidade: unidades,
                projeto_cod: projetos,
            }));
        } catch (error) {
            console.error("Falha ao carregar opções de seleção:", error);
            Alert.alert("Erro de Carga", "Não foi possível carregar algumas opções de seleção do servidor.");
        }
    }, []);

    // -----------------------------------------------------------
    // --- FUNÇÕES DE MANIPULAÇÃO DE ITENS FILHOS (CHAVE MUDADA) ---
    // -----------------------------------------------------------
    
    // A chave agora é 'itens_pintura'
    const addItem = (listKey, getNewItem) => {
        setLevantamento(prev => ({
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
                        setLevantamento(prev => ({
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
    // --- CONTROLE DE PICKER E MANIPULADORES (PADRÃO RDC) ---
    // -----------------------------------------------------------

    const openPicker = (fieldKey, title, listKey = null, itemId = null) => {
        // OptionKey é o mesmo que FieldKey neste caso, exceto se você precisar de mapeamento.
        const optionsToUse = pickerOptions[fieldKey] || []; 

        setPickerState({
            visible: true, 
            fieldKey: fieldKey, 
            title: title, 
            options: optionsToUse,
            listKey: listKey, 
            itemId: itemId, 
        });
    };

    const handlePickerSelect = (value) => {
        const { fieldKey, listKey, itemId } = pickerState; 
        
        if (listKey && itemId) {
            // --- Lógica de atualização para ITENS FILHOS ---
            setLevantamento(prev => ({
                ...prev, 
                [listKey]: prev[listKey].map(item => {
                    if (item.id === itemId) {
                        return { ...item, [fieldKey]: value }; 
                    }
                    return item;
                })
            }));
        } else {
            // --- Lógica de atualização para CAMPOS DO PAI ---
            setLevantamento(prev => ({ ...prev, [fieldKey]: value }));
        }
        
        setPickerState(prev => ({ ...prev, visible: false }));
    };

    const closePicker = () => setPickerState(prev => ({ ...prev, visible: false }));
    
    // Função para obter o label de exibição
    const getPickerLabel = (key, value) => {
        if (value === null || value === undefined || value === '') return 'Selecione...';
        const options = pickerOptions[key] || [];
        const selected = options.find(opt => opt.value === value);
        return selected ? selected.label : `${value}`; 
    };
    
    // Handler para campos do Levantamento pai
    const handleChange = (key, value) => setLevantamento(prev => ({ ...prev, [key]: value }));

    // Handler genérico para campos numéricos em filhos
    const handleNumericChange = (listKey, itemId, field, text) => {
        // Permite números inteiros ou decimais (com ponto ou vírgula)
        const normalized = text.replace(',', '.');
        if (/^\d*\.?\d*$/.test(normalized) || normalized === '' || normalized === '.') { 
            setLevantamento(prev => ({
                ...prev,
                [listKey]: prev[listKey].map(item => item.id === itemId ? { ...item, [field]: text } : item) // Mantém a string original com vírgula para visualização
            }));
        }
    };

    // Handler genérico para campos de texto em filhos
    const handleTextChangeChild = (listKey, itemId, field, text) => {
        setLevantamento(prev => ({
            ...prev,
            [listKey]: prev[listKey].map(item => item.id === itemId ? { ...item, [field]: text } : item)
        }));
    };
    
    // -----------------------------------------------------------
    // --- FUNÇÃO DE SALVAMENTO (AJUSTADA) ---
    // -----------------------------------------------------------

    const handleSave = async () => {
        if (!levantamento.auth_serv || !levantamento.unidade || levantamento.itens_pintura.length === 0) {
            Alert.alert("Erro", "Campos Autorização de Serviço, Unidade e pelo menos um Item são obrigatórios.");
            return;
        }

        setLoading(true);
        try {
            // Lista de chaves numéricas no item filho
            const numericKeys = ['polegada', 'm_quantidade', 'm2', 'raio', 'largura', 'altura', 'comprimento', 'lados'];
            
            const payload = { 
                ...levantamento,
                
                itens_pintura: levantamento.itens_pintura.map(item => {
                    const newItem = { ...item };
                    numericKeys.forEach(key => {
                        // Converte a string (permitindo vírgula) para Number/Float, ou usa null se não for válido.
                        const value = item[key].replace(',', '.');
                        newItem[key] = value && !isNaN(Number(value)) ? Number(value) : null;
                    });
                    
                    // Os campos PC e Elastomero são passados como string de texto livre.
                    newItem.pc = newItem.pc.trim() || null;
                    newItem.elastomero = newItem.elastomero.trim() || null;

                    // Remove o ID local (Date.now()) se for um item novo (sem ID de DB)
                    if (String(newItem.id).startsWith('17')) { // Heurística para ID local
                        delete newItem.id;
                    }
                    return newItem;
                }),
                // Limpeza de FKs que possam ter vindo como ''
                auth_serv: levantamento.auth_serv || null, 
                unidade: levantamento.unidade || null, 
                projeto_cod: levantamento.projeto_cod || null,
            };

            await salvarLevantamentoLocal(payload); 
            Alert.alert("Sucesso", `Levantamento de Pintura ${isEditing ? 'atualizado' : 'salvo'} com sucesso!`);
            navigation.goBack(); 
        } catch (error) {
            console.error("Erro ao salvar Levantamento:", error);
            Alert.alert("Erro", "Falha ao salvar o Levantamento. Tente novamente.");
        } finally {
            setLoading(false);
        }
    };
    
    // -----------------------------------------------------------
    // --- EFEITO DE CARREGAMENTO (AJUSTADO) ---
    // -----------------------------------------------------------

    useEffect(() => {
        loadAllPickerOptions(); 
        if (isEditing) {
             const loadData = async () => {
                 try {
                     const data = await buscarLevantamento(id); 
                     if (data) {
                         const convertChildren = (list) => list.map(item => {
                             const newItem = { ...item };
                             const numericKeys = ['polegada', 'm_quantidade', 'm2', 'raio', 'largura', 'altura', 'comprimento', 'lados'];
                             numericKeys.forEach(key => {
                                 if (newItem[key] !== undefined && newItem[key] !== null) {
                                     // Converte número para string para exibição no TextInput, usa replace para garantir vírgula
                                     newItem[key] = String(newItem[key]).replace('.', ',');
                                 } else {
                                     newItem[key] = '0'; // Garante que campos numéricos vazios venham como '0' para o input
                                 }
                             });
                             
                             // Garante que PC e Elastomero sejam strings vazias se forem null/undefined
                             newItem.pc = newItem.pc || '';
                             newItem.elastomero = newItem.elastomero || '';

                             if (!item.id) newItem.id = Date.now(); 
                             return newItem;
                         });
                         
                         setLevantamento({
                             ...data,
                             // O Serializer usa 'itens_pintura' na resposta, então usamos essa chave.
                             itens_pintura: convertChildren(data.itens_pintura || []),
                         });
                     }
                 } catch (error) {
                     console.error('Erro ao carregar Levantamento:', error);
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
    // --- RENDERIZAÇÃO DE ITENS FILHOS (AJUSTADA) ---
    // -----------------------------------------------------------

    const renderItemLevantamento = (item, index) => (
        <View key={item.id} style={styles.cardItem}>
            <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Item Pintura #{index + 1}</Text>
                <TouchableOpacity onPress={() => removeItem('itens_pintura', item.id)}>
                    <MaterialIcons name="delete" size={24} color="#d9534f" />
                </TouchableOpacity>
            </View>

            {/* Linha 1: OM/REC/PJ, Área */}
            <View style={styles.row}>
                <View style={styles.colOneThird}>
                    <Text style={styles.labelSmall}>OM/REC/PJ</Text>
                    <TextInput style={styles.input} value={item.om_rec_pj} 
                        onChangeText={t => handleTextChangeChild('itens_pintura', item.id, 'om_rec_pj', t)} />
                </View>
                <View style={styles.colTwoThirds}>
                    <Text style={styles.labelSmall}>Área/Local Específico</Text>
                    <TextInput style={styles.input} value={item.area} 
                        onChangeText={t => handleTextChangeChild('itens_pintura', item.id, 'area', t)} />
                </View>
            </View>
            
            <Text style={styles.labelSmall}>Descrição</Text>
            <TextInput 
                style={[styles.input, styles.textArea]} 
                placeholder="Descrição detalhada do item/serviço" 
                value={item.descricao} 
                onChangeText={t => handleTextChangeChild('itens_pintura', item.id, 'descricao', t)} 
                multiline
            />
            
            {/* Linha 2: Referência, Folha/Rev */}
            <View style={styles.row}>
                <View style={styles.col}>
                    <Text style={styles.labelSmall}>Referência (Desenho)</Text>
                    <TextInput style={styles.input} value={item.referencia} 
                        onChangeText={t => handleTextChangeChild('itens_pintura', item.id, 'referencia', t)} />
                </View>
                <View style={styles.col}>
                    <Text style={styles.labelSmall}>Folha/Revisão</Text>
                    <TextInput style={styles.input} value={item.folha_rev} 
                        onChangeText={t => handleTextChangeChild('itens_pintura', item.id, 'folha_rev', t)} />
                </View>
            </View>

            {/* Linha 3: PC (INPUT TEXT), Elastomero (INPUT TEXT), Tipo Serv (CHOICE) */}
            <View style={styles.row}>
                <View style={styles.col}>
                    <Text style={styles.labelSmall}>PC (Livre)</Text>
                    <TextInput 
                        style={styles.input} 
                        value={item.pc} 
                        onChangeText={t => handleTextChangeChild('itens_pintura', item.id, 'pc', t)} 
                    />
                </View>
                <View style={styles.col}>
                    <Text style={styles.labelSmall}>Elastomero (Livre)</Text>
                    <TextInput 
                        style={styles.input} 
                        value={item.elastomero} 
                        onChangeText={t => handleTextChangeChild('itens_pintura', item.id, 'elastomero', t)} 
                    />
                </View>
                <View style={styles.col}>
                    <Text style={styles.labelSmall}>Tipo Serviço</Text>
                    <TouchableOpacity style={styles.pickerPlaceholder}
                        onPress={() => openPicker('tipo_serv', 'Tipo de Serviço', 'itens_pintura', item.id)}>
                        <Text style={styles.pickerText}>{getPickerLabel('tipo_serv', item.tipo_serv)}</Text>
                    </TouchableOpacity>
                </View>
            </View>
            
            {/* Choice: Material */}
            <Text style={styles.labelSmall}>Material (Tipo)</Text>
            <TouchableOpacity style={styles.pickerPlaceholder}
                onPress={() => openPicker('material', 'Tipo de Material', 'itens_pintura', item.id)}>
                <Text style={styles.pickerText}>{getPickerLabel('material', item.material)}</Text>
            </TouchableOpacity>

            <View style={styles.divider} />
            <Text style={styles.cardSubtitle}>Dimensões / Quantidades</Text>
            
            {/* Linha 4: Comprimento, Largura, Altura, Raio, Lados (Numéricos - String Livre) */}
            <View style={styles.row}>
                <View style={styles.col}>
                    <Text style={styles.labelSmall}>Comp.</Text>
                    <TextInput 
                        style={styles.input} 
                        keyboardType="numeric" 
                        value={item.comprimento} 
                        onChangeText={t => handleNumericChange('itens_pintura', item.id, 'comprimento', t)} 
                    />
                </View>
                <View style={styles.col}>
                    <Text style={styles.labelSmall}>Largura</Text>
                    <TextInput 
                        style={styles.input} 
                        keyboardType="numeric" 
                        value={item.largura} 
                        onChangeText={t => handleNumericChange('itens_pintura', item.id, 'largura', t)} 
                    />
                </View>
                <View style={styles.col}>
                    <Text style={styles.labelSmall}>Altura</Text>
                    <TextInput 
                        style={styles.input} 
                        keyboardType="numeric" 
                        value={item.altura} 
                        onChangeText={t => handleNumericChange('itens_pintura', item.id, 'altura', t)} 
                    />
                </View>
                <View style={styles.col}>
                    <Text style={styles.labelSmall}>Raio</Text>
                    <TextInput 
                        style={styles.input} 
                        keyboardType="numeric" 
                        value={item.raio} 
                        onChangeText={t => handleNumericChange('itens_pintura', item.id, 'raio', t)} 
                    />
                </View>
                <View style={styles.col}>
                    <Text style={styles.labelSmall}>Lados</Text>
                    <TextInput 
                        style={styles.input} 
                        keyboardType="numeric" 
                        value={item.lados} 
                        onChangeText={t => handleNumericChange('itens_pintura', item.id, 'lados', t)} 
                    />
                </View>
            </View>

            {/* Linha 5: Polegada, M Quantidade, M2 (Numéricos - String Livre) */}
            <View style={styles.row}>
                <View style={styles.colOneThird}>
                    <Text style={styles.labelSmall}>Polegada</Text>
                    <TextInput 
                        style={styles.input} 
                        keyboardType="numeric" 
                        value={item.polegada} 
                        onChangeText={t => handleNumericChange('itens_pintura', item.id, 'polegada', t)} 
                    />
                </View>
                <View style={styles.colOneThird}>
                    <Text style={styles.labelSmall}>M Quantidade</Text>
                    <TextInput 
                        style={styles.input} 
                        keyboardType="numeric" 
                        value={item.m_quantidade} 
                        onChangeText={t => handleNumericChange('itens_pintura', item.id, 'm_quantidade', t)} 
                    />
                </View>
                <View style={styles.colOneThird}>
                    <Text style={styles.labelSmall}>M2</Text>
                    <TextInput 
                        style={styles.input} 
                        keyboardType="numeric" 
                        value={item.m2} 
                        onChangeText={t => handleNumericChange('itens_pintura', item.id, 'm2', t)} 
                    />
                </View>
            </View>

            <Text style={styles.labelSmall}>Observação Item</Text>
            <TextInput 
                style={[styles.input, { height: 60, textAlignVertical: 'top' }]} 
                multiline 
                value={item.obs} 
                onChangeText={t => handleTextChangeChild('itens_pintura', item.id, 'obs', t)} 
            />
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
                    <Text style={styles.sectionTitle}>Dados Gerais (Levantamento Pintura)</Text>
                    
                    {/* Linha 1: Data, Unidade */}
                    <View style={styles.row}>
                        <View style={styles.col}>
                            <Text style={styles.labelSmall}>Data</Text>
                            <DatePicker
                                value={levantamento.data} 
                                onDateChange={t => handleChange('data', t)} 
                                inputStyle={styles.input} 
                                nullable={true} 
                            />
                        </View>
                        <View style={styles.col}>
                            <Text style={styles.labelSmall}>Área/Unidade</Text>
                            <TouchableOpacity style={styles.pickerPlaceholder}
                                onPress={() => openPicker('unidade', 'Selecione a Unidade')}>
                                <Text style={styles.pickerText}>{getPickerLabel('unidade', levantamento.unidade)}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* FKs no Pai (Auth Serv, Projeto) */}
                    <Text style={styles.label}>Autorização de Serviço (A.S.)</Text>
                    <TouchableOpacity style={styles.pickerPlaceholder}
                        onPress={() => openPicker('auth_serv', 'Selecione a A.S.')}>
                        <Text style={styles.pickerText}>{getPickerLabel('auth_serv', levantamento.auth_serv)}</Text>
                    </TouchableOpacity>
                    
                    <Text style={styles.label}>Projeto/Código</Text>
                    <TouchableOpacity style={styles.pickerPlaceholder}
                        onPress={() => openPicker('projeto_cod', 'Selecione o Projeto/Código')}>
                        <Text style={styles.pickerText}>{getPickerLabel('projeto_cod', levantamento.projeto_cod)}</Text>
                    </TouchableOpacity>

                    {/* Campos de Input */}
                    <Text style={styles.label}>Local / Tag Principal</Text>
                    <TextInput style={styles.input} value={levantamento.local} onChangeText={t => handleChange('local', t)} />
                    
                    <Text style={styles.label}>Escopo</Text>
                    <TextInput 
                        style={[styles.input, styles.textArea]} 
                        value={levantamento.escopo} 
                        onChangeText={t => handleChange('escopo', t)}
                        multiline
                    />
                    
                    <Text style={styles.label}>Documento de Referência (Doc)</Text>
                    <TextInput style={styles.input} value={levantamento.doc} onChangeText={t => handleChange('doc', t)} />

                </View>

                <View style={styles.divider} />

                {/* --- SEÇÃO 2: ITENS DE LEVANTAMENTO (PINTURA) --- */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Itens de Pintura Levantados</Text>

                    {levantamento.itens_pintura.map(renderItemLevantamento)}

                    <TouchableOpacity style={styles.addButton}
                        onPress={() => addItem('itens_pintura', getNewItemLevantamentoPintura)}>
                        <MaterialIcons name="add" size={24} color="#fff" />
                        <Text style={styles.addButtonText}>Adicionar Item de Pintura</Text>
                    </TouchableOpacity>
                </View>
                
                <View style={styles.divider} />

                {/* --- SEÇÃO FINAL: BOTÃO SALVAR --- */}
                <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={loading}>
                    {loading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.saveButtonText}>Salvar Levantamento de Pintura</Text>
                    )}
                </TouchableOpacity>

            </ScrollView>

            {/* --- MODAL DE SELEÇÃO (Picker) --- */}
            <CustomPickerModal
                visible={pickerState.visible}
                title={pickerState.title}
                options={pickerState.options}
                selectedValue={
                    pickerState.listKey && pickerState.itemId // É um item filho?
                    ? levantamento[pickerState.listKey].find(i => i.id === pickerState.itemId)?.[pickerState.fieldKey]
                    : levantamento[pickerState.fieldKey] // É um campo pai
                }
                onSelect={handlePickerSelect}
                onClose={closePicker}
            />
        </KeyboardAvoidingView>
    );
}

// --- STYLES (AJUSTADOS) ---

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    scrollContent: {
        padding: 15,
        paddingBottom: 100,
    },
    loadingCenter: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f8f9fa',
    },
    section: {
        marginBottom: 20,
        padding: 10,
        backgroundColor: '#ffffff',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#dee2e6',
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#00315c',
        marginBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#dee2e6',
        paddingBottom: 5,
    },
    cardSubtitle: {
        fontSize: 15,
        fontWeight: 'bold',
        color: '#495057',
        marginTop: 5,
        marginBottom: 5,
    },
    label: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#343a40',
        marginTop: 10,
        marginBottom: 5,
    },
    labelSmall: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#343a40',
        marginBottom: 5,
    },
    input: {
        borderWidth: 1,
        borderColor: '#ced4da',
        padding: 8, // Reduzido um pouco o padding
        borderRadius: 4,
        backgroundColor: '#fff',
        fontSize: 14,
    },
    textArea: {
        height: 60, // Reduzido um pouco
        textAlignVertical: 'top',
    },
    pickerPlaceholder: {
        borderWidth: 1,
        borderColor: '#ced4da',
        padding: 10,
        borderRadius: 4,
        backgroundColor: '#e9ecef',
        justifyContent: 'center',
        minHeight: 40,
        marginBottom: 10,
    },
    pickerText: {
        fontSize: 14,
        color: '#495057',
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 5, // Reduzido
    },
    col: {
        flex: 1,
        marginHorizontal: 3, // Reduzido
    },
    colTwoThirds: {
        flex: 2,
        marginHorizontal: 3,
    },
    colOneThird: {
        flex: 1,
        marginHorizontal: 3,
    },
    divider: {
        height: 1,
        backgroundColor: '#ced4da',
        marginVertical: 15,
    },
    cardItem: {
        padding: 10,
        borderWidth: 1,
        borderColor: '#adb5bd',
        borderRadius: 6,
        marginBottom: 15,
        backgroundColor: '#f1f3f5',
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
        paddingBottom: 5,
        borderBottomWidth: 1,
        borderBottomColor: '#ced4da',
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#343a40',
    },
    addButton: {
        flexDirection: 'row',
        backgroundColor: '#28a745',
        padding: 10,
        borderRadius: 4,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 10,
    },
    addButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
        marginLeft: 5,
    },
    saveButton: {
        backgroundColor: '#00315c',
        padding: 15,
        borderRadius: 8,
        alignItems: 'center',
        marginVertical: 20,
    },
    saveButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
});