using UnityEngine;
using UnityEngine.Networking;
using System.Collections;

[System.Serializable]
public class Garment
{
    public string _id;
    public string name;
    public string imageUrl;
    public string category;
}

public class ClothingPanelSpawner : MonoBehaviour
{
    [Header("API")]
    public string apiUrl = "http://localhost:5000/api/garments";

    [Header("Scene Setup")]
    public Transform[] hangerPoints;
    public GameObject panelPrefab;

    void Start()
    {
        StartCoroutine(FetchAndSpawn());
    }

    IEnumerator FetchAndSpawn()
    {
        UnityWebRequest request = UnityWebRequest.Get(apiUrl);
        yield return request.SendWebRequest();

        if (request.result != UnityWebRequest.Result.Success)
        {
            Debug.LogError("API ERROR: " + request.error);
            yield break;
        }

        string json = request.downloadHandler.text;
        Debug.Log("API RESPONSE: " + json);

        Garment[] garments = JsonHelper.FromJson<Garment>(json);

        if (garments == null || garments.Length == 0)
        {
            Debug.LogError("No garments found! Check API response.");
            yield break;
        }

        for (int i = 0; i < garments.Length && i < hangerPoints.Length; i++)
        {
            StartCoroutine(SpawnPanel(garments[i], hangerPoints[i]));
        }
    }

    IEnumerator SpawnPanel(Garment garment, Transform hanger)
    {
        UnityWebRequest imgRequest = UnityWebRequestTexture.GetTexture(garment.imageUrl);
        yield return imgRequest.SendWebRequest();

        if (imgRequest.result != UnityWebRequest.Result.Success)
        {
            Debug.LogError("Image load failed for: " + garment.name);
            yield break;
        }

        Texture2D tex = DownloadHandlerTexture.GetContent(imgRequest);

        // Spawn the panel at the hanger position
        GameObject panel = Instantiate(panelPrefab, hanger.position, hanger.rotation);
        panel.name = garment.name;

        // Apply the clothing photo as texture
        Renderer r = panel.GetComponent<Renderer>();
        if (r != null) r.material.mainTexture = tex;

        // Make it grabbable
        panel.tag = "Grabbable";
        panel.layer = LayerMask.NameToLayer("Clothing");

        // Set which attach point based on category from database
        SnapToAttachPoint snap = panel.GetComponent<SnapToAttachPoint>();
        if (snap != null)
        {
            string cat = garment.category != null ? garment.category.ToLower() : "";

            if (cat.Contains("top") || cat.Contains("shirt") || cat.Contains("jacket"))
                snap.targetAttachPoint = AttachPointType.Chest;
            else if (cat.Contains("bottom") || cat.Contains("pant") || cat.Contains("skirt"))
                snap.targetAttachPoint = AttachPointType.Hips;
            else if (cat.Contains("hat") || cat.Contains("cap") || cat.Contains("head"))
                snap.targetAttachPoint = AttachPointType.Head;
            else if (cat.Contains("shoe") || cat.Contains("boot") || cat.Contains("feet"))
                snap.targetAttachPoint = AttachPointType.Feet;
            else if (cat.Contains("dress"))
                snap.targetAttachPoint = AttachPointType.Chest;
            else
                snap.targetAttachPoint = AttachPointType.Chest; // default
        }

        Debug.Log("Spawned: " + garment.name);
    }
}