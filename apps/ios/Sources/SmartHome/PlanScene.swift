import SceneKit
import UIKit

/// Tarama verisinden 3D sahne kurar. Koordinatlar metre, Y yukarı. Duvar 2B noktaları (x, z).
enum PlanScene {
    static let deviceNodePrefix = "device:"

    static func build(scan: Scan, devices: [Device]) -> SCNScene {
        let scene = SCNScene()
        let root = scene.rootNode
        let elevation = Dictionary(uniqueKeysWithValues: scan.levels.map { ($0.id, $0.elevation) })

        let wallMaterial = SCNMaterial()
        wallMaterial.diffuse.contents = UIColor(white: 0.92, alpha: 1)
        let floorMaterial = SCNMaterial()
        floorMaterial.diffuse.contents = UIColor(white: 0.55, alpha: 1)

        var bounds = (minX: Double.infinity, maxX: -Double.infinity, minZ: Double.infinity, maxZ: -Double.infinity)

        for room in scan.rooms {
            let y0 = elevation[room.levelId] ?? 0
            for wall in room.walls where wall.start.count == 2 && wall.end.count == 2 {
                let dx = wall.end[0] - wall.start[0]
                let dz = wall.end[1] - wall.start[1]
                let length = (dx * dx + dz * dz).squareRoot()
                guard length > 0.01 else { continue }
                let box = SCNBox(width: length, height: wall.height, length: wall.thickness, chamferRadius: 0)
                box.materials = [wallMaterial]
                let node = SCNNode(geometry: box)
                node.position = SCNVector3(
                    Float((wall.start[0] + wall.end[0]) / 2),
                    Float(y0 + wall.height / 2),
                    Float((wall.start[1] + wall.end[1]) / 2))
                node.eulerAngles.y = Float(-atan2(dz, dx))
                root.addChildNode(node)
                for p in [wall.start, wall.end] {
                    bounds.minX = min(bounds.minX, p[0]); bounds.maxX = max(bounds.maxX, p[0])
                    bounds.minZ = min(bounds.minZ, p[1]); bounds.maxZ = max(bounds.maxZ, p[1])
                }
            }
        }

        if bounds.minX.isFinite {
            let w = bounds.maxX - bounds.minX + 2, d = bounds.maxZ - bounds.minZ + 2
            let floor = SCNBox(width: w, height: 0.05, length: d, chamferRadius: 0)
            floor.materials = [floorMaterial]
            let node = SCNNode(geometry: floor)
            node.position = SCNVector3(Float((bounds.minX + bounds.maxX) / 2), -0.025, Float((bounds.minZ + bounds.maxZ) / 2))
            root.addChildNode(node)
        }

        for room in scan.rooms {
            let y0 = elevation[room.levelId] ?? 0
            for object in room.objects where object.position.count == 3 && object.dimensions.count == 3 {
                let box = SCNBox(width: object.dimensions[0], height: object.dimensions[1], length: object.dimensions[2], chamferRadius: 0.02)
                let m = SCNMaterial()
                m.diffuse.contents = UIColor(red: 0.62, green: 0.68, blue: 0.78, alpha: 0.85)
                box.materials = [m]
                let node = SCNNode(geometry: box)
                node.position = SCNVector3(Float(object.position[0]), Float(y0 + object.position[1]), Float(object.position[2]))
                node.eulerAngles.y = Float(object.rotationY)
                root.addChildNode(node)
            }
        }

        for device in devices {
            guard let p = device.position, p.count == 3 else { continue }
            let sphere = SCNSphere(radius: 0.14)
            let m = SCNMaterial()
            m.diffuse.contents = UIColor.systemOrange
            m.emission.contents = UIColor.systemOrange.withAlphaComponent(0.5)
            sphere.materials = [m]
            let node = SCNNode(geometry: sphere)
            node.name = deviceNodePrefix + device.id
            node.position = SCNVector3(Float(p[0]), Float(p[1]), Float(p[2]))
            root.addChildNode(node)
        }

        let light = SCNNode()
        light.light = SCNLight()
        light.light?.type = .omni
        light.position = SCNVector3(0, 8, 0)
        root.addChildNode(light)
        let ambient = SCNNode()
        ambient.light = SCNLight()
        ambient.light?.type = .ambient
        ambient.light?.intensity = 500
        root.addChildNode(ambient)
        return scene
    }

    static func deviceId(fromNodeName name: String?) -> String? {
        guard let name, name.hasPrefix(deviceNodePrefix) else { return nil }
        return String(name.dropFirst(deviceNodePrefix.count))
    }
}
