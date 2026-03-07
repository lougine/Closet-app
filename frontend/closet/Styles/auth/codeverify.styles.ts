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
    alignItems: 'center',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    marginBottom: 10,
    alignSelf: 'flex-start',
  },
  subtitle: {
    color: '#888888',
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    marginBottom: 30,
    lineHeight: 22,
    alignSelf: 'flex-start',
  },
  emailHighlight: {
    color: '#FB92BD',
    fontFamily: 'Inter-Regular',
  },
  codeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 30,
    gap: 10,
  },
  codeBox: {
    flex: 1,
    height: 55,
    backgroundColor: '#000000',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1A1A1A',
    color: '#FFFFFF',
    fontSize: 22,
    fontFamily: 'Inter-Bold',
  },
  codeBoxFilled: {
    borderColor: '#FB92BD',
  },
  verifyButton: {
    backgroundColor: '#FB92BD',
    paddingVertical: 12,
    paddingHorizontal: 50,
    borderRadius: 25,
    alignSelf: 'center',
    marginBottom: 20,
  },
  verifyButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Inter-Bold',
  },
  resendText: {
    color: '#888888',
    fontSize: 13,
    fontFamily: 'Inter-Regular',
  },
  resendLink: {
    color: '#F0507B',
    fontFamily: 'Inter-Regular',
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