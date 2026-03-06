import { Inter_400Regular, useFonts } from '@expo-google-fonts/inter';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { Dimensions, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const { width, height } = Dimensions.get('window');
  

export default function Authenication() {
  const router = useRouter();

  const [fontsLoaded] = useFonts({
    'Inter-Regular': Inter_400Regular,
  });
  const topImageHeight = 650;

  {/*const handleLogin = () => {
    router.replace('/(tabs)');
  }; */} 

  return (
    <View style={styles.container}>
       <StatusBar style="light" translucent backgroundColor="transparent" />
       <Image source={require('@/assets/images/authy.png')} style={[styles.topImage, { width, height: topImageHeight }]}
          resizeMode="stretch" />

        <View style={[styles.logoContainer, { height: topImageHeight }]}>
        <Image source={require('@/assets/images/Icon.jpeg')} style={styles.logo}
          resizeMode="contain"/>
        </View>

      {/* BOTTOM SECTION */}
      <View style={[styles.contentContainer, { marginTop:topImageHeight - 50  }]}>
        <Text style={[styles.title, { fontFamily: 'Inter-Regular' }]}>Dribble</Text>
        <Text style={[styles.subtitle, { fontFamily: 'Inter-Regular' }]}> Sign in to be inspired by the works of stylists</Text>
        <View style={styles.lineRow}>
          <View style={styles.pinkLine} />
          <Text style={[styles.description, { fontFamily: 'Inter-Regular' }]}> or to inspire others with your style</Text>
          </View>
        

        <TouchableOpacity style={styles.createButton} onPress={() => router.push('/signup')}>
          <Text style={[styles.createButtonText, { fontFamily: 'Inter-Regular' }]}> CREATE ACCOUNT </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.loginLink} onPress={() => router.push('/login')}>
          {/* {handleLogin} */}
          <Text style={[styles.loginText, { fontFamily: 'Inter-Regular' }]}>LOG IN</Text>
        </TouchableOpacity>
        </View>
      </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
   contentContainer: {
    flex: 1,
    paddingHorizontal: 35,
    alignItems: 'center',
    zIndex: 20,
  },
  topImage: {
    position: 'absolute',
    marginBottom:-1,
  },
  logoContainer: {
    position: 'absolute',
    width: '100%',
    justifyContent: 'center', 
    alignItems: 'center',  
    paddingBottom: 160,   
    zIndex: 10,
  },
  logo: {
    width: 220,
    height: 220,
  },
  contentSection: {
    paddingHorizontal: 35,
    alignItems: 'center',
    paddingBottom: 15,
  },
  title: {
    color: '#FFF',
    fontSize: 40, 
    textAlign: 'center',
  },
  subtitle: {
    color: '#D9D9D9',
    fontSize: 15,
    textAlign: 'center',
    marginTop:5,
  },

  description: {
    color: '#D9D9D9',
    textAlign: 'center',
    fontSize: 15,
  },
  lineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  pinkLine: {
    width: 75,            
    height: 2,          
    backgroundColor: '#FB92BD', 
    marginRight: 8,
    borderRadius: 1,
  },
  createButton: {
    backgroundColor: '#FB92BD', 
    paddingVertical: 16,
    borderRadius: 35,
    width: 312,
    height: 50,
    alignItems:'center',
    marginTop: 45,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    letterSpacing: 1,
  },
  loginLink: {
    marginTop: 25,
  },
  loginText: {
    color: '#F0507B', 
    fontSize: 16,
  },
});