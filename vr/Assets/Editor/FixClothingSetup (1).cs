using UnityEngine;
using UnityEditor;

/// <summary>
/// Quick fix script for t-shirt collider and position
/// Place in Assets/Editor/ folder
/// Access via: Unity Menu → Tools → Fix T-Shirt Setup
/// </summary>
public class FixClothingSetup : EditorWindow
{
    [MenuItem("Tools/Fix T-Shirt Setup")]
    public static void FixTShirt()
    {
        // Find the t-shirt object
        GameObject tShirt = GameObject.Find("t-_shirt");
        
        if (tShirt == null)
        {
            Debug.LogError("Could not find 't-_shirt' object in scene!");
            EditorUtility.DisplayDialog("Error", "Could not find 't-_shirt' in the scene. Make sure it exists.", "OK");
            return;
        }

        // Fix position
        tShirt.transform.position = new Vector3(0, 1, -4);
        
        // Get or add Box Collider
        BoxCollider collider = tShirt.GetComponent<BoxCollider>();
        if (collider == null)
        {
            collider = tShirt.AddComponent<BoxCollider>();
            Debug.Log("Added BoxCollider to t-shirt");
        }
        
        // Set collider size (make it MUCH bigger)
        collider.size = new Vector3(10f, 10f, 10f);
        collider.center = Vector3.zero;
        
        // Make sure it's not a trigger
        collider.isTrigger = false;
        
        // Check/fix Rigidbody
        Rigidbody rb = tShirt.GetComponent<Rigidbody>();
        if (rb == null)
        {
            rb = tShirt.AddComponent<Rigidbody>();
            Debug.Log("Added Rigidbody to t-shirt");
        }
        rb.useGravity = true;
        rb.isKinematic = false;
        
        // Check for SnapToAttachPoint script
        if (tShirt.GetComponent<SnapToAttachPoint>() == null)
        {
            Debug.LogWarning("t-shirt is missing SnapToAttachPoint script!");
        }

        Debug.Log($"✓ Fixed t-shirt setup:\n" +
                  $"  Position: {tShirt.transform.position}\n" +
                  $"  Collider Size: {collider.size}\n" +
                  $"  Collider Center: {collider.center}");
        
        EditorUtility.DisplayDialog("Success", 
            "T-shirt setup fixed!\n\n" +
            "Position: (0, 1, -4)\n" +
            "Collider Size: (10, 10, 10)\n\n" +
            "Try grabbing it now with Left Click!", 
            "OK");
    }

    [MenuItem("Tools/Debug Raycast Info")]
    public static void DebugRaycastSetup()
    {
        GameObject cam = GameObject.Find("Main Camera");
        if (cam == null)
        {
            Debug.LogError("Main Camera not found!");
            return;
        }

        GameObject tShirt = GameObject.Find("t-_shirt");
        if (tShirt == null)
        {
            Debug.LogError("t-_shirt not found!");
            return;
        }

        Debug.Log("=== Raycast Debug Info ===");
        Debug.Log($"Camera Position: {cam.transform.position}");
        Debug.Log($"Camera Forward: {cam.transform.forward}");
        Debug.Log($"T-Shirt Position: {tShirt.transform.position}");
        
        BoxCollider col = tShirt.GetComponent<BoxCollider>();
        if (col != null)
        {
            Debug.Log($"Collider Size: {col.size}");
            Debug.Log($"Collider Center: {col.center}");
            Debug.Log($"Collider Bounds: {col.bounds}");
        }
        else
        {
            Debug.LogError("T-Shirt has no BoxCollider!");
        }

        // Test a raycast
        Ray ray = new Ray(cam.transform.position, cam.transform.forward);
        RaycastHit hit;
        if (Physics.Raycast(ray, out hit, 100f))
        {
            Debug.Log($"✓ Raycast HIT: {hit.collider.gameObject.name} at distance {hit.distance}");
        }
        else
        {
            Debug.LogWarning("✗ Raycast hit NOTHING in 100 units");
        }
    }
}
