using UnityEngine;
using UnityEngine.XR.Interaction.Toolkit;

public class GrabDoor : MonoBehaviour
{
    private UnityEngine.XR.Interaction.Toolkit.Interactables.XRGrabInteractable grabInteractable;
    private bool isOpen = false;
    private Vector3 closedPosition;
    private Vector3 openPosition;

    void Start()
    {
        grabInteractable = GetComponent<UnityEngine.XR.Interaction.Toolkit.Interactables.XRGrabInteractable>();
        
        // Store positions
        closedPosition = transform.position;
        openPosition = closedPosition + new Vector3(-2, 0, 0); // Slides left
        
        // Subscribe to grab events
        grabInteractable.selectEntered.AddListener(OnGrab);
    }

    void OnGrab(SelectEnterEventArgs args)
    {
        // Toggle door when grabbed
        if (isOpen)
        {
            transform.position = closedPosition;
            isOpen = false;
        }
        else
        {
            transform.position = openPosition;
            isOpen = true;
        }
    }
}
