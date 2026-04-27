using UnityEngine;

public class SnapToAttachPoint : MonoBehaviour
{
    public float snapDistance = 2.0f; 
    public AttachPointType targetAttachPoint; 
    public Vector3 visualOffset; // Use this to nudge the shirt if it snaps too high/low
    
    private Transform[] attachPoints;
    private bool isSnapped = false;

    void Start()
    {
        GameObject mannequin = GameObject.Find("mannequin_female");
        if (mannequin != null)
        {
            attachPoints = new Transform[]
            {
                mannequin.transform.Find("Attachpoint_Head"),
                mannequin.transform.Find("Attachpoint_Chest"),
                mannequin.transform.Find("Attachpoint_Hips"),
                mannequin.transform.Find("Attachpoint_Legs"),
                mannequin.transform.Find("Attachpoint_feet")
            };
        }
    }

    void Update()
    {
        if (isSnapped || attachPoints == null) return;

        Transform point = GetTargetAttachPoint();
        if (point == null) return;

        // Check distance from the child mesh if possible, otherwise use root
        float distance = Vector3.Distance(transform.position, point.position);

        if (distance < snapDistance)
        {
            SnapTo(point);
        }
    }

    Transform GetTargetAttachPoint()
    {
        if (attachPoints == null) return null;
        switch (targetAttachPoint)
        {
            case AttachPointType.Head:  return attachPoints[0];
            case AttachPointType.Chest: return attachPoints[1];
            case AttachPointType.Hips:  return attachPoints[2];
            case AttachPointType.Legs:  return attachPoints[3];
            case AttachPointType.Feet:  return attachPoints[4];
            default: return null;
        }
    }

    void SnapTo(Transform point)
    {
        isSnapped = true;
        transform.SetParent(point);
        
        // Reset local position so it goes EXACTLY to the attach point
        transform.localPosition = Vector3.zero + visualOffset; 
        transform.localRotation = Quaternion.identity;

        Rigidbody rb = GetComponent<Rigidbody>();
        if (rb != null) rb.isKinematic = true;

        Debug.Log("<color=green>SUCCESS:</color> Snapped to " + point.name);
    }

    public void Unsnap()
    {
        isSnapped = false;
        transform.SetParent(null);
        Rigidbody rb = GetComponent<Rigidbody>();
        if (rb != null) rb.isKinematic = false;
    }
}