import { ExternalLink } from '@/components/external-link';
import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Collapsible } from '@/components/ui/collapsible';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Fonts } from '@/constants/theme';
import { StatusBar } from 'expo-status-bar';
import { Image, SafeAreaView, StyleSheet } from 'react-native';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';

export default function TabTwoScreen() {
  return (
    <SafeAreaView style={styles.safe}>
        <StatusBar style="light" translucent />
      <ParallaxScrollView
        headerBackgroundColor={{ light: '#D0D0D0', dark: '#353636' }}
        headerImage={
          <IconSymbol
            size={310}
            color="#808080"
            name="chevron.left.forwardslash.chevron.right"
            style={styles.headerImage}
          />
        }
      >
        <ThemedView style={styles.titleContainer}>
          <ThemedText type="title" style={{ fontFamily: Fonts.rounded }}>
            Explore
          </ThemedText>
        </ThemedView>

        <ThemedText>
          This app includes example code to help you get started.
        </ThemedText>

        {/* Collapsible sections */}
        <Collapsible title="File-based routing">
          <ThemedText>
            This app has two screens:{' '}
            <ThemedText type="defaultSemiBold">app/(tabs)/index.tsx</ThemedText> and{' '}
            <ThemedText type="defaultSemiBold">app/(tabs)/explore.tsx</ThemedText>
          </ThemedText>
          <ThemedText>
            The layout file in{' '}
            <ThemedText type="defaultSemiBold">app/(tabs)/_layout.tsx</ThemedText>{' '}
            sets up the tab navigator.
          </ThemedText>
          <ExternalLink href="https://docs.expo.dev/router/introduction">
            <ThemedText type="link">Learn more</ThemedText>
          </ExternalLink>
        </Collapsible>

        {/* ...rest of collapsibles and content */}

        <Collapsible title="Images">
          <ThemedText>
            For static images, you can use the <ThemedText type="defaultSemiBold">@2x</ThemedText>{' '}
            and <ThemedText type="defaultSemiBold">@3x</ThemedText> suffixes to provide files for
            different screen densities
          </ThemedText>
          <Image
            source={require('@/assets/images/react-logo.png')}
            style={{ width: 100, height: 100, alignSelf: 'center' }}
          />
          <ExternalLink href="https://reactnative.dev/docs/images">
            <ThemedText type="link">Learn more</ThemedText>
          </ExternalLink>
        </Collapsible>

      </ParallaxScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  
   safe: {
    flex: 1,
    backgroundColor: 'transparent', // fully see-through
  },
    headerImage: {
    color: '#808080',
    bottom: -90,
    left: -35,
    position: 'absolute',
  },
  titleContainer: {
    flexDirection: 'row',
    gap: 8,
  },
});