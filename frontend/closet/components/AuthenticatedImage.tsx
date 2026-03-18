import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, View } from 'react-native';
import * as SecureStore from 'expo-secure-store';

interface AuthenticatedImageProps {
  source: { uri: string };
  style?: any;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'repeat' | 'center';
  placeholder?: React.ReactNode;
}

export default function AuthenticatedImage({
  source,
  style,
  resizeMode = 'cover',
  placeholder
}: AuthenticatedImageProps) {
  const [token, setToken] = useState<string | null>(null);
  const [tokenLoaded, setTokenLoaded] = useState(false);
  const requiresAuth = source.uri.includes('/api/uploads/');

  useEffect(() => {
    let mounted = true;

    const loadToken = async () => {
      const authToken = await SecureStore.getItemAsync('userToken');
      if (mounted) {
        setToken(authToken);
        setTokenLoaded(true);
      }
    };

    loadToken();

    return () => {
      mounted = false;
    };
  }, []);

  const resolvedSource = useMemo(() => {
    if (!requiresAuth || !token) {
      return source;
    }

    return {
      uri: source.uri,
      headers: {
        Authorization: `Bearer ${token}`,
      },
    };
  }, [source, token]);

  if (requiresAuth && !tokenLoaded) {
    return (
      <View style={[style, { alignItems: 'center', justifyContent: 'center' }]}>
        {placeholder || <ActivityIndicator size="small" color="#E91E63" />}
      </View>
    );
  }

  return (
    <Image
      source={resolvedSource}
      style={style}
      resizeMode={resizeMode}
    />
  );
}