import React, { useState, useEffect } from 'react';
import { 
    View, Text, ScrollView, StyleSheet, Alert, ActivityIndicator, TouchableOpacity, TextInput
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import DatePicker from '../../components/DatePicker'; // Componente DatePicker (Assumido)

import { 
    salvarBoletimMedicaoLocal, 
    buscarBoletimMedicao
} from '../../services/boletimMedicaoService';

// Estado inicial para um novo BM
const initialBMState = {
    id: null,
    periodo_inicio: null, // YYYY-MM-DD
    periodo_fim: null,   // YYYY-MM-DD
    descricao: '',
    valor: '',
    status_pgt: '',
    status_med: '',
    d_numero: '',
    d_data: null, 
    d_status: '',
    b_numero: '',
    b_data: null, 
    b_status: '',
    follow_up: '',
    rev: 0,
    // FKs (server_ids)
    unidade_server_id: null,
    projeto_cod_server_id: null,
    d_aprovador_server_id: null,
    b_aprovador_server_id: null,
};


export default function BoletimMedicaoFormScreen() {
    const navigation = useNavigation();
    const route = useRoute();
    const [formData, setFormData] = useState(initialBMState);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    const bmId = route.params?.id;
    const isEditing = !!bmId;
    
    // Define o título da tela
    useEffect(() => {
        navigation.setOptions({
            title: isEditing ? `Editar BM ID ${bmId}` : 'Novo Boletim de Medição',
        });
    }, [navigation, isEditing, bmId]);

    // --- EFEITO PARA CARREGAR DADOS NA EDIÇÃO ---
    useEffect(() => {
        if (isEditing) {
            setLoading(true);
            const loadBMData = async () => {
                try {
                    const data = await buscarBoletimMedicao(bmId);
                    if (data) {
                        setFormData({
                            ...initialBMState, 
                            ...data,
                            valor: String(data.valor || ''), 
                        });
                    } else {
                        Alert.alert('Erro', 'Boletim de Medição não encontrado.');
                        navigation.goBack();
                    }
                } catch (error) {
                    console.error('Erro ao carregar BM:', error);
                    Alert.alert('Erro', 'Não foi possível carregar os dados do BM.');
                    navigation.goBack();
                } finally {
                    setLoading(false);
                }
            };
            loadBMData();
        }
    }, [bmId, isEditing, navigation]);

    // --- HANDLERS DE FORMULÁRIO ---
    const handleChange = (name, value) => {
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            // Validação mínima
            if (!formData.periodo_inicio || !formData.periodo_fim || !formData.descricao) {
                Alert.alert('Atenção', 'Preencha o Período de Início, Fim e a Descrição.');
                setSaving(false);
                return;
            }

            // Preparar dados para salvar
            const dataToSave = {
                ...formData,
                // Trata a conversão de valor para float, garantindo que use ponto como separador decimal
                valor: parseFloat(String(formData.valor).replace(',', '.')) || null,
                rev: parseInt(formData.rev) || 0,
                id: isEditing ? bmId : null,
            };

            await salvarBoletimMedicaoLocal(dataToSave);
            
            Alert.alert('Sucesso', `Boletim de Medição salvo ${isEditing ? 'e atualizado' : ''} com sucesso! Será sincronizado.`, [
                { text: 'OK', onPress: () => navigation.goBack() }
            ]);

        } catch (error) {
            console.error('Erro ao salvar BM:', error.message);
            Alert.alert('Erro', `Falha ao salvar o BM: ${error.message}`);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <ActivityIndicator size="large" color="#00315c" style={styles.loading} />;
    }

    // --- RENDERIZAÇÃO ---
    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
            
            <Text style={styles.sectionTitle}>📅 Período de Medição (Obrigatório)</Text>
            <View style={styles.row}>
                <View style={styles.halfInput}>
                    <Text style={styles.label}>Início do Período *</Text>
                    <DatePicker
                        value={formData.periodo_inicio}
                        onDateChange={(dateString) => handleChange('periodo_inicio', dateString)}
                        placeholder="YYYY-MM-DD"
                    />
                </View>
                <View style={styles.halfInput}>
                    <Text style={styles.label}>Fim do Período *</Text>
                    <DatePicker
                        value={formData.periodo_fim}
                        onDateChange={(dateString) => handleChange('periodo_fim', dateString)}
                        placeholder="YYYY-MM-DD"
                    />
                </View>
            </View>

            {/* Descrição */}
            <Text style={styles.label}>Descrição *</Text>
            <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.descricao}
                onChangeText={(text) => handleChange('descricao', text)}
                placeholder="Detalhes do Boletim de Medição"
                multiline={true}
                numberOfLines={3}
            />

            {/* Valor Total */}
            <Text style={styles.label}>Valor Total (R$)</Text>
            <TextInput
                style={styles.input}
                value={formData.valor}
                onChangeText={(text) => handleChange('valor', text)}
                placeholder="0.00"
                keyboardType="numeric"
            />
            
            <Text style={styles.sectionTitle}>📄 DMS (Documento de Medição)</Text>
            <View style={styles.row}>
                <View style={styles.halfInput}>
                    <Text style={styles.label}>Nº DMS</Text>
                    <TextInput
                        style={styles.input}
                        value={formData.d_numero}
                        onChangeText={(text) => handleChange('d_numero', text)}
                        placeholder="Nº DMS"
                    />
                </View>
                <View style={styles.halfInput}>
                    <Text style={styles.label}>Data DMS</Text>
                    <DatePicker
                        value={formData.d_data}
                        onDateChange={(dateString) => handleChange('d_data', dateString)}
                        nullable={true}
                        placeholder="YYYY-MM-DD (Opcional)"
                    />
                </View>
            </View>
            {/* Pickers para d_status e d_aprovador_server_id ficariam aqui, se existissem */}
            
            <Text style={styles.sectionTitle}>🧾 BMS (Boletim de Medição)</Text>
            <View style={styles.row}>
                <View style={styles.halfInput}>
                    <Text style={styles.label}>Nº BMS</Text>
                    <TextInput
                        style={styles.input}
                        value={formData.b_numero}
                        onChangeText={(text) => handleChange('b_numero', text)}
                        placeholder="Nº BMS"
                    />
                </View>
                <View style={styles.halfInput}>
                    <Text style={styles.label}>Data BMS</Text>
                    <DatePicker
                        value={formData.b_data}
                        onDateChange={(dateString) => handleChange('b_data', dateString)}
                        nullable={true}
                        placeholder="YYYY-MM-DD (Opcional)"
                    />
                </View>
            </View>
            {/* Pickers para b_status e b_aprovador_server_id ficariam aqui, se existissem */}

            {/* --- BOTÃO DE SALVAR --- */}
            <TouchableOpacity
                style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                onPress={handleSave}
                disabled={saving}
                activeOpacity={0.8}
            >
                {saving ? (
                    <ActivityIndicator size="small" color="#fff" />
                ) : (
                    <Text style={styles.saveButtonText}>
                        {isEditing ? "SALVAR ALTERAÇÕES" : "CRIAR BOLETIM DE MEDIÇÃO"}
                    </Text>
                )}
            </TouchableOpacity>

        </ScrollView>
    );
}

// --- ESTILOS (Alinhados com o ASFormScreen) ---
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f7fa',
    },
    scrollContent: {
        padding: 15,
        paddingBottom: 40,
    },
    loading: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#00315c',
        marginTop: 15,
        marginBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#ddd',
        paddingBottom: 5,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 5, 
    },
    halfInput: {
        width: '48%',
    },
    // Estilos de Input (copiados do seu ASFormScreen, mas adaptados)
    label: { 
        fontSize: 14, 
        fontWeight: '600', 
        marginBottom: 4, 
        color: '#333' 
    },
    input: {
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 8,
        padding: 12,
        marginBottom: 15, // Mantém o espaçamento
        backgroundColor: '#fff',
        minHeight: 50,
        fontSize: 16,
    },
    textArea: {
        minHeight: 100,
        textAlignVertical: 'top',
        paddingTop: 12, // Ajuste para melhor visualização do texto
    },
    // Estilos para o botão de salvar (copiados e adaptados)
    saveButton: {
        backgroundColor: '#00315c',
        padding: 15,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 25,
        marginBottom: 30,
        minHeight: 50,
        elevation: 3, 
    },
    saveButtonDisabled: {
        backgroundColor: '#6c757d', 
    },
    saveButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
});