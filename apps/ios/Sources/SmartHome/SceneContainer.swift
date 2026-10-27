import SceneKit
import SwiftUI

/// SceneKit görünümü: parmakla döndürme/yakınlaştırma hazır gelir, cihaz küresine dokunma seçim üretir.
struct SceneContainer: UIViewRepresentable {
    let scene: SCNScene
    let onSelectDevice: (String) -> Void

    func makeUIView(context: Context) -> SCNView {
        let view = SCNView()
        view.scene = scene
        view.allowsCameraControl = true
        view.autoenablesDefaultLighting = false
        view.backgroundColor = .systemBackground
        view.antialiasingMode = .multisampling4X
        let tap = UITapGestureRecognizer(target: context.coordinator, action: #selector(Coordinator.tapped(_:)))
        view.addGestureRecognizer(tap)
        return view
    }

    func updateUIView(_ view: SCNView, context: Context) {
        if view.scene !== scene { view.scene = scene }
        context.coordinator.onSelect = onSelectDevice
    }

    func makeCoordinator() -> Coordinator { Coordinator(onSelect: onSelectDevice) }

    final class Coordinator: NSObject {
        var onSelect: (String) -> Void
        init(onSelect: @escaping (String) -> Void) { self.onSelect = onSelect }

        @objc func tapped(_ gesture: UITapGestureRecognizer) {
            guard let view = gesture.view as? SCNView else { return }
            let hits = view.hitTest(gesture.location(in: view), options: nil)
            for hit in hits {
                if let id = PlanScene.deviceId(fromNodeName: hit.node.name) {
                    onSelect(id)
                    return
                }
            }
        }
    }
}
