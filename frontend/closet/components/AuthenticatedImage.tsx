import React from 'react';
import { Image } from 'react-native';

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
  // Temporarily just use regular Image component for testing
  console.log('AuthenticatedImage: Using source URI directly:', source.uri);
  return (
    <Image
      source={source}
      style={style}
      resizeMode={resizeMode}
      onLoadStart={() => console.log('Image load started')}
      onLoad={() => console.log('Image loaded successfully')}
      onError={(error) => console.log('Image load error:', error)}
    />
  );
}