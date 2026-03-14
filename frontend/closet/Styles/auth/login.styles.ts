import { Dimensions, StyleSheet } from 'react-native';

const { width } = Dimensions.get('window');

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  scrollContent: {
    flexGrow: 1,
  },
  topImage: {
    width: width,
    height: 160,
  },
  contentSection: {
    paddingHorizontal: 35,
    alignItems: 'center',
    paddingBottom: 20,
    marginTop: 10,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 40,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  subtitle: {
    color: '#FFFFFF',
    fontSize: 14,
    alignSelf: 'flex-start',
    marginBottom: 25,
  },
  inputWrapper: {
    width: '100%',
    marginBottom: 12,
  },
  label: {
    color: '#FFFFFF',
    fontSize: 14,
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#000',
    borderRadius: 25,
    paddingVertical: 12,
    paddingHorizontal: 20,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#1A1A1A',
    fontSize: 14,
  },
  forgotContainer: {
    alignSelf: 'flex-end',
    marginBottom: 20,
    marginTop: 4,
  },
  forgotText: {
    color: '#FB92BD',
    fontSize: 13,
  },
  loginButton: {
    backgroundColor: '#FB92BD',
    paddingVertical: 14,
    paddingHorizontal: 60,
    borderRadius: 25,
    alignItems: 'center',
  },
  loginButtonText: {
    color: '#FFF',
    fontSize: 16,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
    width: '100%',
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: '#FB92BD',
    opacity: 0.5,
  },
  orText: {
    color: '#888',
    marginHorizontal: 15,
    fontSize: 13,
  },
  googleButton: {
    backgroundColor: '#FB92BD',
    paddingVertical: 12,
    width: '100%',
    borderRadius: 25,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  googleContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  googleIcon: {
    width: 24,
    height: 24,
    marginRight: 10,
  },
  googleButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
  },
  footerText: {
    color: '#888',
    fontSize: 13,
    marginBottom: 10,
  },
  joinLink: {
    color: '#FB92BD',
  },
  bottomLogo: {
    width: width * 1.0,
    height: 220,
    marginTop: 10,
    alignSelf: 'center',
    opacity: 0.9,
  },
});