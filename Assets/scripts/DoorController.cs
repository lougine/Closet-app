using UnityEngine;


public class DoorController : MonoBehaviour
{
    public float openAngle = 110f;
    public float speed = 3f;
    private bool isOpen = false;
    private Quaternion closedRot, openRot;

    void Start()
    {
        var interactable = GetComponent<UnityEngine.XR.Interaction.Toolkit.Interactables.XRSimpleInteractable>();
        if (interactable != null)
            interactable.selectEntered.AddListener(_ => ToggleDoor());

        closedRot = transform.localRotation;
        openRot = Quaternion.Euler(
            transform.localEulerAngles + new Vector3(0, openAngle, 0));
    }

    void ToggleDoor() => isOpen = !isOpen;

    void Update()
    {
        transform.localRotation = Quaternion.Lerp(
            transform.localRotation,
            isOpen ? openRot : closedRot,
            Time.deltaTime * speed);
    }
}