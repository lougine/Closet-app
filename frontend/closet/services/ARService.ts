import { NativeModules, NativeEventEmitter, Platform } from 'react-native';

const { UnityBridge } = NativeModules;

export interface ARGarment {
  slot: 'UpperBody' | 'LowerBody';
  category: string;      // e.g. "TShirt", "Hoodie", "Pants"
  fabricType: string;    // e.g. "Cotton", "Denim", "Silk"
  primaryColor: string;  // hex e.g. "#3A7BD5"
}

export interface ARProduct {
  arCategory: string;
  fabricType: string;
  primaryColor: string;
  slot?: 'UpperBody' | 'LowerBody';
}

let _emitter: NativeEventEmitter | null = null;

function getEmitter(): NativeEventEmitter {
  if (!_emitter && UnityBridge) {
    _emitter = new NativeEventEmitter(UnityBridge);
  }
  return _emitter!;
}

const ARService = {
  /**
   * Launch AR try-on with a single product
   */
  openWithProduct(product: ARProduct, onClose?: () => void): void {
    if (Platform.OS !== 'android') {
      console.warn('ARService: AR try-on is Android only');
      return;
    }
    if (!UnityBridge) {
      console.error('ARService: UnityBridge native module not found. Is unityLibrary linked?');
      return;
    }

    const garment: ARGarment = {
      slot: product.slot ?? 'UpperBody',
      category: product.arCategory,
      fabricType: product.fabricType,
      primaryColor: product.primaryColor,
    };

    const payload = JSON.stringify({ garments: [garment] });
    UnityBridge.launchAR(payload);

    if (onClose) {
      const sub = getEmitter().addListener('onUnityEvent', (json: string) => {
        try {
          const event = JSON.parse(json);
          if (event.type === 'closed') {
            sub.remove();
            onClose();
          }
        } catch (_) {}
      });
    }
  },

  /**
   * Launch AR try-on with a full outfit (top + bottom)
   */
  openWithOutfit(
    top: ARProduct,
    bottom: ARProduct,
    onClose?: () => void
  ): void {
    if (Platform.OS !== 'android') return;
    if (!UnityBridge) return;

    const garments: ARGarment[] = [
      { slot: 'UpperBody', category: top.arCategory, fabricType: top.fabricType, primaryColor: top.primaryColor },
      { slot: 'LowerBody', category: bottom.arCategory, fabricType: bottom.fabricType, primaryColor: bottom.primaryColor },
    ];

    const payload = JSON.stringify({ garments });
    UnityBridge.launchAR(payload);

    if (onClose) {
      const sub = getEmitter().addListener('onUnityEvent', (json: string) => {
        try {
          const event = JSON.parse(json);
          if (event.type === 'closed') {
            sub.remove();
            onClose();
          }
        } catch (_) {}
      });
    }
  },
};

export default ARService;
