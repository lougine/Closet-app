using UnityEngine;
using UnityEngine.InputSystem;

public class SimpleCameraController : MonoBehaviour
{
    public float moveSpeed = 3f;
    public float lookSpeed = 2f;
    private float rotX = 0f;

    void Update()
    {
        // Look around with mouse
        if (Mouse.current.rightButton.isPressed)
        {
            Vector2 mouseDelta = Mouse.current.delta.ReadValue();
            rotX -= mouseDelta.y * lookSpeed * 0.1f;
            rotX = Mathf.Clamp(rotX, -90f, 90f);
            float rotY = mouseDelta.x * lookSpeed * 0.1f;
            transform.Rotate(0, rotY, 0);
            Camera.main.transform.localRotation = Quaternion.Euler(rotX, 0, 0);
        }

        // Move with WASD
        Vector3 move = Vector3.zero;
        if (Keyboard.current.wKey.isPressed) move += transform.forward;
        if (Keyboard.current.sKey.isPressed) move -= transform.forward;
        if (Keyboard.current.aKey.isPressed) move -= transform.right;
        if (Keyboard.current.dKey.isPressed) move += transform.right;
        transform.position += move * moveSpeed * Time.deltaTime;
    }
}