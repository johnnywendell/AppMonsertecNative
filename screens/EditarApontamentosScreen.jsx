import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
  ActivityIndicator,
  Modal,
  TouchableWithoutFeedback,
  Animated,
  Easing
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useNavigation, useRoute } from '@react-navigation/native';
import {
  atualizarApontamento,
  buscarApontamentoPorId,
  fetchAreas,
  fetchProjetos,
  fetchColaboradores,
} from '../services/apontamentosService';
import MessageModal from '../components/MessageModal';
import NetInfo from '@react-native-community/netinfo';
import ColaboradorModal from '../components/ColaboradorModal';

const PRIMARY = '#00315c';

export default function EditarApontamentosScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { id } = route.params;

  const [form, setForm] = useState({
    data: new Date(),
    area: '',
    disciplina: '',
    projeto: '',
    observacoes: '',
    efetivos: [{ colaborador: '', status: '', lider: '0' }],
  });
  const [mostrarData, setMostrarData] = useState(false);
  const [areas, setAreas] = useState([]);
  const [projetos, setProjetos] = useState([]);
  const [colaboradores, setColaboradores] = useState([]);
  const [isOnline, setIsOnline] = useState(true);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  const [navigateOnClose, setNavigateOnClose] = useState(false);
  const [showColaboradorModal, setShowColaboradorModal] = useState(false);
  const [selectedEfetivoIndex, setSelectedEfetivoIndex] = useState(null);

  // Novos estados para os modais personalizados
  const [showAreaModal, setShowAreaModal] = useState(false);
  const [showDisciplinaModal, setShowDisciplinaModal] = useState(false);
  const [showProjetoModal, setShowProjetoModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showLiderModal, setShowLiderModal] = useState(false);
  const [currentEfetivoIndex, setCurrentEfetivoIndex] = useState(0);

  // Use ref para controlar a navegação de forma mais confiável
  const shouldNavigate = useRef(false);

  const disciplinas = [
    { label: 'ANDAIME', value: 'AND' },
    { label: 'PINTURA', value: 'PIN' },
    { label: 'ISOLAMENTO', value: 'ISO' },
  ];
  const statusOptions = ['PRESENTE', 'FALTA', 'FÉRIAS', 'EXAMES', 'TREINAMENTO'];
  const liderOptions = [
    { label: 'NÃO', value: '0' },
    { label: 'SIM', value: '1' },
  ];

  useEffect(() => {
    const loadData = async () => {
      const netInfo = await NetInfo.fetch();
      setIsOnline(netInfo.isConnected);

      try {
        setLoading(true);
        const [fetchedAreas, fetchedProjetos, fetchedColaboradores, apontamentoData] = await Promise.all([
          fetchAreas(),
          fetchProjetos(),
          fetchColaboradores(),
          buscarApontamentoPorId(id),
        ]);

        console.log('Dados do apontamento:', apontamentoData);

        setAreas(fetchedAreas || []);
        setProjetos(fetchedProjetos || []);
        setColaboradores(fetchedColaboradores || []);

        if (apontamentoData) {
          setForm({
            data: apontamentoData.data
              ? new Date(apontamentoData.data + "T00:00:00")
              : new Date(),
            area: apontamentoData.area ? String(apontamentoData.area) : '',
            disciplina: apontamentoData.disciplina || '',
            projeto: apontamentoData.projeto ? String(apontamentoData.projeto) : '',
            observacoes: apontamentoData.observacoes || '',
            efetivos:
              (apontamentoData.apontamentos || []).map((e) => ({
                colaborador: e.colaborador ? String(e.colaborador) : '',
                status: e.status || '',
                lider: e.lider || '0',
              })) || [{ colaborador: '', status: '', lider: '0' }],
          });
        } else {
          setModalMessage('Apontamento não encontrado.');
          setModalVisible(true);
        }
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
        setModalMessage('Erro ao carregar dados. Tente novamente.');
        setModalVisible(true);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [id]);

  const atualizarEfetivo = (index, campo, valor) => {
    setForm((prev) => {
      const novosEfetivos = [...prev.efetivos];
      novosEfetivos[index] = { ...novosEfetivos[index], [campo]: valor };
      return { ...prev, efetivos: novosEfetivos };
    });
  };

  const adicionarEfetivo = () => {
    setForm((prev) => ({
      ...prev,
      efetivos: [...prev.efetivos, { colaborador: '', status: '', lider: '0' }],
    }));
  };

  const removerEfetivo = (index) => {
    setForm((prev) => ({
      ...prev,
      efetivos: prev.efetivos.filter((_, i) => i !== index),
    }));
  };

  const handleSalvar = async () => {
    if (
      !form.data ||
      !form.area ||
      !form.disciplina ||
      !form.projeto ||
      form.efetivos.some((e) => !e.colaborador || !e.status)
    ) {
      setModalMessage('Por favor, preencha todos os campos obrigatórios.');
      setModalVisible(true);
      return;
    }

    const apontamento = {
      id,
      data: form.data.toISOString().split('T')[0],
      area: parseInt(form.area),
      projeto_cod: parseInt(form.projeto),
      disciplina: form.disciplina,
      obs: form.observacoes,
      apontamentos: form.efetivos.map((e) => ({
        colaborador: parseInt(e.colaborador),
        status: e.status,
        lider: e.lider,
      })),
    };

    try {
      setLoading(true);
      const result = await atualizarApontamento(apontamento, form.efetivos);

      if (result && (result.id || result.insertId)) {
        setModalMessage(`Apontamento atualizado ${isOnline ? 'e sincronizado' : 'localmente'} com sucesso!`);
        setNavigateOnClose(true);
      } else {
        setModalMessage('Erro ao atualizar apontamento.');
      }
      setModalVisible(true);
    } catch (error) {
      setModalMessage('Erro ao atualizar apontamento: ' + error.message);
      setModalVisible(true);
    } finally {
      setLoading(false);
    }

  };


  // Componente para os modais de seleção personalizados
  const CustomPickerModal = ({ visible, onClose, options, onSelect, selectedValue, title }) => {
    const [animation] = useState(new Animated.Value(0));

    useEffect(() => {
      if (visible) {
        Animated.timing(animation, {
          toValue: 1,
          duration: 300,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true
        }).start();
      } else {
        Animated.timing(animation, {
          toValue: 0,
          duration: 200,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true
        }).start();
      }
    }, [visible]);

    const translateY = animation.interpolate({
      inputRange: [0, 1],
      outputRange: [300, 0]
    });

    const opacity = animation.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 1]
    });

    return (
      <Modal
        visible={visible}
        transparent={true}
        animationType="none"
        onRequestClose={onClose}
      >
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
                  style={[
                    styles.modalOption,
                    selectedValue === option.value && styles.modalOptionSelected
                  ]}
                  onPress={() => {
                    onSelect(option.value);
                    onClose();
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.modalOptionText,
                    selectedValue === option.value && styles.modalOptionTextSelected
                  ]}>
                    {option.label}
                  </Text>
                  {selectedValue === option.value && (
                    <Text style={styles.selectedIcon}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </Animated.View>
      </Modal>
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Editar Apontamento</Text>
      <Text style={[styles.status, { color: isOnline ? '#28a745' : '#dc3545' }]}>
        {isOnline ? 'Online' : 'Offline'}
      </Text>

      {loading && <ActivityIndicator size="large" color={PRIMARY} />}

      <Text style={styles.label}>Data *</Text>
      <TouchableOpacity onPress={() => setMostrarData(true)} style={styles.input}>
        <Text>{form.data.toLocaleDateString('pt-BR')}</Text>
      </TouchableOpacity>
      {mostrarData && (
        <DateTimePicker
          value={form.data}
          mode="date"
          display="default"
          onChange={(event, selectedDate) => {
            setMostrarData(Platform.OS === 'ios');
            if (selectedDate) setForm((prev) => ({ ...prev, data: selectedDate }));
          }}
        />
      )}

      <Text style={styles.label}>Área *</Text>
      <TouchableOpacity
        style={styles.input}
        onPress={() => setShowAreaModal(true)}
      >
        <Text style={form.area ? styles.selectedText : styles.placeholderText}>
          {form.area ? areas.find(a => String(a.id) === form.area)?.area || `Área ${form.area}` : 'Selecione uma área'}
        </Text>
      </TouchableOpacity>

      <Text style={styles.label}>Disciplina *</Text>
      <TouchableOpacity
        style={styles.input}
        onPress={() => setShowDisciplinaModal(true)}
      >
        <Text style={form.disciplina ? styles.selectedText : styles.placeholderText}>
          {form.disciplina ? disciplinas.find(d => d.value === form.disciplina)?.label : 'Selecione uma disciplina'}
        </Text>
      </TouchableOpacity>

      <Text style={styles.label}>Código do Projeto *</Text>
      <TouchableOpacity
        style={styles.input}
        onPress={() => setShowProjetoModal(true)}
      >
        <Text style={form.projeto ? styles.selectedText : styles.placeholderText}>
          {form.projeto ? projetos.find(p => String(p.id) === form.projeto)?.codigo_exibicao || projetos.find(p => String(p.id) === form.projeto)?.projeto_nome : 'Selecione um projeto'}
        </Text>
      </TouchableOpacity>

      <Text style={styles.label}>Observações</Text>
      <TextInput
        style={[styles.input, { minHeight: 60, textAlignVertical: 'top' }]}
        value={form.observacoes}
        onChangeText={(text) => setForm((prev) => ({ ...prev, observacoes: text }))}
        placeholder="Digite observações"
        maxLength={255}
        multiline
      />

      <Text style={styles.title}>Efetivo</Text>
      {form.efetivos.map((efetivo, i) => (
        <View key={i} style={styles.efetivoCard}>
          <Text style={styles.label}>Colaborador *</Text>
          <TouchableOpacity
            style={styles.input}
            onPress={() => {
              setSelectedEfetivoIndex(i);
              setShowColaboradorModal(true);
            }}
          >
            <Text style={efetivo.colaborador ? styles.selectedText : styles.placeholderText}>
              {efetivo.colaborador
                ? `${colaboradores.find(c => String(c.id) === efetivo.colaborador)?.matricula || ''} - ${colaboradores.find(c => String(c.id) === efetivo.colaborador)?.nome || ''}`
                : 'Selecionar Colaborador'}
            </Text>
          </TouchableOpacity>

          <Text style={styles.label}>Status *</Text>
          <TouchableOpacity
            style={styles.input}
            onPress={() => {
              setCurrentEfetivoIndex(i);
              setShowStatusModal(true);
            }}
          >
            <Text style={efetivo.status ? styles.selectedText : styles.placeholderText}>
              {efetivo.status || 'Selecione um status'}
            </Text>
          </TouchableOpacity>

          <Text style={styles.label}>Líder *</Text>
          <TouchableOpacity
            style={styles.input}
            onPress={() => {
              setCurrentEfetivoIndex(i);
              setShowLiderModal(true);
            }}
          >
            <Text style={efetivo.lider ? styles.selectedText : styles.placeholderText}>
              {efetivo.lider ? liderOptions.find(l => l.value === efetivo.lider)?.label : 'Selecione uma opção'}
            </Text>
          </TouchableOpacity>

          {form.efetivos.length > 1 && (
            <TouchableOpacity onPress={() => removerEfetivo(i)} style={styles.removerBtn}>
              <Text style={styles.removerBtnText}>{'\u{1F5D1}'} Remover</Text>
            </TouchableOpacity>
          )}
        </View>
      ))}

      <TouchableOpacity onPress={adicionarEfetivo} style={styles.adicionarBtn}>
        <Text style={styles.adicionarBtnText}>{'\uFF0B'} Adicionar Efetivo</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.saveButton, loading && styles.saveButtonDisabled]}
        onPress={handleSalvar}
        disabled={loading}
      >
        <Text style={styles.saveButtonText}>Salvar Alterações</Text>
      </TouchableOpacity>

      {/* Modais personalizados para substituir os Pickers */}
      <CustomPickerModal
        visible={showAreaModal}
        onClose={() => setShowAreaModal(false)}
        options={[
          { label: "Selecione uma área", value: "" },
          ...areas.map(a => ({ label: a.area || `Área ${a.id}`, value: String(a.id) }))
        ]}
        onSelect={(value) => setForm(prev => ({ ...prev, area: value }))}
        selectedValue={form.area}
        title="Selecione uma área"
      />

      <CustomPickerModal
        visible={showDisciplinaModal}
        onClose={() => setShowDisciplinaModal(false)}
        options={[
          { label: "Selecione uma disciplina", value: "" },
          ...disciplinas.map(d => ({ label: d.label, value: d.value }))
        ]}
        onSelect={(value) => setForm(prev => ({ ...prev, disciplina: value }))}
        selectedValue={form.disciplina}
        title="Selecione uma disciplina"
      />

      <CustomPickerModal
        visible={showProjetoModal}
        onClose={() => setShowProjetoModal(false)}
        options={[
          { label: "Selecione um projeto", value: "" },
          ...projetos.map(p => ({
            label: p.codigo_exibicao || p.projeto_nome,
            value: String(p.id)
          }))
        ]}
        onSelect={(value) => setForm(prev => ({ ...prev, projeto: value }))}
        selectedValue={form.projeto}
        title="Selecione um projeto"
      />

      <CustomPickerModal
        visible={showStatusModal}
        onClose={() => setShowStatusModal(false)}
        options={[
          { label: "Selecione um status", value: "" },
          ...statusOptions.map(s => ({ label: s, value: s }))
        ]}
        onSelect={(value) => atualizarEfetivo(currentEfetivoIndex, 'status', value)}
        selectedValue={form.efetivos[currentEfetivoIndex]?.status}
        title="Selecione um status"
      />

      <CustomPickerModal
        visible={showLiderModal}
        onClose={() => setShowLiderModal(false)}
        options={liderOptions}
        onSelect={(value) => atualizarEfetivo(currentEfetivoIndex, 'lider', value)}
        selectedValue={form.efetivos[currentEfetivoIndex]?.lider}
        title="É líder?"
      />

      <MessageModal
        visible={modalVisible}
        message={modalMessage}
        onClose={() => {
          setModalVisible(false);
          if (navigateOnClose) navigation.goBack();
        }}
      />

      <ColaboradorModal
        visible={showColaboradorModal}
        colaboradores={colaboradores}
        onClose={() => setShowColaboradorModal(false)}
        onSelect={(colaborador) => {
          if (selectedEfetivoIndex !== null) {
            atualizarEfetivo(selectedEfetivoIndex, 'colaborador', String(colaborador.id));
          }
          setShowColaboradorModal(false);
        }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: '#fff' },
  scrollContent: { paddingBottom: 40 },
  title: { fontSize: 18, fontWeight: 'bold', marginVertical: 12 },
  status: { fontSize: 16, marginBottom: 12 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 4 },
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
  selectedText: {
    color: '#000',
  },
  placeholderText: {
    color: '#9e9e9e',
  },
  efetivoCard: {
    backgroundColor: '#eef1f6',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  removerBtn: { marginTop: 8, alignSelf: 'flex-end' },
  removerBtnText: { color: '#b00', fontSize: 14 },
  adicionarBtn: { alignItems: 'center', marginBottom: 20 },
  adicionarBtnText: { fontSize: 16, color: PRIMARY, fontWeight: '600' },
  saveButton: {
    backgroundColor: PRIMARY,
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 16,
  },
  saveButtonDisabled: {
    backgroundColor: '#9ab0c8',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Estilos aprimorados para os modais
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalOverlayContent: {
    flex: 1,
  },
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
  modalContent: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  closeButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#999',
  },
  modalScrollView: {
    maxHeight: 300,
  },
  modalOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  modalOptionSelected: {
    backgroundColor: '#e6f7ff',
  },
  modalOptionText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  modalOptionTextSelected: {
    color: '#1890ff',
    fontWeight: '500',
  },
  selectedIcon: {
    color: '#1890ff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});