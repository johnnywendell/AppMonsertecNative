import { View, Text, StyleSheet, Image, useWindowDimensions } from 'react-native';

import {
    Lato_300Light,
    Lato_400Regular,
    Lato_700Bold,
    useFonts,
} from "@expo-google-fonts/lato";

export default OnboardingItem = ({ item }) => {

    let [fontsLoaded] = useFonts({
        LatoRegular: Lato_400Regular,
        LatoBold: Lato_700Bold,
        LatoLight: Lato_300Light,
    });
    const { width } = useWindowDimensions();
 
        

    return (

        
        <View style={[styles.container, { width }]}>
                       <Image source={item.image} style={[styles.image, { width, resizeMode: 'contain' }]} />

            <View style={{ flex: 0.3 }}>
            <Text style={[styles.light, styles.headinggen]}>
            {"\n"}
                    {item.title}</Text>
                    <Text style={[styles.bold, styles.headinggen]}>
              
                    {item.description}</Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    image: {
        flex: 0.7,
        justifyContent: 'center',
    },
    title: {
        fontWeight: '800',
        fontSize: 28,
        marginBottom: 10,
        color: '#000',
        textAlign: 'center',
    },
    description: {
        fontWeight: '300',
        color: '#000',
        textAlign: 'center',
        paddingHorizontal: 64,
    },

    light: {
        fontFamily: "LatoLight",
    },
    regular: {
        fontFamily: "LatoRegular",
    },
    bold: {
        fontFamily: "LatoBold",
    },
    heading: {
        fontSize: 40,
        color: "#000",
    },
    headinggen: {
        fontSize: 20,
        color: "#000",
    }, 
});
