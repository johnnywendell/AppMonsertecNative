import React from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Alert,
} from 'react-native';

import { Image } from 'expo-image';

import * as ImagePicker from 'expo-image-picker';
import { MaterialIcons } from '@expo/vector-icons';

const PRIMARY = '#00315c';

export default function PhotoField({
    photos = [],
    onChange,
    getRemoteUri,
    accessToken = null,
}) {
    const addPhoto = uri => {
        if (!uri) return;

        onChange([
            ...photos,
            { photo: uri }
        ]);
    };

    const pickGallery = async () => {
        const permission =
            await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (permission.status !== 'granted') {
            Alert.alert(
                'Permissão',
                'Permita o acesso à galeria.'
            );
            return;
        }

        const result =
            await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                quality: 0.7,
                allowsEditing: false,
            });

        if (result.canceled) return;

        addPhoto(result.assets?.[0]?.uri);
    };

    const takePhoto = async () => {
        const permission =
            await ImagePicker.requestCameraPermissionsAsync();

        if (permission.status !== 'granted') {
            Alert.alert(
                'Permissão',
                'Permita o acesso à câmera.'
            );
            return;
        }

        const result =
            await ImagePicker.launchCameraAsync({
                mediaTypes: ['images'],
                quality: 0.7,
                allowsEditing: false,
            });

        if (result.canceled) return;

        addPhoto(result.assets?.[0]?.uri);
    };

    const removePhoto = index => {
        const photo = photos[index]?.photo;

        const remote =
            typeof photo === 'string' &&
            /^https?:\/\//i.test(photo);

        if (remote) {
            Alert.alert(
                'Foto existente',
                'O endpoint atual não permite excluir uma foto já salva.'
            );
            return;
        }

        onChange(
            photos.filter((_, i) => i !== index)
        );
    };

    const getSource = photo => {
            const uri = photo?.photo;

            if (!uri) {
                return null;
            }

            const local =
                uri.startsWith('file://') ||
                uri.startsWith('content://');

            if (local) {
                return {
                    uri
                };
            }

            const finalUri =
                getRemoteUri
                    ? getRemoteUri(uri)
                    : uri;

            return {
                uri: finalUri,

                headers: accessToken
                    ? {
                        Authorization:
                            `Bearer ${accessToken}`,
                    }
                    : undefined,
            };
        };

    return (
        <View>
            <View style={styles.grid}>
                {photos.map((photo, index) => (
                    <View
                        key={photo.id || index}
                        style={styles.photoBox}
                    >
                        <Image
                            source={getSource(photo)}
                            style={styles.photo}
                            contentFit="cover"
                            transition={200}
                            onError={(error) => {
                                console.error(
                                    'Erro carregando foto:',
                                    error
                                );

                                console.log(
                                    'SOURCE FOTO:',
                                    getSource(photo)
                                );
                            }}
                        />

                        <TouchableOpacity
                            style={styles.remove}
                            onPress={() =>
                                removePhoto(index)
                            }
                        >
                            <MaterialIcons
                                name="close"
                                size={18}
                                color="#fff"
                            />
                        </TouchableOpacity>
                    </View>
                ))}
            </View>

            {photos.length === 0 && (
                <Text style={styles.empty}>
                    Nenhuma foto adicionada.
                </Text>
            )}

            <View style={styles.actions}>
                <TouchableOpacity
                    style={styles.button}
                    onPress={pickGallery}
                >
                    <MaterialIcons
                        name="photo-library"
                        size={20}
                        color={PRIMARY}
                    />
                    <Text style={styles.buttonText}>
                        Galeria
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.button}
                    onPress={takePhoto}
                >
                    <MaterialIcons
                        name="photo-camera"
                        size={20}
                        color={PRIMARY}
                    />
                    <Text style={styles.buttonText}>
                        Câmera
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    photoBox: {
        width: '31%',
        aspectRatio: 1,
        borderRadius: 8,
        overflow: 'hidden',
        backgroundColor: '#ddd',
    },
    photo: {
        width: '100%',
        height: '100%',
    },
    remove: {
        position: 'absolute',
        top: 4,
        right: 4,
        width: 26,
        height: 26,
        borderRadius: 13,
        backgroundColor: 'rgba(0,0,0,.65)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    empty: {
        textAlign: 'center',
        color: '#777',
        marginVertical: 10,
    },
    actions: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 10,
    },
    button: {
        flex: 1,
        minHeight: 44,
        borderWidth: 1,
        borderColor: PRIMARY,
        borderRadius: 7,
        flexDirection: 'row',
        gap: 7,
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonText: {
        color: PRIMARY,
        fontWeight: '600',
    },
});