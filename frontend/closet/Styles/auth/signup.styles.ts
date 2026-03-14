import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  topImage: {
    position: 'absolute',
    top: 0,
    zIndex: 10,
  },
  contentContainer: {
    paddingHorizontal: 35,
    alignItems: 'center',
    paddingBottom: 20,
  },
  title: {
    color: '#FFF',
    fontSize: 40, 
    alignSelf: 'flex-start',
    fontFamily: 'Inter-Bold',
    marginTop: 10,
  },
  subtitle: {
    color: '#888',
    fontSize: 15,
    alignSelf: 'flex-start',
    fontFamily: 'Inter-Regular',
    marginBottom: 20,
  },
  inputWrapper: {
    width: '100%',
    marginBottom: 12,
  },
  label: {
    color: '#FFF',
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#000',
    borderRadius: 25,
    paddingVertical: 12,
    paddingHorizontal: 20,
    color: '#FFF',
    borderWidth: 1,
    borderColor: '#1A1A1A',
    fontFamily: 'Inter-Regular',
  },
  signUpButton: {
    backgroundColor: '#FB92BD',
    paddingVertical: 14,
    paddingHorizontal: 50,
    borderRadius: 25,
    marginTop: 15,
  },
  signUpButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontFamily: 'Inter-Bold',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
    width: '100%',
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: '#FB92BD',
    opacity: 0.3,
  },
  orText: {
    color: '#888',
    marginHorizontal: 15,
    fontFamily: 'Inter-Regular',
  },
  googleButton: {
    backgroundColor: '#FB92BD',
    paddingVertical: 12,
    width: '100%',
    borderRadius: 25,
    alignItems: 'center',
    marginBottom: 20,
  },
  googleContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  googleIcon: {
    width: 20,
    height: 20,
    marginRight: 10,
  },
  googleButtonText: {
    color: '#FFF',
    fontSize: 15,
    fontFamily: 'Inter-Bold',
  },
  footerText: {
    color: '#888',
    fontSize: 13,
    marginBottom: 10,
    fontFamily: 'Inter-Regular',
  },
  signInLink: {
    color: '#F0507B',
    fontFamily: 'Inter-Bold',
  },
  bottomLogo: {
    width: 180,
    height: 180,
    marginTop: 10,
    alignSelf: 'center',
  },
});