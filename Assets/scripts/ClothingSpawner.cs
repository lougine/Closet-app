using UnityEngine;

public class ClothingSpawner : MonoBehaviour
{
    public GameObject clothingItemTemplate; // Drag ClothingItem_Template prefab here
    public ClothingItemData[] clothingItems; // Drag ScriptableObjects here
    public Transform[] spawnPoints; // Where clothing spawns (hangers in wardrobe)

    void Start()
    {
        SpawnClothingItems();
    }

    void SpawnClothingItems()
    {
        for (int i = 0; i < clothingItems.Length && i < spawnPoints.Length; i++)
        {
            CreateClothingItem(clothingItems[i], spawnPoints[i].position);
        }
    }

    GameObject CreateClothingItem(ClothingItemData data, Vector3 position)
    {
        // Instantiate the template
        GameObject item = Instantiate(clothingItemTemplate, position, Quaternion.identity);
        item.name = data.itemName;

        // Configure Box Collider
        BoxCollider collider = item.GetComponent<BoxCollider>();
        if (collider != null)
        {
            collider.size = data.colliderSize;
            collider.center = data.colliderCenter;
        }

        // Configure SnapToAttachPoint
        SnapToAttachPoint snap = item.GetComponent<SnapToAttachPoint>();
        if (snap != null)
        {
            snap.targetAttachPoint = data.attachPointType;
        }

        // Instantiate the actual clothing model as child
        if (data.modelPrefab != null)
        {
            // Remove placeholder mesh if it exists
            Transform placeholder = item.transform.Find("Mesh_Placeholder");
            if (placeholder != null)
                Destroy(placeholder.gameObject);

            // Add the real model
            GameObject model = Instantiate(data.modelPrefab, item.transform);
            model.name = "Mesh";
            model.transform.localPosition = Vector3.zero;
            model.transform.localRotation = Quaternion.Euler(data.modelRotationOffset);
            model.transform.localScale = data.modelScale;
        }

        return item;
    }
}
