import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    Platform
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRoute, useNavigation } from '@react-navigation/native'; // <--- useNavigation necessário
import { buscarMedicaoPorId, atualizarMedicao } from '../services/medicaoService'; // <--- Necessário
import MessageModal from '../components/MessageModal'; // <--- Necessário

export default function EditarMedicaoScreen() {
    const route = useRoute();
    const navigation = useNavigation();
    const { id } = route.params;

    const [inicio, setInicio] = useState(new Date());
    const [fim, setFim] = useState(new Date());
    const [mostrarInicio, setMostrarInicio] = useState(false);
    const [mostrarFim, setMostrarFim] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [modalMessage, setModalMessage] = useState('');
    const [navigateOnClose, setNavigateOnClose] = useState(false);

    const [form, setForm] = useState({
        unidade: '',
        cip: '',
        statusPgt: '',
        statusMed: '',
        revisao: '0',
        dmsNumero: '',
        dmsData: '',
        dmsAprovador: '',
        dmsStatus: '',
        bmsNumero: '',
        bmsData: '',
        bmsAprovador: '',
        bmsStatus: '',
        descricao: '',
        followUp: '',
        valor: '',
    });

    const unidades = ['Distribuição', 'Olefinas 1', 'Aromáticos 2'];
    const statusOpcoes = ['Pendente', 'Aprovado', 'Rejeitado'];

    const handleChange = (campo, valor) => {
        setForm({ ...form, [campo]: valor });
    };

    const showMessage = (message, shouldNavigate = false) => {
        setModalMessage(message);
        setModalVisible(true);
        setNavigateOnClose(shouldNavigate);
    };

    useEffect(() => {
        if (id) {
            buscarMedicaoPorId(id, (medicaoExistente) => {
                if (medicaoExistente) {
                    setForm({
                        unidade: medicaoExistente.unidade,
                        cip: medicaoExistente.cip,
                        statusPgt: medicaoExistente.statusPgt,
                        statusMed: medicaoExistente.statusMed,
                        revisao: medicaoExistente.revisao,
                        dmsNumero: medicaoExistente.dmsNumero,
                        dmsData: medicaoExistente.dmsData,
                        dmsAprovador: medicaoExistente.dmsAprovador,
                        dmsStatus: medicaoExistente.dmsStatus,
                        bmsNumero: medicaoExistente.bmsNumero,
                        bmsData: medicaoExistente.bmsData,
                        bmsAprovador: medicaoExistente.bmsAprovador,
                        bmsStatus: medicaoExistente.bmsStatus,
                        descricao: medicaoExistente.descricao,
                        followUp: medicaoExistente.followUp,
                        valor: medicaoExistente.valor,
                    });
                    // Convert stored date string back to Date object for DateTimePicker
                    if (medicaoExistente.data) {
                        setInicio(new Date(medicaoExistente.data));
                    }
                    // If 'fim' exists in DB and is distinct, set it. Otherwise, use current 'fim' state.
                    // Assuming 'fim' is not part of initial DB schema provided, mock or extend DB.
                    // For now, it will default to new Date() as no 'fim' field from DB.
                } else {
                    console.warn('Medição não encontrada para o ID:', id);
                    showMessage('Boletim não encontrado.');
                }
            });
        }
    }, [id]);

    const handleSalvar = () => {
        const medicaoToUpdate = {
            data: inicio.toISOString().split('T')[0], // Convert date to YYYY-MM-DD string
            unidade: form.unidade,
            cip: form.cip,
            valor: form.valor,
            aprovador: form.dmsAprovador,
            bmNumber: form.bmsNumero,
            bms: form.bmsNumero,
            dms: form.dmsNumero,

            statusPgt: form.statusPgt,
            statusMed: form.statusMed,
            revisao: form.revisao,
            dmsNumero: form.dmsNumero,
            dmsData: form.dmsData,
            dmsAprovador: form.dmsAprovador,
            dmsStatus: form.dmsStatus,
            bmsNumero: form.bmsNumero,
            bmsData: form.bmsData,
            bmsAprovador: form.bmsAprovador,
            bmsStatus: form.bmsStatus,
            descricao: form.descricao,
            followUp: form.followUp,
        };

        atualizarMedicao(id, medicaoToUpdate, (result) => {
            if (result && result.rowsAffected > 0) {
                showMessage('Boletim atualizado com sucesso!', true);
                navigation.goBack(); // Go back to the list screen
            } else {
                showMessage('Erro ao atualizar boletim.');
            }
        });
    };

    const onDateChangeInicio = (event, selectedDate) => {
        const currentDate = selectedDate || inicio;
        setMostrarInicio(Platform.OS === 'ios');
        setInicio(currentDate);
    };

    const onDateChangeFim = (event, selectedDate) => {
        const currentDate = selectedDate || fim;
        setMostrarFim(Platform.OS === 'ios');
        setFim(currentDate);
    };

    return (
        <ScrollView style={editarMedicaoStyles.container} contentContainerStyle={editarMedicaoStyles.scrollContent}>
            <Text style={editarMedicaoStyles.title}>Editar Boletim de Medição</Text>

            <Text>Unidade *</Text>
            <View style={editarMedicaoStyles.pickerContainer}>
                <Picker selectedValue={form.unidade} onValueChange={(item) => handleChange('unidade', item)}>
                    <Picker.Item label="Selecione..." value="" />
                    {unidades.map((u) => <Picker.Item key={u} label={u} value={u} />)}
                </Picker>
            </View>

            <Text>Início *</Text>
            <TouchableOpacity onPress={() => setMostrarInicio(true)} style={editarMedicaoStyles.input}>
                <Text>{inicio.toLocaleDateString('pt-BR')}</Text>
            </TouchableOpacity>
            {mostrarInicio && (
                <DateTimePicker
                    value={inicio}
                    mode="date"
                    display="default"
                    onChange={onDateChangeInicio}
                />
            )}

            <Text>Fim</Text>
            <TouchableOpacity onPress={() => setMostrarFim(true)} style={editarMedicaoStyles.input}>
                <Text>{fim.toLocaleDateString('pt-BR')}</Text>
            </TouchableOpacity>
            {mostrarFim && (
                <DateTimePicker
                    value={fim}
                    mode="date"
                    display="default"
                    onChange={onDateChangeFim}
                />
            )}

            <Text>CIP</Text>
            <TextInput style={editarMedicaoStyles.input} value={form.cip} onChangeText={(v) => handleChange('cip', v)} />

            <Text>Status Pgto</Text>
            <View style={editarMedicaoStyles.pickerContainer}>
                <Picker selectedValue={form.statusPgt} onValueChange={(item) => handleChange('statusPgt', item)}>
                    <Picker.Item label="Selecione..." value="" />
                    {statusOpcoes.map((s) => <Picker.Item key={s} label={s} value={s} />)}
                </Picker>
            </View>

            <Text>Status Med</Text>
            <View style={editarMedicaoStyles.pickerContainer}>
                <Picker selectedValue={form.statusMed} onValueChange={(item) => handleChange('statusMed', item)}>
                    <Picker.Item label="Selecione..." value="" />
                    {statusOpcoes.map((s) => <Picker.Item key={s} label={s} value={s} />)}
                </Picker>
            </View>

            <Text>Revisão</Text>
            <TextInput style={editarMedicaoStyles.input} keyboardType="numeric" value={form.revisao} onChangeText={(v) => handleChange('revisao', v)} />

            <Text style={editarMedicaoStyles.title}>DMS</Text>
            <TextInput style={editarMedicaoStyles.input} placeholder="Número" value={form.dmsNumero} onChangeText={(v) => handleChange('dmsNumero', v)} />
            <TextInput style={editarMedicaoStyles.input} placeholder="Data" value={form.dmsData} onChangeText={(v) => handleChange('dmsData', v)} />
            <TextInput style={editarMedicaoStyles.input} placeholder="Aprovador" value={form.dmsAprovador} onChangeText={(v) => handleChange('dmsAprovador', v)} />
            <TextInput style={editarMedicaoStyles.input} placeholder="Status" value={form.dmsStatus} onChangeText={(v) => handleChange('dmsStatus', v)} />

            <Text style={editarMedicaoStyles.title}>BMS</Text>
            <TextInput style={editarMedicaoStyles.input} placeholder="Número" value={form.bmsNumero} onChangeText={(v) => handleChange('bmsNumero', v)} />
            <TextInput style={editarMedicaoStyles.input} placeholder="Data" value={form.bmsData} onChangeText={(v) => handleChange('bmsData', v)} />
            <TextInput style={editarMedicaoStyles.input} placeholder="Aprovador" value={form.bmsAprovador} onChangeText={(v) => handleChange('bmsAprovador', v)} />
            <TextInput style={editarMedicaoStyles.input} placeholder="Status" value={form.bmsStatus} onChangeText={(v) => handleChange('bmsStatus', v)} />

            <Text>Descrição</Text>
            <TextInput style={editarMedicaoStyles.input} value={form.descricao} onChangeText={(v) => handleChange('descricao', v)} />

            <Text>Follow Up</Text>
            <TextInput style={editarMedicaoStyles.input} value={form.followUp} onChangeText={(v) => handleChange('followUp', v)} />

            <Text>Valor</Text>
            <TextInput style={editarMedicaoStyles.input} keyboardType="numeric" value={form.valor} onChangeText={(v) => handleChange('valor', v)} />

            <TouchableOpacity style={editarMedicaoStyles.saveButton} onPress={handleSalvar}>
                <Text style={editarMedicaoStyles.saveButtonText}>Salvar Alterações</Text>
            </TouchableOpacity>

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

const editarMedicaoStyles = StyleSheet.create({
    container: { padding: 16, backgroundColor: '#fff' },
    scrollContent: { paddingBottom: 40 },
    title: { fontSize: 18, fontWeight: 'bold', marginVertical: 12 },
    input: {
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 5,
        padding: 8,
        marginBottom: 12,
        minHeight: 40,
        justifyContent: 'center',
    },
    pickerContainer: {
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 5,
        marginBottom: 12,
    },
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
});
