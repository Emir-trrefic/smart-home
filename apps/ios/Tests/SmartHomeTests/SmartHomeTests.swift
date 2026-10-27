import XCTest
import SceneKit
@testable import SmartHome

final class SmartHomeTests: XCTestCase {
    // Sunucu testlerindeki geçerli tarama örneğiyle aynı.
    static let scanJSON = """
    {"version":1,"source":"roomplan","capturedAt":"2026-10-19T12:00:00Z",
     "levels":[{"id":"l0","name":"Zemin kat","elevation":0}],
     "rooms":[{"id":"r1","name":"Salon","levelId":"l0","height":2.6,
       "walls":[{"id":"w1","start":[0,0],"end":[4,0],"thickness":0.12,"height":2.6}],
       "doors":[{"id":"d1","wallId":"w1","offset":1,"width":0.9,"height":2}],
       "windows":[{"id":"n1","wallId":"w1","offset":2.5,"width":1.2,"height":1.1,"sill":0.9}],
       "objects":[{"id":"o1","category":"sofa","position":[1.5,0.4,2],"dimensions":[2,0.8,0.9],"rotationY":0,"confidence":"high"}]}]}
    """

    func testScanDecodes() throws {
        let scan = try JSONDecoder().decode(Scan.self, from: Data(Self.scanJSON.utf8))
        XCTAssertEqual(scan.rooms.count, 1)
        XCTAssertEqual(scan.rooms[0].windows[0].sill, 0.9)
        XCTAssertNil(scan.rooms[0].doors[0].sill)
    }

    func testSceneHasWallObjectAndTappableDevice() throws {
        let scan = try JSONDecoder().decode(Scan.self, from: Data(Self.scanJSON.utf8))
        let device = Device(id: "lamba", name: "Lamba", kind: "light", roomId: "r1", position: [1, 2, 1], capabilities: ["turn_on"])
        let scene = PlanScene.build(scan: scan, devices: [device])
        let names = scene.rootNode.childNodes.compactMap(\.name)
        XCTAssertEqual(names, ["device:lamba"])
        XCTAssertEqual(PlanScene.deviceId(fromNodeName: names[0]), "lamba")
        XCTAssertNil(PlanScene.deviceId(fromNodeName: "wall"))
        XCTAssertGreaterThanOrEqual(scene.rootNode.childNodes.count, 5) // duvar, zemin, eşya, cihaz, ışıklar
    }

    func testInsecureServerRejected() {
        XCTAssertThrowsError(try ApiClient(baseURL: URL(string: "http://example.com")!))
        XCTAssertNoThrow(try ApiClient(baseURL: URL(string: "https://example.com")!))
        XCTAssertNoThrow(try ApiClient(baseURL: URL(string: "http://127.0.0.1:3000")!))
        XCTAssertNoThrow(try ApiClient(baseURL: URL(string: "http://evim.local:3000")!))
        XCTAssertThrowsError(try ApiClient(baseURL: URL(string: "http://localhost.evil.com")!))
    }

    func testTemperatureRangesMatchServerCatalog() {
        XCTAssertEqual(DeviceKind.heater.temperatureRange, 5...28)
        XCTAssertEqual(DeviceKind.air_conditioner.temperatureRange, 16...30)
        XCTAssertNil(DeviceKind.light.temperatureRange)
    }
}
