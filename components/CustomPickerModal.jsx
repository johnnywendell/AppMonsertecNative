import React, {
    useEffect,
    useMemo,
    useState
} from 'react';

import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    Modal,
    FlatList,
    StyleSheet
} from 'react-native';

import {
    MaterialIcons
} from '@expo/vector-icons';


/**
 * Componente Modal para seleção de opções customizadas.
 *
 * @param {boolean} visible
 * @param {function} onClose
 * @param {Array<{label: string, value: any}>} options
 * @param {function} onSelect
 * @param {any} selectedValue
 * @param {string} title
 * @param {boolean} searchable - Exibe campo de pesquisa
 */
export default function CustomPickerModal({
    visible,
    onClose,
    options = [],
    onSelect,
    selectedValue,
    title,
    searchable = false
}) {

    const [
        search,
        setSearch
    ] = useState('');


    // =====================================================
    // LIMPA PESQUISA AO FECHAR
    // =====================================================

    useEffect(() => {

        if (!visible) {
            setSearch('');
        }

    }, [visible]);


    // =====================================================
    // FILTRO
    // =====================================================

    const filteredOptions =
        useMemo(() => {

            if (
                !searchable ||
                !search.trim()
            ) {

                return options;
            }


            const termo =
                search
                    .trim()
                    .toLowerCase();


            return options.filter(
                item =>
                    String(
                        item.label || ''
                    )
                        .toLowerCase()
                        .includes(termo)
            );

        }, [
            options,
            search,
            searchable
        ]);


    // =====================================================
    // SELECT
    // =====================================================

    const handleSelect = value => {

        onSelect(value);

        onClose();
    };


    // =====================================================
    // ITEM
    // =====================================================

    const renderItem = ({
        item
    }) => {

        const selected =
            item.value ==
            selectedValue;


        return (

            <TouchableOpacity

                style={[
                    styles.optionItem,

                    selected &&
                    styles.selectedItem
                ]}

                onPress={() =>
                    handleSelect(
                        item.value
                    )
                }
            >

                <Text
                    style={[
                        styles.optionText,

                        selected &&
                        styles.selectedText
                    ]}
                >

                    {item.label}

                </Text>


                {
                    selected &&
                    (
                        <MaterialIcons
                            name="check"
                            size={22}
                            color="#00315c"
                        />
                    )
                }

            </TouchableOpacity>
        );
    };


    return (

        <Modal

            animationType="slide"

            transparent={true}

            visible={visible}

            onRequestClose={
                onClose
            }
        >

            <View
                style={
                    styles.centeredView
                }
            >

                <View
                    style={
                        styles.modalView
                    }
                >

                    {/* ================================= */}
                    {/* TÍTULO */}
                    {/* ================================= */}

                    <Text
                        style={
                            styles.modalTitle
                        }
                    >

                        {title}

                    </Text>


                    {/* ================================= */}
                    {/* PESQUISA */}
                    {/* ================================= */}

                    {
                        searchable &&
                        (
                            <View
                                style={
                                    styles.searchContainer
                                }
                            >

                                <MaterialIcons
                                    name="search"
                                    size={21}
                                    color="#777"
                                />


                                <TextInput

                                    style={
                                        styles.searchInput
                                    }

                                    value={
                                        search
                                    }

                                    onChangeText={
                                        setSearch
                                    }

                                    placeholder="Pesquisar..."

                                    placeholderTextColor="#999"

                                    autoCorrect={
                                        false
                                    }

                                    autoCapitalize="none"

                                />


                                {
                                    search.length >
                                    0 &&
                                    (
                                        <TouchableOpacity
                                            onPress={() =>
                                                setSearch('')
                                            }
                                        >

                                            <MaterialIcons
                                                name="close"
                                                size={20}
                                                color="#777"
                                            />

                                        </TouchableOpacity>
                                    )
                                }

                            </View>
                        )
                    }


                    {/* ================================= */}
                    {/* LISTA */}
                    {/* ================================= */}

                    <FlatList

                        data={
                            filteredOptions
                        }

                        keyExtractor={
                            (
                                item,
                                index
                            ) =>
                                String(
                                    item.value ??
                                    index
                                )
                        }

                        renderItem={
                            renderItem
                        }

                        style={
                            styles.listContainer
                        }

                        keyboardShouldPersistTaps="handled"

                        ListEmptyComponent={

                            <Text
                                style={
                                    styles.emptyText
                                }
                            >

                                {
                                    search
                                        ? 'Nenhum resultado encontrado.'
                                        : 'Nenhuma opção disponível.'
                                }

                            </Text>
                        }

                    />


                    {/* ================================= */}
                    {/* CANCELAR */}
                    {/* ================================= */}

                    <TouchableOpacity

                        style={
                            styles.cancelButton
                        }

                        onPress={
                            onClose
                        }
                    >

                        <Text
                            style={
                                styles.cancelButtonText
                            }
                        >

                            Cancelar

                        </Text>

                    </TouchableOpacity>

                </View>

            </View>

        </Modal>
    );
}


// =========================================================
// STYLES
// =========================================================

const styles =
    StyleSheet.create({

        centeredView: {

            flex: 1,

            justifyContent:
                'flex-end',

            alignItems:
                'center',

            backgroundColor:
                'rgba(0, 0, 0, 0.5)',
        },


        modalView: {

            width:
                '100%',

            maxHeight:
                '70%',

            backgroundColor:
                'white',

            borderTopLeftRadius:
                20,

            borderTopRightRadius:
                20,

            padding:
                20,

            shadowColor:
                '#000',

            shadowOffset: {
                width: 0,
                height: 2
            },

            shadowOpacity:
                0.25,

            shadowRadius:
                4,

            elevation:
                5,
        },


        modalTitle: {

            fontSize:
                18,

            fontWeight:
                'bold',

            marginBottom:
                15,

            color:
                '#00315c',

            textAlign:
                'center',
        },


        // -------------------------------------------------
        // SEARCH
        // -------------------------------------------------

        searchContainer: {

            flexDirection:
                'row',

            alignItems:
                'center',

            height:
                46,

            borderWidth:
                1,

            borderColor:
                '#ddd',

            borderRadius:
                8,

            paddingHorizontal:
                12,

            marginBottom:
                12,

            backgroundColor:
                '#fafafa',
        },


        searchInput: {

            flex: 1,

            marginLeft:
                8,

            fontSize:
                15,

            color:
                '#333',
        },


        // -------------------------------------------------
        // LIST
        // -------------------------------------------------

        listContainer: {

            maxHeight:
                400,
        },


        optionItem: {

            minHeight:
                50,

            paddingHorizontal:
                12,

            paddingVertical:
                12,

            borderBottomWidth:
                1,

            borderBottomColor:
                '#eee',

            flexDirection:
                'row',

            alignItems:
                'center',

            justifyContent:
                'space-between',
        },


        selectedItem: {

            backgroundColor:
                '#e6f0ff',

            borderRadius:
                5,
        },


        optionText: {

            flex:
                1,

            fontSize:
                16,

            color:
                '#333',

            paddingRight:
                10,
        },


        selectedText: {

            fontWeight:
                'bold',

            color:
                '#00315c',
        },


        // -------------------------------------------------
        // CANCEL
        // -------------------------------------------------

        cancelButton: {

            backgroundColor:
                '#f4f4f4',

            padding:
                15,

            borderRadius:
                8,

            marginTop:
                15,

            alignItems:
                'center',
        },


        cancelButtonText: {

            color:
                '#333',

            fontWeight:
                'bold',

            fontSize:
                16,
        },


        emptyText: {

            textAlign:
                'center',

            paddingVertical:
                25,

            color:
                '#999',
        },
    });