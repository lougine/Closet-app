import { Dimensions, StyleSheet } from 'react-native';

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  topImage: {
    position: 'absolute',
    top: 0,
    width: width,
    height: 140,
    zIndex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 25,
    paddingTop: 150,
    paddingBottom: 40,
  },
  backButton: {
    width: 40,
    height: 40,
    backgroundColor: '#CCCCCC',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    zIndex: 2,
  },
  backText: {
    color: '#000000',
    fontSize: 28,
    fontWeight: '300',
    marginTop: -4,
  },
  label: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    marginBottom: 8,
    marginTop: 12,
  },
  dropdown: {
    backgroundColor: '#000000',
    borderRadius: 15,
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: '#1f1f1f',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Inter-Regular',
  },
  placeholder: {
    color: '#666666',
  },
  arrow: {
    color: '#ccc',
    fontSize: 10,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  half: {
    flex: 1,
  },
  signUpButton: {
    backgroundColor: '#FF8CBE',
    paddingVertical: 12,
    paddingHorizontal: 40,
    borderRadius: 25,
    alignSelf: 'center',
    marginTop: 30,
  },
  signUpText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Inter-Bold',
  },
  bottomLogo: {
    width: 260,
    height: 190,
    marginTop: 10,
    alignSelf: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBox: {
    backgroundColor: '#D9D9D9',
    borderRadius: 20,
    width: width * 0.8,
    maxHeight: '60%',
    overflow: 'hidden',
  },
  modalOption: {
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  modalOptionText: {
    color: '#000',
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
  },
  modalOptionSelected: {
    color: '#E91E63',
    fontFamily: 'Inter-Bold',
  },
});

export default styles;