using UnityEngine;
using UnityEngine.InputSystem;

public class SimpleGrab : MonoBehaviour
{
    private GameObject grabbed;
    private float grabDistance = 20f;
    private Camera cam;

    void Start()
    {
        cam = GetComponentInChildren<Camera>();
        if (cam == null)
            cam = Camera.main;
        Debug.Log("Camera found: " + cam);
    }

    void Update()
    {
        if (cam == null) return;

        if (Mouse.current.leftButton.wasPressedThisFrame)
        {
            if (grabbed != null)
            {
                Release();
                return;
            }

            Ray ray = cam.ScreenPointToRay(
                Mouse.current.position.ReadValue());
            RaycastHit hit;

            Debug.DrawRay(ray.origin, ray.direction * 20f, Color.red, 2f);

            if (Physics.Raycast(ray, out hit, grabDistance))
            {
                // Always get the ROOT parent object
                GameObject target = hit.collider.transform.root.gameObject;

                Debug.Log("Hit: " + hit.collider.gameObject.name
                    + " Root: " + target.name
                    + " Root Tag: " + target.tag);

                if (target.CompareTag("Grabbable") ||
                    target.CompareTag("grabbable") ||
                    hit.collider.gameObject.CompareTag("Grabbable") ||
                    hit.collider.gameObject.CompareTag("grabbable"))
                {
                    grabbed = target;

                    // Find rigidbody on root or any child
                    Rigidbody rb = grabbed.GetComponent<Rigidbody>();
                    if (rb == null)
                        rb = grabbed.GetComponentInChildren<Rigidbody>();
                    if (rb != null)
                        rb.isKinematic = true;

                    // Unsnap if snapped
                    SnapToAttachPoint snap =
                        grabbed.GetComponent<SnapToAttachPoint>();
                    if (snap != null) snap.Unsnap();

                    Debug.Log("Grabbed: " + grabbed.name);
                }
            }
            else
            {
                Debug.Log("Raycast hit nothing!");
            }
        }

        if (grabbed != null)
        {
            Vector3 targetPos = cam.transform.position +
                               cam.transform.forward * 2f;
            grabbed.transform.position = Vector3.Lerp(
                grabbed.transform.position, targetPos,
                Time.deltaTime * 10f);
        }
    }

    void Release()
    {
        if (grabbed != null)
        {
            Rigidbody rb = grabbed.GetComponent<Rigidbody>();
            if (rb == null)
                rb = grabbed.GetComponentInChildren<Rigidbody>();
            if (rb != null)
                rb.isKinematic = false;

            grabbed = null;
            Debug.Log("Released!");
        }
    }
}