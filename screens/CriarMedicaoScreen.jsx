import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    Platform,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useNavigation } from '@react-navigation/native'; // <--- Necessário
import { inserirMedicao } from '../services/medicaoService'; // <--- Necessário
import MessageModal from '../components/MessageModal'; // <--- Necessário

export default function CriarMedicaoScreen() {
    const navigation = useNavigation();
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

    const handleSalvar = () => {
        const medicaoToInsert = {
            data: inicio.toISOString().split('T')[0], // Convert date to YYYY-MM-DD string
            unidade: form.unidade,
            cip: form.cip,
            valor: form.valor,
            aprovador: form.dmsAprovador, // Assuming dmsAprovador is the main 'aprovador'
            bmNumber: form.bmsNumero, // Assuming bmsNumero is the main 'bmNumber'
            bms: form.bmsNumero, // Re-using bmsNumero for 'bms' column if 'bms' is just the number
            dms: form.dmsNumero, // Re-using dmsNumero for 'dms' column if 'dms' is just the number

            // Additional fields from form
            statusPgt: form.statusPgt,
            statusMed: form.statusMed,
            revisao: form.revisao,
            dmsNumero: form.dmsNumero,
            dmsData: form.dmsData, // Assuming this is already string, otherwise convert
            dmsAprovador: form.dmsAprovador,
            dmsStatus: form.dmsStatus,
            bmsNumero: form.bmsNumero,
            bmsData: form.bmsData, // Assuming this is already string, otherwise convert
            bmsAprovador: form.bmsAprovador,
            bmsStatus: form.bmsStatus,
            descricao: form.descricao,
            followUp: form.followUp,
        };

        inserirMedicao(medicaoToInsert, (result) => {
            if (result && result.insertId) {
                showMessage('Boletim salvo com sucesso!', true);
            } else {
                showMessage('Erro ao salvar boletim.');
            }
        });
    };

    const onDateChangeInicio = (event, selectedDate) => {
        const currentDate = selectedDate || inicio;
        setMostrarInicio(Platform.OS === 'ios');
        setInicio(currentDate);
        // Optionally update form.data if needed, but 'data' is the 'inicio' date for this form
    };

    const onDateChangeFim = (event, selectedDate) => {
        const currentDate = selectedDate || fim;
        setMostrarFim(Platform.OS === 'ios');
        setFim(currentDate);
    };

    return (
        <ScrollView style={criarMedicaoStyles.container} contentContainerStyle={criarMedicaoStyles.scrollContent}>
            <Text style={criarMedicaoStyles.title}>Informações Gerais</Text>

            <Text>Unidade *</Text>
            <View style={criarMedicaoStyles.pickerContainer}>
                <Picker selectedValue={form.unidade} onValueChange={(item) => handleChange('unidade', item)}>
                    <Picker.Item label="Selecione..." value="" />
                    {unidades.map((u) => <Picker.Item key={u} label={u} value={u} />)}
                </Picker>
            </View>

            <Text>Início *</Text>
            <TouchableOpacity onPress={() => setMostrarInicio(true)} style={criarMedicaoStyles.input}>
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
            <TouchableOpacity onPress={() => setMostrarFim(true)} style={criarMedicaoStyles.input}>
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
            <TextInput style={criarMedicaoStyles.input} value={form.cip} onChangeText={(v) => handleChange('cip', v)} />

            <Text>Status Pgto</Text>
            <View style={criarMedicaoStyles.pickerContainer}>
                <Picker selectedValue={form.statusPgt} onValueChange={(item) => handleChange('statusPgt', item)}>
                    <Picker.Item label="Selecione..." value="" />
                    {statusOpcoes.map((s) => <Picker.Item key={s} label={s} value={s} />)}
                </Picker>
            </View>

            <Text>Status Med</Text>
            <View style={criarMedicaoStyles.pickerContainer}>
                <Picker selectedValue={form.statusMed} onValueChange={(item) => handleChange('statusMed', item)}>
                    <Picker.Item label="Selecione..." value="" />
                    {statusOpcoes.map((s) => <Picker.Item key={s} label={s} value={s} />)}
                </Picker>
            </View>

            <Text>Revisão</Text>
            <TextInput style={criarMedicaoStyles.input} keyboardType="numeric" value={form.revisao} onChangeText={(v) => handleChange('revisao', v)} />

            <Text style={criarMedicaoStyles.title}>DMS</Text>
            <TextInput style={criarMedicaoStyles.input} placeholder="Número" value={form.dmsNumero} onChangeText={(v) => handleChange('dmsNumero', v)} />
            <TextInput style={criarMedicaoStyles.input} placeholder="Data" value={form.dmsData} onChangeText={(v) => handleChange('dmsData', v)} />
            <TextInput style={criarMedicaoStyles.input} placeholder="Aprovador" value={form.dmsAprovador} onChangeText={(v) => handleChange('dmsAprovador', v)} />
            <TextInput style={criarMedicaoStyles.input} placeholder="Status" value={form.dmsStatus} onChangeText={(v) => handleChange('dmsStatus', v)} />

            <Text style={criarMedicaoStyles.title}>BMS</Text>
            <TextInput style={criarMedicaoStyles.input} placeholder="Número" value={form.bmsNumero} onChangeText={(v) => handleChange('bmsNumero', v)} />
            <TextInput style={criarMedicaoStyles.input} placeholder="Data" value={form.bmsData} onChangeText={(v) => handleChange('bmsData', v)} />
            <TextInput style={criarMedicaoStyles.input} placeholder="Aprovador" value={form.bmsAprovador} onChangeText={(v) => handleChange('bmsAprovador', v)} />
            <TextInput style={criarMedicaoStyles.input} placeholder="Status" value={form.bmsStatus} onChangeText={(v) => handleChange('bmsStatus', v)} />

            <Text>Descrição</Text>
            <TextInput style={criarMedicaoStyles.input} value={form.descricao} onChangeText={(v) => handleChange('descricao', v)} />

            <Text>Follow Up</Text>
            <TextInput style={criarMedicaoStyles.input} value={form.followUp} onChangeText={(v) => handleChange('followUp', v)} />

            <Text>Valor</Text>
            <TextInput style={criarMedicaoStyles.input} keyboardType="numeric" value={form.valor} onChangeText={(v) => handleChange('valor', v)} />

            <TouchableOpacity style={criarMedicaoStyles.saveButton} onPress={handleSalvar}>
                <Text style={criarMedicaoStyles.saveButtonText}>Salvar</Text>
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

const criarMedicaoStyles = StyleSheet.create({
    container: { padding: 16, backgroundColor: '#fff' },
    scrollContent: { paddingBottom: 40 },
    title: { fontSize: 18, fontWeight: 'bold', marginVertical: 12 },
    input: {
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 5,
        padding: 8,
        marginBottom: 12,
        minHeight: 40, // Ensure touchable area
        justifyContent: 'center', // Center text vertically for touchable inputs
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