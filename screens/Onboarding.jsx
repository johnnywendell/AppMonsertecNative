// import React, { useState, useRef } from 'react';
// import { View, StyleSheet, FlatList, Animated } from 'react-native';
// import AsyncStorage from '@react-native-async-storage/async-storage';

 
// import OnboardingItem from '../components/OnboardingItem';
// import Paginator from '../components/Paginator';
// import NextButton from '../components/NextButton';
// import slides from '../slides';
// import LoginScreen from '../screens/LoginScreen';


// const Onboarding = () => {

//     const [scaleAnim] = useState(new Animated.Value(0))  // Initial value for scale: 0
//     const [currentIndex, setCurrentIndex] = useState(0);
//     const scrollX = useRef(new Animated.Value(0)).current;
//     const slidesRef = useRef(null);
//     const [loading, setLoading] = useState(false);

//     React.useEffect(() => {
//         Animated.spring(
//           scaleAnim,
//           {
//             toValue: 1,
//             friction: 3,
//             useNativeDriver: true
//           }
//         ).start();
//       }, [])
    
//     const viewableItemsChanged = useRef(({ viewableItems }) => {
//         setCurrentIndex(viewableItems[0].index);
//     }).current;

//     const viewConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

//     const scrollTo = async () => {
//         if (currentIndex < slides.length - 1) {
//             slidesRef.current.scrollToIndex({ index: currentIndex + 1 });
   
//         } else {
//             try {
//                 await AsyncStorage.setItem('@viewedOnboarding', 'true');
//                 console.log("SLIDE-ATUAL : " + currentIndex)
                
//                 setLoading(true)

//             } catch (err) {
//                 console.log('Error @setItem: ', err);
//             }
//         }

//     };
    
//     if (!loading) { 
//         return (
            
//             <View style={styles.container}>
      
//                 <View style={{ flex: 3 }}>

//                      <FlatList
//                         data={slides}
//                         renderItem={({ item }) => <OnboardingItem item={item} />}
//                         horizontal
//                         showsHorizontalScrollIndicator={false}
//                         pagingEnabled
//                         bounces={false}
//                         keyExtractor={(item) => item.id}
//                         onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
//                             useNativeDriver: false,
//                         })}
//                         scrollEventThrottle={32}
//                         onViewableItemsChanged={viewableItemsChanged}
//                         viewabilityConfig={viewConfig}
//                         ref={slidesRef}
//                     />
//                 </View>

//                 <Paginator data={slides} scrollX={scrollX} />
//                 <NextButton scrollTo={scrollTo} percentage={(currentIndex + 1) * (100 / slides.length)} />
//             </View>
//         );
//     } else {
//         return (
//         <Animated.View style={[styles.login, scaleAnim]}   >
//             <LoginScreen/>
//         </Animated.View>
//         )
//     }
// };

// export default Onboarding;

// const styles = StyleSheet.create({
//     login: {
//         position: 'absolute',
//         top: 0,
//         bottom: 0,
//         left: 0,
//         right: 0,
//       },
//     container: {
//         flex: 1,
//         justifyContent: 'center',
//         alignItems: 'center',
//         backgroundColor: 'white',
//     },
// });
