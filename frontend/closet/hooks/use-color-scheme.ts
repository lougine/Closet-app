import { useAppTheme } from '@/context/themeContext';

export function useColorScheme(): 'light' | 'dark' {
	const { isDarkMode } = useAppTheme();
	return isDarkMode ? 'dark' : 'light';
}
