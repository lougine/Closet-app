import { Dimensions, StyleSheet } from 'react-native';

const { width } = Dimensions.get('window');

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  topImage: {
    width: width,
    height: 160,
    position: 'absolute',
    top: 0,
  },
  backButton: {
    width: 36,
    height: 36,
    backgroundColor: '#CCCCCC',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 170,
    marginLeft: 25,
  },
  backText: {
    color: '#000000',
    fontSize: 26,
    fontWeight: '300',
    marginTop: -3,
  },
  contentSection: {
    paddingHorizontal: 30,
    marginTop: 20,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    marginBottom: 10,
  },
  subtitle: {
    color: '#888888',
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    marginBottom: 25,
    lineHeight: 22,
  },
  inputWrapper: {
    width: '100%',
    marginBottom: 15,
  },
  label: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#000000',
    borderRadius: 25,
    paddingVertical: 12,
    paddingHorizontal: 20,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#1A1A1A',
    fontSize: 14,
    fontFamily: 'Inter-Regular',
  },
  updateButton: {
    backgroundColor: '#FB92BD',
    paddingVertical: 12,
    paddingHorizontal: 40,
    borderRadius: 25,
    alignSelf: 'center',
    marginTop: 10,
  },
  updateButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Inter-Bold',
  },
  bottomLogo: {
    width: width,
    height: 200,
    position: 'absolute',
    bottom: 0,
    alignSelf: 'center',
    opacity: 0.9,
  },
});