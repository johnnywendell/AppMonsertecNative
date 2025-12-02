import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  SafeAreaView,
  View,
  Image,
  Text,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useNavigation } from '@react-navigation/native';
import { login, setupAxiosInterceptors } from '../services/authService';
import MessageModal from '../components/MessageModal';
import { debounce } from 'lodash';

export default function LoginScreen() {
  const navigation = useNavigation();
  const [form, setForm] = useState({ username: '', password: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMessage, setModalMessage] = useState('');

  useEffect(() => {
    setupAxiosInterceptors(() => {
      if (navigation.getCurrentRoute()?.name !== 'Login') {
        navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
      }
    });
  }, [navigation]);

  const handleSignIn = async () => {
    console.log('Botão Entrar clicado', form);
    if (!form.username || !form.password) {
      console.log('Formulário inválido');
      setModalMessage('Por favor, preencha usuário e senha.');
      setModalVisible(true);
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await login(form.username, form.password);
      console.log('Resposta do login:', response);
      setIsSubmitting(false);

      if (response.success) {
        navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
      } else {
        setModalMessage(response.error || 'Usuário ou senha inválidos.');
        setModalVisible(true);
      }
    } catch (error) {
      console.error('Erro inesperado no login:', error);
      setIsSubmitting(false);
      setModalMessage('Erro ao fazer login. Tente novamente.');
      setModalVisible(true);
    }
  };

  const handleSignInDebounced = debounce(handleSignIn, 300);

  const isFormValid = form.username.trim() && form.password.trim();
  console.log('isFormValid:', isFormValid, 'Form:', form);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <KeyboardAwareScrollView
        style={styles.container}
        keyboardShouldPersistTaps="handled"
        extraScrollHeight={100}
      >
        <View style={styles.header}>
          <Image
            alt="App Logo"
            resizeMode="contain"
            style={styles.headerImg}
            source={require('../assets/SC-LOGO-JPG-AZUL-removebg-preview.png')}
          />
          <Text style={styles.title}>Seja Bem-Vindo!</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.input}>
            <Text style={styles.inputLabel}>Usuário</Text>
            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              clearButtonMode="while-editing"
              onChangeText={(username) => setForm({ ...form, username })}
              placeholder="Nome de usuário"
              placeholderTextColor="#6b7280"
              style={styles.inputControl}
              value={form.username}
            />
          </View>

          <View style={styles.input}>
            <Text style={styles.inputLabel}>Senha</Text>
            <TextInput
              autoCorrect={false}
              clearButtonMode="while-editing"
              onChangeText={(password) => setForm({ ...form, password })}
              placeholder="********"
              placeholderTextColor="#6b7280"
              style={styles.inputControl}
              secureTextEntry={true}
              value={form.password}
            />
          </View>

          <View style={styles.formAction}>
            <TouchableOpacity
              onPress={handleSignInDebounced}
              activeOpacity={0.7}
              disabled={isSubmitting || !isFormValid}
            >
              <View style={[styles.btn, (isSubmitting || !isFormValid) && styles.btnDisabled]}>
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.btnText}>Entrar</Text>
                )}
              </View>
            </TouchableOpacity>
          </View>

          {/* <TouchableOpacity onPress={() => navigation.navigate('EsqueceuSenha')}>
            <Text style={styles.formLink}>Esqueceu a senha?</Text>
          </TouchableOpacity> */}
        </View>

        <MessageModal
          visible={modalVisible}
          message={modalMessage}
          onClose={() => setModalVisible(false)}
        />
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 10,
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
  },
  title: {
    fontSize: 31,
    fontWeight: '700',
    color: '#1D2A32',
    marginBottom: 30,
  },
  header: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  headerImg: {
    width: 240,
    height: 220,
    alignSelf: 'center',
    marginBottom: 10,
  },
  form: {
    marginBottom: 24,
    paddingHorizontal: 24,
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
  },
  formAction: {
    marginTop: 4,
    marginBottom: 16,
  },
  formLink: {
    fontSize: 16,
    fontWeight: '600',
    color: '#00315c',
    textAlign: 'center',
  },
  input: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 17,
    fontWeight: '600',
    color: '#222',
    marginBottom: 8,
  },
  inputControl: {
    height: 50,
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    borderRadius: 12,
    fontSize: 15,
    fontWeight: '500',
    color: '#222',
    borderWidth: 1,
    borderColor: '#C9D3DB',
    borderStyle: 'solid',
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 30,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderWidth: 1,
    backgroundColor: '#00315c',
    borderColor: '#075eec',
  },
  btnDisabled: {
    opacity: 0.6,
  },
  btnText: {
    fontSize: 18,
    lineHeight: 26,
    fontWeight: '600',
    color: '#fff',
  },
});