import { StyleSheet } from 'react-native';
import { COLORS } from '@/constants/theme';

export const styles = StyleSheet.create({
	scroll: { 
        flex: 1, 
        backgroundColor: COLORS.offWhite 
    },
	container: { 
        paddingTop: 60, 
        paddingBottom: 60, 
        paddingHorizontal: 20, 
        gap: 20 
    },
	loadingWrap: { 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center', 
        backgroundColor: COLORS.offWhite 
    },

	header: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginBottom: 8,
	},
	backBtn: {
		width: 36, 
        height: 36,
		borderRadius: 10,
		backgroundColor: COLORS.white,
		justifyContent: 'center',
		alignItems: 'center',
	},
	headerSpacer: { 
        width: 36 
    },
	pageTitle: { 
        fontSize: 18, 
        fontWeight: '700', 
        color: COLORS.text 
    },
	pfpOverlay: {
		alignSelf: 'flex-start',
		alignItems: 'flex-start',
		marginTop: -40,
		marginBottom: 2,
		marginLeft: 12,
		zIndex: 5,
	},
	avatarWrap: { 
        position: 'relative' 
    },
	avatar: {
		width: 82, 
        height: 82, 
        borderRadius: 41,
		borderWidth: 3, 
        borderColor: COLORS.lightPink,
	},
	avatarPlaceholder: {
		width: 82, 
        height: 82, 
        borderRadius: 41,
		backgroundColor: COLORS.lightPink,
		justifyContent: 'center', 
        alignItems: 'center',
	},
	cameraBtn: {
		position: 'absolute',
		bottom: 0,
		right: 0,
		width: 28, 
        height: 28,
		borderRadius: 14,
		backgroundColor: COLORS.hotPink,
		justifyContent: 'center',
		alignItems: 'center',
		borderWidth: 2,
		borderColor: COLORS.white,
	},
	banner: {
		width: '100%',
		height: 120,
		borderRadius: 12,
		overflow: 'hidden',
		position: 'relative',
		marginTop: 6,
	},
	bannerImg: { 
        width: '100%', 
        height: '100%' 
    },
	bannerPlaceholder: { 
        width: '100%', 
        height: '100%', 
        justifyContent: 'center', 
        alignItems: 'center' 
    },
	bannerCameraBtn: {
		position: 'absolute',
		top: 10,
		right: 10,
		width: 28,
		height: 28,
		borderRadius: 14,
		backgroundColor: COLORS.hotPink,
		justifyContent: 'center',
		alignItems: 'center',
		borderWidth: 2,
		borderColor: COLORS.white,
	},
	card: {
		backgroundColor: COLORS.white,
		borderRadius: 16,
		padding: 16,
		gap: 8,
		shadowColor: COLORS.hotPink,
		shadowOffset: { 
            width: 0, 
            height: 2 
        },
		shadowOpacity: 0.06,
		shadowRadius: 8,
		elevation: 2,
	},
	fieldLabel: { 
        fontSize: 12, 
        fontWeight: '600', 
        color: COLORS.subText, 
        textTransform: 'uppercase', 
        letterSpacing: 0.8 
    },
	input: {
		fontSize: 16,
		color: COLORS.text,
		borderBottomWidth: 1.5,
		borderBottomColor: COLORS.lightGray,
		paddingVertical: 6,
	},
	divider: { 
        height: 1, 
        marginVertical: 4 
    },
	charCount: { 
        fontSize: 11, 
        color: COLORS.lightGray, 
        textAlign: 'right' 
    },
	saveBtn: {
		backgroundColor: COLORS.hotPink,
		borderRadius: 16,
		paddingVertical: 16,
		alignItems: 'center',
		shadowColor: COLORS.hotPink,
		shadowOffset: { 
            width: 0, 
            height: 4 
        },
		shadowOpacity: 0.3,
		shadowRadius: 10,
		elevation: 4,
	},
	saveBtnDisabled: { 
        opacity: 0.6 
    },
	saveBtnText: { 
        fontSize: 16, 
        fontWeight: '700', 
        color: COLORS.white 
    },
	uploadStatus: { 
        textAlign: 'center', 
        color: COLORS.subText, 
        fontSize: 13 
    },
});
