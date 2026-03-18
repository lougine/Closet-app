import React from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import { buildImageUrl } from '@/constants/api';
import AuthenticatedImage from './AuthenticatedImage';

type OutfitPreviewSource = {
  previewImage?: string | null;
  garments?: Array<{ imageUrl?: string | null }>;
};

type OutfitPreviewCollageProps = {
  outfit?: OutfitPreviewSource | null;
  style?: StyleProp<ViewStyle>;
};

type Tile = {
  key: string;
  uri: string;
};

const buildTiles = (outfit?: OutfitPreviewSource | null) => {
  const tiles: Tile[] = [];
  const seen = new Set<string>();

  const addTile = (uri?: string | null, key = '') => {
    if (!uri || seen.has(uri) || tiles.length >= 4) return;
    seen.add(uri);
    tiles.push({ key: key || uri, uri });
  };

  addTile(outfit?.previewImage ? buildImageUrl(outfit.previewImage) : null, 'preview');

  if (Array.isArray(outfit?.garments)) {
    outfit.garments.forEach((garment, index) => {
      addTile(garment?.imageUrl ? buildImageUrl(garment.imageUrl) : null, `garment-${index}`);
    });
  }

  return tiles;
};

export default function OutfitPreviewCollage({ outfit, style }: OutfitPreviewCollageProps) {
  const tiles = buildTiles(outfit);

  if (tiles.length === 0) {
    return <View style={[style, { backgroundColor: '#f2f2f2' }]} />;
  }

  if (tiles.length === 1) {
    return (
      <AuthenticatedImage
        source={{ uri: tiles[0].uri }}
        style={style as any}
        resizeMode="cover"
      />
    );
  }

  if (tiles.length === 2) {
    return (
      <View style={[style, { flexDirection: 'row', overflow: 'hidden', backgroundColor: '#f2f2f2' }]}>
        {tiles.map((tile) => (
          <View key={tile.key} style={{ width: '50%', height: '100%', padding: 1 }}>
            <AuthenticatedImage source={{ uri: tile.uri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
          </View>
        ))}
      </View>
    );
  }

  if (tiles.length === 3) {
    return (
      <View style={[style, { flexDirection: 'row', overflow: 'hidden', backgroundColor: '#f2f2f2' }]}>
        <View style={{ width: '50%', height: '100%', padding: 1 }}>
          <AuthenticatedImage source={{ uri: tiles[0].uri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
        </View>
        <View style={{ width: '50%', height: '100%' }}>
          <View style={{ height: '50%', padding: 1 }}>
            <AuthenticatedImage source={{ uri: tiles[1].uri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
          </View>
          <View style={{ height: '50%', padding: 1 }}>
            <AuthenticatedImage source={{ uri: tiles[2].uri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={[style, { flexDirection: 'row', flexWrap: 'wrap', overflow: 'hidden', backgroundColor: '#f2f2f2' }]}>
      {tiles.slice(0, 4).map((tile) => (
        <View key={tile.key} style={{ width: '50%', height: '50%', padding: 1 }}>
          <AuthenticatedImage source={{ uri: tile.uri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
        </View>
      ))}
    </View>
  );
}
