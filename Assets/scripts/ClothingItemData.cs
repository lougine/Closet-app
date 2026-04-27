using UnityEngine;

[CreateAssetMenu(fileName = "NewClothingItem", menuName = "Wardrobe/Clothing Item")]
public class ClothingItemData : ScriptableObject
{
    public string itemName;
    public ClothingType clothingType;
    
    [Header("Model")]
    public GameObject modelPrefab; // Your glTF/GLB imported model
    
    [Header("Snap Settings")]
    public AttachPointType attachPointType;
    
    [Header("Collider Settings")]
    public Vector3 colliderSize = Vector3.one;
    public Vector3 colliderCenter = Vector3.zero;
    
    [Header("Display Settings")]
    public Vector3 modelScale = Vector3.one;
    public Vector3 modelRotationOffset = Vector3.zero;
}

public enum ClothingType
{
    Hat,
    Shirt,
    Pants,
    Shoes,
    Accessory
}

public enum AttachPointType
{
    Head,
    Chest,
    Hips,
    Legs,
    Feet
}