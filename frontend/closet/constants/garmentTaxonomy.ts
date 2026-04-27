export const GARMENT_SUBCATEGORY_TREE: Record<string, string[]> = {
  Tops: ['T-Shirt', 'Blouse', 'Crop Top', 'Tank Top', 'Shirt', 'Hoodie', 'Sweater', 'Cardigan'],
  Bottoms: ['Jeans', 'Skirt', 'Shorts', 'Trousers', 'Leggings', 'Cargo Pants', 'Sweatpants'],
  Dresses: ['Mini Dress', 'Bodycon'],
  Outerwear: ['Jacket', 'Blazer', 'Coat', 'Trench Coat', 'Puffer', 'Leather Jacket', 'Denim Jacket', 'Vest'],
  Footwear: ['Sneakers', 'Heels', 'Boots', 'Sandals', 'Platforms'],
  Accessories: ['Bag', 'Belt', 'Hat', 'Sunglasses', 'Jewellery', 'Scarf', 'Watch'],
  Bags: ['Handbag', 'Tote', 'Clutch', 'Backpack', 'Mini Bag', 'Shoulder Bag'],
  Swimwear: ['One-Piece', 'Coverup', 'Swim Shorts'],
};

export const GARMENT_SUBCATEGORY_OPTIONS = Object.values(GARMENT_SUBCATEGORY_TREE).flat();

export const GARMENT_STYLE_TAG_OPTIONS = [
  'formal',
  'casual',
  'sportswear',
  'streetwear',
  'business',
  'loungewear',
  'evening',
  'outdoor',
  'workwear',
  'vacation',
  'athleisure',
  'vintage',
  'minimalist',
  'luxury',
  'seasonal',
] as const;

export const GARMENT_STYLE_TAG_SET = new Set<string>(GARMENT_STYLE_TAG_OPTIONS);

export const GARMENT_FABRIC_OPTIONS = [
  'cotton',
  'denim',
  'leather',
  'silk',
  'wool',
  'polyester',
  'linen',
  'velvet',
  'chiffon',
  'fleece',
  'lace',
  'nylon',
  'corduroy',
  'spandex',
  'satin'
] as const;

export const GARMENT_FABRIC_SET = new Set<string>(GARMENT_FABRIC_OPTIONS);
