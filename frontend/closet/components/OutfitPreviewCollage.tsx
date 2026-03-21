import React from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import { buildImageUrl } from '@/constants/api';
import AuthenticatedImage from './AuthenticatedImage';

type OutfitPreviewSource = {
  previewImage?: string | null;
  isLookbook?: boolean;
  garments?: Array<{ imageUrl?: string | null }>;
};

type OutfitPreviewCollageProps = {
  outfit?: OutfitPreviewSource | null;
  style?: StyleProp<ViewStyle>;
};

type Tile = {
  key: string;
  uri?: string | null;
};

const buildTiles = (outfit?: OutfitPreviewSource | null) => {
  const tiles: Tile[] = [];

  const addTile = (uri?: string | null, key = '') => {
    if (tiles.length >= 4) return;
    tiles.push({ key: key || uri, uri });
  };

  if (outfit?.isLookbook && outfit?.previewImage) {
    addTile(buildImageUrl(outfit.previewImage), 'preview');
    return tiles;
  }

  if (Array.isArray(outfit?.garments)) {
    outfit.garments.forEach((garment, index) => {
      addTile(garment?.imageUrl ? buildImageUrl(garment.imageUrl) : null, `garment-${index}`);
    });
  }

  if (tiles.length === 0 && outfit?.previewImage) {
    addTile(buildImageUrl(outfit.previewImage), 'preview');
  }

  return tiles;
};

const TileContent = ({ tile }: { tile: Tile }) => {
  if (!tile.uri) {
    return <View style={{ width: '100%', height: '100%', backgroundColor: '#ececec' }} />;
  }

  return <AuthenticatedImage source={{ uri: tile.uri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />;
};

export default function OutfitPreviewCollage({ outfit, style }: OutfitPreviewCollageProps) {
  const tiles = buildTiles(outfit);

  if (tiles.length === 0) {
    return <View style={[style, { backgroundColor: '#f2f2f2' }]} />;
  }

  if (tiles.length === 1) {
    if (!tiles[0].uri) {
      return <View style={[style, { backgroundColor: '#ececec' }]} />;
    }

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
            <TileContent tile={tile} />
          </View>
        ))}
      </View>
    );
  }

  if (tiles.length === 3) {
    return (
      <View style={[style, { flexDirection: 'row', overflow: 'hidden', backgroundColor: '#f2f2f2' }]}>
        <View style={{ width: '50%', height: '100%', padding: 1 }}>
          <TileContent tile={tiles[0]} />
        </View>
        <View style={{ width: '50%', height: '100%' }}>
          <View style={{ height: '50%', padding: 1 }}>
            <TileContent tile={tiles[1]} />
          </View>
          <View style={{ height: '50%', padding: 1 }}>
            <TileContent tile={tiles[2]} />
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={[style, { flexDirection: 'row', flexWrap: 'wrap', overflow: 'hidden', backgroundColor: '#f2f2f2' }]}>
      {tiles.slice(0, 4).map((tile) => (
        <View key={tile.key} style={{ width: '50%', height: '50%', padding: 1 }}>
          <TileContent tile={tile} />
        </View>
      ))}
    </View>
  );
}
