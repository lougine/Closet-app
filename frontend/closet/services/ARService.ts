import { NativeModules, NativeEventEmitter, Platform } from 'react-native';

type UnityBridgeModule = {
  launchAR: (payload: string) => void;
};

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

export interface ARAvailability {
  available: boolean;
  reason?: string;
}

let _emitter: NativeEventEmitter | null = null;

function getUnityBridge(): UnityBridgeModule | null {
  const bridge = NativeModules?.UnityBridge as UnityBridgeModule | undefined;
  return bridge ?? null;
}

function getEmitter(): NativeEventEmitter | null {
  const unityBridge = getUnityBridge();
  if (!_emitter && unityBridge) {
    _emitter = new NativeEventEmitter(unityBridge);
  }
  return _emitter;
}

function getAvailability(): ARAvailability {
  if (Platform.OS !== 'android') {
    return {
      available: false,
      reason: 'AR try-on is currently available on Android only.',
    };
  }

  if (!getUnityBridge()) {
    return {
      available: false,
      reason:
        'AR try-on is unavailable in this build. Use an Android dev/client build that includes the Unity native module.',
    };
  }

  return { available: true };
}

function attachCloseListener(onClose?: () => void): void {
  if (!onClose) return;

  const emitter = getEmitter();
  if (!emitter) return;

  const sub = emitter.addListener('onUnityEvent', (json: string) => {
    try {
      const event = JSON.parse(json) as { type?: string };
      if (event.type === 'closed') {
        sub.remove();
        onClose();
      }
    } catch {}
  });
}

const ARService = {
  getAvailability(): ARAvailability {
    return getAvailability();
  },

  /**
   * Launch AR try-on with a single product
   */
  openWithProduct(product: ARProduct, onClose?: () => void): boolean {
    const availability = getAvailability();
    if (!availability.available) {
      console.warn(`ARService: ${availability.reason}`);
      return false;
    }

    const unityBridge = getUnityBridge();
    if (!unityBridge) return false;

    const garment: ARGarment = {
      slot: product.slot ?? 'UpperBody',
      category: product.arCategory,
      fabricType: product.fabricType,
      primaryColor: product.primaryColor,
    };

    const payload = JSON.stringify({ garments: [garment] });
    unityBridge.launchAR(payload);
    attachCloseListener(onClose);
    return true;
  },

  /**
   * Launch AR try-on with a full outfit (top + bottom)
   */
  openWithOutfit(
    top: ARProduct,
    bottom: ARProduct,
    onClose?: () => void
  ): boolean {
    const availability = getAvailability();
    if (!availability.available) {
      console.warn(`ARService: ${availability.reason}`);
      return false;
    }

    const unityBridge = getUnityBridge();
    if (!unityBridge) return false;

    const garments: ARGarment[] = [
      { slot: 'UpperBody', category: top.arCategory, fabricType: top.fabricType, primaryColor: top.primaryColor },
      { slot: 'LowerBody', category: bottom.arCategory, fabricType: bottom.fabricType, primaryColor: bottom.primaryColor },
    ];

    const payload = JSON.stringify({ garments });
    unityBridge.launchAR(payload);
    attachCloseListener(onClose);
    return true;
  },
};

export default ARService;
