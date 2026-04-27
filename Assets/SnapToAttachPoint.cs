using UnityEngine;
using System.Collections.Generic;

public class SnapToAttachPoint : MonoBehaviour
{
    [Header("Snapping Settings")]
    public float snapDistance = 1.5f;
    public AttachPointType targetAttachPoint;
    public Vector3 visualOffset;

    private Dictionary<AttachPointType, Transform> attachPointMap;
    private bool isSnapped = false;

    void Start()
    {
        GameObject mannequin = GameObject.Find("mannequin_female");

        if (mannequin == null)
        {
            Debug.LogError("Mannequin not found! Check name in Hierarchy.");
            return;
        }

        attachPointMap = new Dictionary<AttachPointType, Transform>()
        {
            { AttachPointType.Head,  mannequin.transform.Find("Attachpoint_Head") },
            { AttachPointType.Chest, mannequin.transform.Find("Attachpoint_Chest") },
            { AttachPointType.Hips,  mannequin.transform.Find("Attachpoint_Hips") },
            { AttachPointType.Legs,  mannequin.transform.Find("Attachpoint_Legs") },
            { AttachPointType.Feet,  mannequin.transform.Find("Attachpoint_feet") }
        };

        foreach (var pair in attachPointMap)
        {
            if (pair.Value == null)
                Debug.LogError("Missing attach point: " + pair.Key);
        }
    }

    void Update()
    {
        if (isSnapped || attachPointMap == null) return;

        if (!attachPointMap.ContainsKey(targetAttachPoint)) return;

        Transform point = attachPointMap[targetAttachPoint];
        if (point == null) return;

        float distance = Vector3.Distance(transform.position, point.position);
        if (distance <= snapDistance)
            SnapTo(point);
    }

    void SnapTo(Transform point)
    {
        isSnapped = true;
        transform.SetParent(point);
        transform.localPosition = visualOffset;
        transform.localRotation = Quaternion.identity;

        Rigidbody rb = GetComponent<Rigidbody>();
        if (rb != null)
        {
            rb.isKinematic = true;
            rb.useGravity = false;
        }

        Debug.Log("Snapped " + gameObject.name + " to " + point.name);
    }

    public void Unsnap()
    {
        if (!isSnapped) return;

        isSnapped = false;
        transform.SetParent(null);

        Rigidbody rb = GetComponent<Rigidbody>();
        if (rb != null)
        {
            rb.isKinematic = false;
            rb.useGravity = false;
        }

        Debug.Log("Unsnapped " + gameObject.name);
    }
}


