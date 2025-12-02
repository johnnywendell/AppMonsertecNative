import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  StyleSheet,
  Alert,
  ScrollView,
  TouchableOpacity,
  Platform,
  Switch,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  TouchableWithoutFeedback,
  Animated,
  Easing,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { criarRelatorio, listarAreas } from '../services/relatorioQualidadeService';
import NetInfo from '@react-native-community/netinfo';
import * as FileSystem from 'expo-file-system';

const PRIMARY = '#16356C';

function Section({ title, collapsed, onToggle, children }) {
  return (
    <View style={styles.section}>
      <TouchableOpacity onPress={onToggle} style={styles.sectionHeader} accessibilityRole="button">
        <Text style={styles.sectionTitle}>{title}</Text>
        <Text style={styles.sectionToggle}>{collapsed ? '+' : '−'}</Text>
      </TouchableOpacity>
      {!collapsed && <View style={styles.sectionBody}>{children}</View>}
    </View>
  );
}

function LabeledInput({ label, error, restrictNA, ...props }) {
  return (
    <View style={styles.field}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        style={[styles.input, error && styles.inputError]}
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

function DateButton({ label, value, onPress, error }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity onPress={onPress} style={[styles.dateButton, error && styles.inputError]}>
        <Text>{value ? (value instanceof Date ? value.toLocaleString() : String(value)) : 'Selecionar'}</Text>
      </TouchableOpacity>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

// Custom Picker Modal Component
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

export default function CriarRelatorioQualidade() {
  const navigation = useNavigation();
  const [relatorio, setRelatorio] = useState({
    cliente: '',
    data: new Date(),
    rec: '',
    nota: '',
    tag: '',
    tipo_serv: '',
    inspetor: '',
    fiscal: '',
    unidade: '',
    contrato: '',
    setor: '',
    corrosividade: '',
    inicio: new Date(),
    termino: new Date(),
    temp_ambiente: '',
    ura: '',
    po: '',
    temp_super: '',
    intemperismo: '',
    descontaminacao: '',
    poeira_tam: '',
    poeira_quant: '',
    teor_sais: '',
    ambiente_pintura: '',
    rugosidade: '',
    laudo: 1,
    rnc_n: 0,
    obs_inst: '',
    obs_final: '',
    aprovado: 1,
    m2: '',
    checklist_n: '',
    relatorios: [],
    relatorio: [],
    preparacaoSuperficie: { tratamento: '', tipo_subs: '', ambiente_pintura: '', rugosidade: '' },
  });

  const [areas, setAreas] = useState([]);
  const [sections, setSections] = useState({
    gerais: false,
    unidade: true,
    condicoes: false,
    preparacao: false,
    etapas: false,
    fotos: false,
    inspeccao: true,
  });
  const [datePicker, setDatePicker] = useState({ visible: false, field: null, index: null });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [isOnline, setIsOnline] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  // Modal states for custom pickers
  const [showTipoServModal, setShowTipoServModal] = useState(false);
  const [showUnidadeModal, setShowUnidadeModal] = useState(false);
  const [showCorrosividadeModal, setShowCorrosividadeModal] = useState(false);
  const [showAmbientePinturaModal, setShowAmbientePinturaModal] = useState(false);

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

  const corrosividadeOptions = [
    { label: 'Selecione', value: '' },
    { label: 'C1', value: 'C1' },
    { label: 'C2', value: 'C2' },
    { label: 'C3', value: 'C3' },
    { label: 'C4', value: 'C4' },
    { label: 'C5', value: 'C5' },
    { label: 'C6', value: 'C6' },
  ];

  const ambientePinturaOptions = [
    { label: 'Selecione', value: '' },
    { label: 'INTERNO', value: 'INTERNO' },
    { label: 'EXTERNO', value: 'EXTERNO' },
  ];

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOnline(state.isConnected);
    });

    const loadAreas = async () => {
      try {
        setLoading(true);
        const data = await listarAreas();
        setAreas(data || []);
        if (!data || data.length === 0) {
          setErrorMessage('Nenhuma unidade disponível. Verifique sua conexão ou tente novamente.');
        }
      } catch (err) {
        if (err.message.includes('permissão')) {
          setErrorMessage('Você não tem permissão para visualizar unidades.');
        } else {
          setErrorMessage('Não foi possível carregar unidades. Usando dados locais, se disponíveis.');
        }
      } finally {
        setLoading(false);
      }
    };
    loadAreas();

    return () => unsubscribe();
  }, []);

  const validate = useCallback(() => {
    const e = {};
    if (!relatorio.cliente?.trim()) e.cliente = 'Cliente é obrigatório';
    if (relatorio.cliente?.toUpperCase() === 'N/A') e.cliente = 'Cliente não pode ser "N/A"';
    if (!relatorio.data) e.data = 'Data é obrigatória';
    if (!relatorio.rec?.trim()) e.rec = 'Rec é obrigatório';
    if (relatorio.rec?.toUpperCase() === 'N/A') e.rec = 'Rec não pode ser "N/A"';
    if (!relatorio.nota?.trim()) e.nota = 'Nota é obrigatória';
    if (relatorio.nota?.toUpperCase() === 'N/A') e.nota = 'Nota não pode ser "N/A"';
    if (!relatorio.tag?.trim()) e.tag = 'Tag é obrigatório';
    if (relatorio.tag?.toUpperCase() === 'N/A') e.tag = 'Tag não pode ser "N/A"';
    if (!relatorio.tipo_serv) e.tipo_serv = 'Tipo de serviço é obrigatório';
    if (!relatorio.unidade) e.unidade = 'Unidade é obrigatória';
    if (!relatorio.setor?.trim()) e.setor = 'Setor é obrigatório';
    if (relatorio.setor?.toUpperCase() === 'N/A') e.setor = 'Setor não pode ser "N/A"';
    if (!relatorio.corrosividade) e.corrosividade = 'Corrosividade é obrigatória';
    if (!relatorio.m2?.trim()) e.m2 = 'Metro quadrado é obrigatório';
    if (relatorio.m2?.toUpperCase() === 'N/A') e.m2 = 'Metro quadrado não pode ser "N/A"';
    if (relatorio.relatorios.length > 3) {
      e.etapas = 'Máximo de 3 etapas de pintura permitido';
    }
    if (relatorio.relatorios.some((etapa) => !etapa.tinta?.trim() || etapa.tinta.toUpperCase() === 'N/A')) {
      e.etapas = 'Todas as etapas devem ter o campo Tinta preenchido e não pode ser "N/A"';
    }
    if (!relatorio.preparacaoSuperficie.tratamento?.trim()) e.tratamento = 'Tratamento é obrigatório';
    if (relatorio.preparacaoSuperficie.tratamento?.toUpperCase() === 'N/A')
      e.tratamento = 'Tratamento não pode ser "N/A"';
    if (!relatorio.preparacaoSuperficie.tipo_subs?.trim()) e.tipo_subs = 'Tipo do substrato é obrigatório';
    if (relatorio.preparacaoSuperficie.tipo_subs?.toUpperCase() === 'N/A')
      e.tipo_subs = 'Tipo do substrato não pode ser "N/A"';
    setErrors(e);
    return Object.keys(e).length === 0;
  }, [relatorio]);

  const handleChange = (field, value) => setRelatorio((prev) => ({ ...prev, [field]: value }));

  const adicionarEtapa = () => {
    if (relatorio.relatorios.length >= 3) {
      Alert.alert('Limite Atingido', 'Você pode adicionar no máximo 3 etapas de pintura.');
      return;
    }

    const cores = [
      '#F5F8FC', // azul bem clarinho (derivado do navyblue)
      '#F9FCF5', // verde bem clarinho (derivado do limegreen)
      '#FFF8F3'  // laranja bem clarinho (derivado do carrot orange)
    ];

    setRelatorio((prev) => ({
      ...prev,
      relatorios: [
        ...prev.relatorios,
        {
          tinta: '',
          lote_a: '',
          val_a: new Date(),
          lote_b: '',
          val_b: new Date(),
          lote_c: '',
          val_c: new Date(),
          cor_munsell: '',
          temp_amb: '',
          ura: '',
          po: '',
          temp_substrato: '',
          diluente: '',
          met_aplic: '',
          inicio: new Date(),
          termino: new Date(),
          inter_repintura: '',
          epe: '',
          eps: '',
          insp_visual: '',
          aderencia: '',
          holiday: '',
          laudo: '',
          data_insp: new Date(),
          pintor: '',
          corFundo: cores[relatorio.relatorios.length % cores.length], // define a cor baseada na posição
        },
      ],
    }));
    setSections((prev) => ({ ...prev, etapas: false }));
  };

  const updateEtapa = (idx, field, value) => {
    const etapas = [...relatorio.relatorios];
    etapas[idx] = { ...etapas[idx], [field]: value };
    setRelatorio({ ...relatorio, relatorios: etapas });
  };

  const updatePreparacao = (field, value) => {
    if (field !== 'ambiente_pintura' && value.toUpperCase() === 'N/A') {
      Alert.alert('Erro', `O campo ${field} não pode ser "N/A".`);
      return;
    }
    setRelatorio((prev) => ({
      ...prev,
      preparacaoSuperficie: { ...prev.preparacaoSuperficie, [field]: value },
    }));
  };

  const adicionarFoto = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permissão', 'Permita o acesso à galeria.');
        return;
      }

      let mediaTypes = 'Images';
      if (ImagePicker?.MediaType?.PHOTO) {
        mediaTypes = ImagePicker.MediaType.PHOTO;
      } else if (ImagePicker?.MediaTypeOptions?.Images) {
        mediaTypes = ImagePicker.MediaTypeOptions.Images;
      }

      const launchOptions = {
        allowsEditing: false,
        quality: 0.6,
        mediaTypes,
      };

      const result = await ImagePicker.launchImageLibraryAsync(launchOptions);
      const wasCancelled = result?.canceled ?? result?.cancelled ?? false;
      const assets = result?.assets ?? (result?.uri ? [{ uri: result.uri }] : null);

      if (wasCancelled || !assets || assets.length === 0) return;

      const asset = assets[0];
      const uri = asset?.uri ?? asset;

      if (!uri) return;

      setRelatorio((prev) => ({
        ...prev,
        relatorio: Array.isArray(prev.relatorio) ? [...prev.relatorio, { photo: uri }] : [{ photo: uri }],
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
          setRelatorio((prev) => ({
            ...prev,
            relatorio: prev.relatorio.filter((_, i) => i !== idx),
          })),
      },
    ]);
  };

  const encodePhotosToBase64 = async (photos = []) => {
    return Promise.all(
      photos.map(async (p, idx) => {
        try {
          const base64 = await FileSystem.readAsStringAsync(p.photo, {
            encoding: FileSystem.EncodingType.Base64,
          });
          const extMatch = p.photo.match(/\.(\w+)(\?.*)?$/);
          const ext = extMatch ? extMatch[1].toLowerCase() : 'jpg';
          const filename = `photo_${Date.now()}_${idx}.${ext}`;
          const content_type = ext === 'png' ? 'image/png' : 'image/jpeg';
          return { filename, content_type, content_base64: base64 };
        } catch (err) {
          console.warn('Erro ao converter imagem para base64', p.photo, err);
          return null;
        }
      })
    );
  };

  const openDate = (field, index = null) => {
    const current =
      (index !== null && relatorio.relatorios[index] && relatorio.relatorios[index][field]) ||
      relatorio[field] ||
      new Date();

    if (Platform.OS === 'android' && DateTimePickerAndroid && DateTimePickerAndroid.open) {
      const needsDateTime = ['inicio', 'termino'].includes(field);
      if (needsDateTime) {
        DateTimePickerAndroid.open({
          value: current,
          mode: 'date',
          onChange: (event, selectedDate) => {
            if (!event || event.type === 'dismissed' || !selectedDate) return;
            DateTimePickerAndroid.open({
              value: selectedDate,
              mode: 'time',
              is24Hour: true,
              onChange: (evtTime, selectedTime) => {
                if (!evtTime || evtTime.type === 'dismissed' || !selectedTime) return;
                const combined = new Date(selectedDate);
                combined.setHours(selectedTime.getHours(), selectedTime.getMinutes(), selectedTime.getSeconds());
                if (index === null) {
                  setRelatorio((prev) => ({ ...prev, [field]: combined }));
                } else {
                  const etapas = [...relatorio.relatorios];
                  etapas[index] = { ...etapas[index], [field]: combined };
                  setRelatorio((prev) => ({ ...prev, relatorios: etapas }));
                }
              },
            });
          },
        });
      } else {
        DateTimePickerAndroid.open({
          value: current,
          mode: 'date',
          onChange: (event, selectedDate) => {
            if (!event || event.type === 'dismissed' || !selectedDate) return;
            if (index === null) {
              setRelatorio((prev) => ({ ...prev, [field]: selectedDate }));
            } else {
              const etapas = [...relatorio.relatorios];
              etapas[index] = { ...etapas[index], [field]: selectedDate };
              setRelatorio((prev) => ({ ...prev, relatorios: etapas }));
            }
          },
        });
      }
      return;
    }

    setDatePicker({ visible: true, field, index });
  };

  const onDateChange = (event, selectedDate) => {
    if (!event || event.type === 'dismissed' || !selectedDate) {
      setDatePicker({ visible: false, field: null, index: null });
      return;
    }

    const { field, index } = datePicker;
    if (index === null) {
      setRelatorio((prev) => ({ ...prev, [field]: selectedDate }));
    } else {
      const etapas = [...relatorio.relatorios];
      etapas[index] = { ...etapas[index], [field]: selectedDate };
      setRelatorio((prev) => ({ ...prev, relatorios: etapas }));
    }
    setDatePicker({ visible: false, field: null, index: null });
  };

  const formatDateOnly = (date) => {
    if (!date) return null;
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formatDateTimeWithOffset = (date) => {
    if (!date) return null;
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');
    const tzOffset = -d.getTimezoneOffset();
    const sign = tzOffset >= 0 ? '+' : '-';
    const absOffset = Math.abs(tzOffset);
    const offsetHours = String(Math.floor(absOffset / 60)).padStart(2, '0');
    const offsetMinutes = String(absOffset % 60).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}${sign}${offsetHours}:${offsetMinutes}`;
  };

  const submit = async () => {
    if (!validate()) {
      Alert.alert('Corrija os erros', 'Preencha todos os campos obrigatórios corretamente.');
      return;
    }
    setLoading(true);
    try {
      const preparacao = relatorio.preparacaoSuperficie || {};
      let encodedPhotos = [];
      if (relatorio.relatorio && relatorio.relatorio.length > 0) {
        encodedPhotos = (await encodePhotosToBase64(relatorio.relatorio)).filter(Boolean);
      }
      const fotosParaEnvio = encodedPhotos.map((foto) => ({
        photo: foto,
      }));
      const payload = {
        cliente: relatorio.cliente || null,
        data: relatorio.data instanceof Date ? relatorio.data.toISOString().split('T')[0] : relatorio.data || null,
        rec: relatorio.rec || null,
        nota: relatorio.nota || null,
        tag: relatorio.tag || null,
        tipo_serv: relatorio.tipo_serv || null,
        unidade: relatorio.unidade ? parseInt(relatorio.unidade) : null,
        contrato: relatorio.contrato || null,
        setor: relatorio.setor || null,
        corrosividade: relatorio.corrosividade || null,
        fiscal: relatorio.fiscal || null,
        inspetor: relatorio.inspetor || null,
        inicio: formatDateTimeWithOffset(relatorio.inicio),
        termino: formatDateTimeWithOffset(relatorio.termino),
        tratamento: preparacao.tratamento || null,
        tipo_subs: preparacao.tipo_subs || null,
        temp_ambiente: relatorio.temp_ambiente || null,
        ura: relatorio.ura || null,
        po: relatorio.po || null,
        temp_super: relatorio.temp_super || null,
        intemperismo: relatorio.intemperismo || null,
        descontaminacao: relatorio.descontaminacao || null,
        poeira_tam: relatorio.poeira_tam || null,
        poeira_quant: relatorio.poeira_quant || null,
        teor_sais: relatorio.teor_sais || null,
        ambiente_pintura: preparacao.ambiente_pintura || null,
        rugosidade: preparacao.rugosidade || null,
        laudo: Boolean(relatorio.laudo),
        rnc_n: Boolean(relatorio.rnc_n),
        obs_inst: relatorio.obs_inst || null,
        obs_final: relatorio.obs_final || null,
        aprovado: Boolean(relatorio.aprovado),
        m2: relatorio.m2 ? parseFloat(relatorio.m2) : null,
        checklist_n: relatorio.checklist_n || null,
        relatorios: relatorio.relatorios.map((e) => ({
          tinta: e.tinta || null,
          lote_a: e.lote_a || null,
          val_a: e.val_a instanceof Date ? e.val_a.toISOString().split('T')[0] : e.val_a || null,
          lote_b: e.lote_b || null,
          val_b: e.val_b instanceof Date ? e.val_b.toISOString().split('T')[0] : e.val_b || null,
          lote_c: e.lote_c || null,
          val_c: e.val_c instanceof Date ? e.val_c.toISOString().split('T')[0] : e.val_c || null,
          cor_munsell: e.cor_munsell || null,
          temp_amb: e.temp_amb || null,
          ura: e.ura || null,
          po: e.po || null,
          temp_substrato: e.temp_substrato || null,
          diluente: e.diluente || null,
          met_aplic: e.met_aplic || null,
          inicio: formatDateTimeWithOffset(e.inicio),
          termino: formatDateTimeWithOffset(e.termino),
          inter_repintura: e.inter_repintura || null,
          epe: e.epe || null,
          eps: e.eps || null,
          insp_visual: e.insp_visual || null,
          aderencia: e.aderencia || null,
          holiday: e.holiday || null,
          laudo: e.laudo === 'APROVADO' ? '1' : '0',
          data_insp: e.data_insp instanceof Date ? e.data_insp.toISOString().split('T')[0] : e.data_insp || null,
          pintor: e.pintor || null,
        })),
        relatorio: fotosParaEnvio,
      };
      console.log('Payload final para envio:', JSON.stringify(payload, null, 2));

      await criarRelatorio(payload, (result) => {
        const message = result.insertId
          ? 'Relatório salvo localmente e será sincronizado quando houver conexão.'
          : 'Relatório criado com sucesso!';
        Alert.alert('Sucesso', message, [{ text: 'OK', onPress: () => navigation.goBack() }]);
      });
    } catch (error) {
      console.error('Erro detalhado:', error);
      console.error('Erro response:', error.response);
      let errorMsg = 'Erro ao criar relatório. Salvo localmente para sincronização posterior.';
      if (error.message.includes('permissão')) {
        errorMsg = error.message;
      } else if (error.response?.data) {
        const serverErrors = error.response.data;
        if (typeof serverErrors === 'string') {
          errorMsg = serverErrors;
        } else if (serverErrors.detail) {
          errorMsg = serverErrors.detail;
        } else {
          const fieldErrors = Object.entries(serverErrors)
            .map(([field, errors]) => `${field}: ${Array.isArray(errors) ? errors.join(', ') : errors}`)
            .join('\n');
          errorMsg = fieldErrors || errorMsg;
        }
      }
      Alert.alert('Erro', errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const toggleSection = (key) => setSections((prev) => ({ ...prev, [key]: !prev[key] }));

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
            <Section title="Informações Gerais" collapsed={sections.gerais} onToggle={() => toggleSection('gerais')}>
              <LabeledInput
                label="Cliente *"
                placeholder="Nome do cliente"
                value={relatorio.cliente}
                onChangeText={(text) => handleChange('cliente', text)}
                error={errors.cliente}
                restrictNA
              />
              <DateButton
                label="Data do Serviço *"
                value={relatorio.data.toLocaleDateString()}
                onPress={() => openDate('data')}
                error={errors.data}
              />
              <LabeledInput
                label="Rec *"
                placeholder="Rec"
                value={relatorio.rec}
                onChangeText={(t) => handleChange('rec', t)}
                error={errors.rec}
                restrictNA
              />
              <LabeledInput
                label="Nota *"
                placeholder="Nota"
                value={relatorio.nota}
                onChangeText={(t) => handleChange('nota', t)}
                error={errors.nota}
                restrictNA
              />
              <LabeledInput
                label="Tag *"
                placeholder="Tag"
                value={relatorio.tag}
                onChangeText={(t) => handleChange('tag', t)}
                error={errors.tag}
                restrictNA
              />
              <LabeledInput
                label="Inspetor"
                placeholder="Nome"
                value={relatorio.inspetor}
                onChangeText={(t) => handleChange('inspetor', t)}
              />
              <LabeledInput
                label="Fiscal"
                placeholder="Nome"
                value={relatorio.fiscal}
                onChangeText={(t) => handleChange('fiscal', t)}
              />
            </Section>

            <Section title="Unidade e Contrato" collapsed={sections.unidade} onToggle={() => toggleSection('unidade')}>
              <Text style={styles.label}>Tipo de Serviço *</Text>
              <TouchableOpacity style={styles.input} onPress={() => setShowTipoServModal(true)}>
                <Text style={relatorio.tipo_serv ? styles.selectedText : styles.placeholderText}>
                  {relatorio.tipo_serv
                    ? tipoServOptions.find((t) => t.value === relatorio.tipo_serv)?.label || 'Selecione'
                    : 'Selecione um tipo de serviço'}
                </Text>
              </TouchableOpacity>
              {errors.tipo_serv ? <Text style={styles.errorText}>{errors.tipo_serv}</Text> : null}

              <Text style={styles.label}>Unidade/Área *</Text>
              <TouchableOpacity style={styles.input} onPress={() => setShowUnidadeModal(true)}>
                <Text style={relatorio.unidade ? styles.selectedText : styles.placeholderText}>
                  {relatorio.unidade
                    ? areas.find((a) => String(a.id) === relatorio.unidade)?.area || `Unidade ${relatorio.unidade}`
                    : 'Selecione uma unidade'}
                </Text>
              </TouchableOpacity>
              {errors.unidade ? <Text style={styles.errorText}>{errors.unidade}</Text> : null}

              <LabeledInput
                label="Contrato (ID)"
                placeholder="ID do contrato"
                keyboardType="numeric"
                value={relatorio.contrato}
                onChangeText={(t) => handleChange('contrato', t)}
              />
              <LabeledInput
                label="Setor *"
                placeholder="Setor"
                value={relatorio.setor}
                onChangeText={(t) => handleChange('setor', t)}
                error={errors.setor}
                restrictNA
              />
              <Text style={styles.label}>Corrosividade *</Text>
              <TouchableOpacity style={styles.input} onPress={() => setShowCorrosividadeModal(true)}>
                <Text style={relatorio.corrosividade ? styles.selectedText : styles.placeholderText}>
                  {relatorio.corrosividade
                    ? corrosividadeOptions.find((c) => c.value === relatorio.corrosividade)?.label || 'Selecione'
                    : 'Selecione a corrosividade'}
                </Text>
              </TouchableOpacity>
              {errors.corrosividade ? <Text style={styles.errorText}>{errors.corrosividade}</Text> : null}

              <DateButton
                label="Início (Data e Hora) *"
                value={relatorio.inicio}
                onPress={() => openDate('inicio')}
              />
              <DateButton
                label="Término (Data e Hora) *"
                value={relatorio.termino}
                onPress={() => openDate('termino')}
              />
            </Section>

            <Section title="Condições Ambientais" collapsed={sections.condicoes} onToggle={() => toggleSection('condicoes')}>
              <LabeledInput
                label="Temperatura Ambiente (°C)"
                keyboardType="numeric"
                value={relatorio.temp_ambiente}
                onChangeText={(t) => handleChange('temp_ambiente', t)}
              />
              <LabeledInput
                label="Umidade Relativa (%)"
                keyboardType="numeric"
                value={relatorio.ura}
                onChangeText={(t) => handleChange('ura', t)}
              />
              <LabeledInput
                label="Ponto de Orvalho (°C)"
                keyboardType="numeric"
                value={relatorio.po}
                onChangeText={(t) => handleChange('po', t)}
              />
              <LabeledInput
                label="Temperatura Superfície (°C)"
                keyboardType="numeric"
                value={relatorio.temp_super}
                onChangeText={(t) => handleChange('temp_super', t)}
              />
              <LabeledInput
                label="Grau de Intemperismo"
                value={relatorio.intemperismo}
                onChangeText={(t) => handleChange('intemperismo', t)}
              />
              <LabeledInput
                label="Descontaminação"
                value={relatorio.descontaminacao}
                onChangeText={(t) => handleChange('descontaminacao', t)}
              />
              <LabeledInput
                label="Teste de Poeira - Tamanho"
                value={relatorio.poeira_tam}
                onChangeText={(t) => handleChange('poeira_tam', t)}
              />
              <LabeledInput
                label="Teste de Poeira - Quantidade"
                value={relatorio.poeira_quant}
                onChangeText={(t) => handleChange('poeira_quant', t)}
              />
              <LabeledInput
                label="Teor de Sais Solúveis"
                value={relatorio.teor_sais}
                onChangeText={(t) => handleChange('teor_sais', t)}
              />
            </Section>

            <Section
              title="Preparação de Superfície"
              collapsed={sections.preparacao}
              onToggle={() => toggleSection('preparacao')}
            >
              <View style={styles.box}>
                <LabeledInput
                  label="Tratamento *"
                  value={relatorio.preparacaoSuperficie.tratamento}
                  onChangeText={(t) => updatePreparacao('tratamento', t)}
                  error={errors.tratamento}
                  restrictNA
                />
                <LabeledInput
                  label="Tipo do Substrato *"
                  value={relatorio.preparacaoSuperficie.tipo_subs}
                  onChangeText={(t) => updatePreparacao('tipo_subs', t)}
                  error={errors.tipo_subs}
                  restrictNA
                />
                <Text style={styles.label}>Ambiente de Pintura</Text>
                <TouchableOpacity style={styles.input} onPress={() => setShowAmbientePinturaModal(true)}>
                  <Text
                    style={
                      relatorio.preparacaoSuperficie.ambiente_pintura
                        ? styles.selectedText
                        : styles.placeholderText
                    }
                  >
                    {relatorio.preparacaoSuperficie.ambiente_pintura
                      ? ambientePinturaOptions.find(
                        (a) => a.value === relatorio.preparacaoSuperficie.ambiente_pintura
                      )?.label || 'Selecione'
                      : 'Selecione um ambiente'}
                  </Text>
                </TouchableOpacity>
                <LabeledInput
                  label="Rugosidade"
                  value={relatorio.preparacaoSuperficie.rugosidade}
                  onChangeText={(t) => updatePreparacao('rugosidade', t)}
                />
              </View>
            </Section>

            <Section title="Etapas de Pintura" collapsed={sections.etapas} onToggle={() => toggleSection('etapas')}>
              {relatorio.relatorios.length === 0 ? (
                <Text style={styles.emptyText}>Nenhuma etapa adicionada.</Text>
              ) : (
                relatorio.relatorios.map((item, index) => (
                  <View key={index} style={[styles.box, { backgroundColor: item.corFundo }]}>
                    <Text style={styles.subSectionTitle}>Etapa {index + 1}</Text>
                    <LabeledInput
                      label="Tinta *"
                      value={item.tinta}
                      onChangeText={(t) => updateEtapa(index, 'tinta', t)}
                      error={
                        errors.etapas &&
                          (!item.tinta?.trim() || item.tinta.toUpperCase() === 'N/A')
                          ? 'Tinta é obrigatória e não pode ser "N/A"'
                          : null
                      }
                      restrictNA
                    />
                    <LabeledInput
                      label="Lote A"
                      value={item.lote_a}
                      onChangeText={(t) => updateEtapa(index, 'lote_a', t)}
                    />
                    <DateButton
                      label="Validade Lote A"
                      value={item.val_a.toLocaleDateString()}
                      onPress={() => openDate('val_a', index)}
                    />
                    <LabeledInput
                      label="Lote B"
                      value={item.lote_b}
                      onChangeText={(t) => updateEtapa(index, 'lote_b', t)}
                    />
                    <DateButton
                      label="Validade Lote B"
                      value={item.val_b.toLocaleDateString()}
                      onPress={() => openDate('val_b', index)}
                    />
                    <LabeledInput
                      label="Lote C"
                      value={item.lote_c}
                      onChangeText={(t) => updateEtapa(index, 'lote_c', t)}
                    />
                    <DateButton
                      label="Validade Lote C"
                      value={item.val_c.toLocaleDateString()}
                      onPress={() => openDate('val_c', index)}
                    />
                    <LabeledInput
                      label="Cor Munsell"
                      value={item.cor_munsell}
                      onChangeText={(t) => updateEtapa(index, 'cor_munsell', t)}
                    />
                    <LabeledInput
                      label="Temperatura Ambiente (°C)"
                      keyboardType="numeric"
                      value={item.temp_amb}
                      onChangeText={(t) => updateEtapa(index, 'temp_amb', t)}
                    />
                    <LabeledInput
                      label="Umidade Relativa (%)"
                      keyboardType="numeric"
                      value={item.ura}
                      onChangeText={(t) => updateEtapa(index, 'ura', t)}
                    />
                    <LabeledInput
                      label="Ponto de Orvalho (°C)"
                      keyboardType="numeric"
                      value={item.po}
                      onChangeText={(t) => updateEtapa(index, 'po', t)}
                    />
                    <LabeledInput
                      label="Temperatura Substrato (°C)"
                      keyboardType="numeric"
                      value={item.temp_substrato}
                      onChangeText={(t) => updateEtapa(index, 'temp_substrato', t)}
                    />
                    <LabeledInput
                      label="Diluente"
                      value={item.diluente}
                      onChangeText={(t) => updateEtapa(index, 'diluente', t)}
                    />
                    <LabeledInput
                      label="Método de Aplicação"
                      value={item.met_aplic}
                      onChangeText={(t) => updateEtapa(index, 'met_aplic', t)}
                    />
                    <DateButton
                      label="Início (Data e Hora)"
                      value={item.inicio}
                      onPress={() => openDate('inicio', index)}
                    />
                    <DateButton
                      label="Término (Data e Hora)"
                      value={item.termino}
                      onPress={() => openDate('termino', index)}
                    />
                    <LabeledInput
                      label="Intervalo de Repintura"
                      value={item.inter_repintura}
                      onChangeText={(t) => updateEtapa(index, 'inter_repintura', t)}
                    />
                    <LabeledInput label="EPE" value={item.epe} onChangeText={(t) => updateEtapa(index, 'epe', t)} />
                    <LabeledInput label="EPS" value={item.eps} onChangeText={(t) => updateEtapa(index, 'eps', t)} />
                    <LabeledInput
                      label="Inspeção Visual"
                      value={item.insp_visual}
                      onChangeText={(t) => updateEtapa(index, 'insp_visual', t)}
                    />
                    <LabeledInput
                      label="Aderência"
                      value={item.aderencia}
                      onChangeText={(t) => updateEtapa(index, 'aderencia', t)}
                    />
                    <LabeledInput
                      label="Holiday"
                      value={item.holiday}
                      onChangeText={(t) => updateEtapa(index, 'holiday', t)}
                    />
                    <LabeledInput
                      label="Laudo"
                      value={item.laudo}
                      onChangeText={(t) => updateEtapa(index, 'laudo', t)}
                    />
                    <DateButton
                      label="Data Inspeção"
                      value={item.data_insp}
                      onPress={() => openDate('data_insp', index)}
                    />
                    <LabeledInput
                      label="Pintor/Executante"
                      value={item.pintor}
                      onChangeText={(t) => updateEtapa(index, 'pintor', t)}
                    />
                  </View>
                ))
              )}
              {errors.etapas ? <Text style={styles.errorText}>{errors.etapas}</Text> : null}
              <TouchableOpacity style={styles.secondaryButton} onPress={adicionarEtapa}>
                <Text style={styles.secondaryButtonText}>+ Adicionar Etapa</Text>
              </TouchableOpacity>
            </Section>

            {/* <Section title="Fotos" collapsed={sections.fotos} onToggle={() => toggleSection('fotos')}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {(Array.isArray(relatorio.relatorio) ? relatorio.relatorio : []).length === 0 ? (
                  <Text style={styles.emptyText}>Nenhuma foto adicionada.</Text>
                ) : (
                  (relatorio.relatorio || []).map((foto, idx) => (
                    <TouchableOpacity
                      key={idx}
                      onLongPress={() => removerFoto(idx)}
                      accessibilityLabel={`Foto ${idx + 1}`}
                      activeOpacity={0.8}
                    >
                      <Image source={{ uri: foto.photo }} style={styles.thumb} />
                    </TouchableOpacity>
                  ))
                )}
              </View>
              <TouchableOpacity style={styles.secondaryButton} onPress={adicionarFoto}>
                <Text style={styles.secondaryButtonText}>+ Adicionar Foto</Text>
              </TouchableOpacity>
            </Section> */}

            <Section title="Inspeção e Aprovação" collapsed={sections.inspeccao} onToggle={() => toggleSection('inspeccao')}>
              <View style={styles.switchRow}>
                <Text style={styles.label}>Laudo</Text>
                <Switch value={!!relatorio.laudo} onValueChange={(v) => handleChange('laudo', v ? 1 : 0)} />
              </View>
              <View style={styles.switchRow}>
                <Text style={styles.label}>RNC?</Text>
                <Switch value={!!relatorio.rnc_n} onValueChange={(v) => handleChange('rnc_n', v ? 1 : 0)} />
              </View>
              <LabeledInput
                label="Instrumentos de Medição"
                multiline
                numberOfLines={3}
                style={{ height: 80 }}
                value={relatorio.obs_inst}
                onChangeText={(t) => handleChange('obs_inst', t)}
              />
              <LabeledInput
                label="Observações Finais"
                multiline
                numberOfLines={4}
                style={{ height: 100 }}
                value={relatorio.obs_final}
                onChangeText={(t) => handleChange('obs_final', t)}
              />
              <View style={styles.switchRow}>
                <Text style={styles.label}>Aprovado</Text>
                <Switch value={!!relatorio.aprovado} onValueChange={(v) => handleChange('aprovado', v ? 1 : 0)} />
              </View>
              <LabeledInput
                label="M² *"
                keyboardType="numeric"
                value={relatorio.m2}
                onChangeText={(t) => handleChange('m2', t)}
                error={errors.m2}
                restrictNA
              />
              <LabeledInput
                label="Checklist N (ID)"
                keyboardType="numeric"
                value={relatorio.checklist_n}
                onChangeText={(t) => handleChange('checklist_n', t)}
              />
            </Section>

            <View style={{ marginVertical: 12 }}>
              {loading ? (
                <ActivityIndicator size="large" color={PRIMARY} />
              ) : (
                <TouchableOpacity
                  onPress={submit}
                  style={[
                    styles.primaryButton,
                    (!relatorio.cliente ||
                      !relatorio.data ||
                      !relatorio.rec ||
                      !relatorio.nota ||
                      !relatorio.tag ||
                      !relatorio.tipo_serv ||
                      !relatorio.unidade ||
                      !relatorio.setor ||
                      !relatorio.corrosividade ||
                      !relatorio.m2 ||
                      !relatorio.preparacaoSuperficie.tratamento ||
                      !relatorio.preparacaoSuperficie.tipo_subs) &&
                    styles.primaryButtonDisabled,
                  ]}
                  disabled={
                    loading ||
                    !relatorio.cliente ||
                    !relatorio.data ||
                    !relatorio.rec ||
                    !relatorio.nota ||
                    !relatorio.tag ||
                    !relatorio.tipo_serv ||
                    !relatorio.unidade ||
                    !relatorio.setor ||
                    !relatorio.corrosividade ||
                    !relatorio.m2 ||
                    !relatorio.preparacaoSuperficie.tratamento ||
                    !relatorio.preparacaoSuperficie.tipo_subs
                  }
                  testID="createReportButton"
                >
                  <Text style={styles.primaryButtonText}>Criar Relatório</Text>
                </TouchableOpacity>
              )}
            </View>

            {Platform.OS === 'ios' && datePicker.visible && (
              <DateTimePicker
                value={
                  (datePicker.index !== null &&
                    relatorio.relatorios[datePicker.index] &&
                    relatorio.relatorios[datePicker.index][datePicker.field]) ||
                  relatorio[datePicker.field] ||
                  new Date()
                }
                mode={['inicio', 'termino'].includes(datePicker.field) ? 'datetime' : 'date'}
                display="default"
                onChange={onDateChange}
              />
            )}

            {/* Custom Picker Modals */}
            <CustomPickerModal
              visible={showTipoServModal}
              onClose={() => setShowTipoServModal(false)}
              options={tipoServOptions}
              onSelect={(value) => handleChange('tipo_serv', value)}
              selectedValue={relatorio.tipo_serv}
              title="Selecione um tipo de serviço"
            />
            <CustomPickerModal
              visible={showUnidadeModal}
              onClose={() => setShowUnidadeModal(false)}
              options={[{ label: 'Selecione uma unidade', value: '' }, ...areas.map((a) => ({ label: a.area || `Unidade ${a.id}`, value: String(a.id) }))]}
              onSelect={(value) => handleChange('unidade', value)}
              selectedValue={relatorio.unidade}
              title="Selecione uma unidade"
            />
            <CustomPickerModal
              visible={showCorrosividadeModal}
              onClose={() => setShowCorrosividadeModal(false)}
              options={corrosividadeOptions}
              onSelect={(value) => handleChange('corrosividade', value)}
              selectedValue={relatorio.corrosividade}
              title="Selecione a corrosividade"
            />
            <CustomPickerModal
              visible={showAmbientePinturaModal}
              onClose={() => setShowAmbientePinturaModal(false)}
              options={ambientePinturaOptions}
              onSelect={(value) => updatePreparacao('ambiente_pintura', value)}
              selectedValue={relatorio.preparacaoSuperficie.ambiente_pintura}
              title="Selecione o ambiente de pintura"
            />
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 40 },
  section: { marginBottom: 12, borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: '#e6e6e6' },
  sectionHeader: { backgroundColor: '#f7f7f7', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700' },
  sectionToggle: { fontSize: 20, color: '#666' },
  sectionBody: { padding: 12, backgroundColor: 'white' },
  field: { marginBottom: 10 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
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
  subSectionTitle: { fontSize: 15, fontWeight: '600', marginBottom: 10, color: PRIMARY },
  emptyText: { color: '#777', fontStyle: 'italic' },
  thumb: { width: 90, height: 90, borderRadius: 6, margin: 6, borderWidth: 1, borderColor: '#ddd' },
  primaryButton: { backgroundColor: PRIMARY, padding: 14, borderRadius: 8, alignItems: 'center' },
  primaryButtonDisabled: { backgroundColor: '#9ab0c8' },
  primaryButtonText: { color: '#fff', fontWeight: '700' },
  secondaryButton: {
    marginTop: 8,
    padding: 10,
    borderRadius: 6,
    alignItems: 'center',
    backgroundColor: '#f0f6fb',
    borderWidth: 1,
    borderColor: PRIMARY,
  },
  secondaryButtonText: { color: PRIMARY, fontWeight: '700' },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  errorText: { color: '#b00020', fontSize: 12, marginBottom: 8 },
  status: { fontSize: 16, marginBottom: 12 },
  errorContainer: { padding: 10, backgroundColor: '#f8d7da', borderRadius: 6, marginBottom: 12 },
  // Modal styles
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
});