import 'react-native-gesture-handler';

import { StyleSheet } from 'react-native';
import Routes from '../routes';
 
export default function Home() {
    return (
    
      <Routes/>
         
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
    },
});
