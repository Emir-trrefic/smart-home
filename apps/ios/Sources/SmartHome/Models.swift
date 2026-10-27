import Foundation

/// Sunucu sözleşmesi: packages/domain ve docs/data-model.md ile birebir.
struct Place: Codable, Identifiable, Hashable {
    let id: String
    let name: String
    let kind: String
    let role: String

    var isOwner: Bool { role == "owner" }
}

struct Device: Codable, Identifiable, Hashable {
    let id: String
    let name: String
    let kind: String
    let roomId: String?
    let position: [Double]?
    let capabilities: [String]
}

struct LoginResponse: Codable {
    let accessToken: String
    let expiresIn: Int
}

struct Invite: Codable {
    let code: String
}

struct Scan: Codable {
    let version: Int
    let source: String
    let capturedAt: String
    let levels: [Level]
    let rooms: [Room]

    struct Level: Codable { let id: String; let name: String; let elevation: Double }

    struct Room: Codable {
        let id: String
        let name: String
        let levelId: String
        let height: Double
        let walls: [Wall]
        let doors: [Opening]
        let windows: [Opening]
        let objects: [Object]
    }

    struct Wall: Codable {
        let id: String
        let start: [Double]
        let end: [Double]
        let thickness: Double
        let height: Double
    }

    struct Opening: Codable {
        let id: String
        let wallId: String
        let offset: Double
        let width: Double
        let height: Double
        let sill: Double?
    }

    struct Object: Codable {
        let id: String
        let category: String
        let position: [Double]
        let dimensions: [Double]
        let rotationY: Double
        let confidence: String
    }
}

/// Cihaz türü için gösterim bilgisi. Komut adları sunucu kataloğuyla aynıdır.
enum DeviceKind: String {
    case light, `switch`, air_conditioner, heater, fan, air_purifier, tv, robot_vacuum

    var title: String {
        switch self {
        case .light: return "Işık"
        case .switch: return "Priz"
        case .air_conditioner: return "Klima"
        case .heater: return "Kalorifer"
        case .fan: return "Vantilatör"
        case .air_purifier: return "Hava temizleyici"
        case .tv: return "TV"
        case .robot_vacuum: return "Robot süpürge"
        }
    }

    var symbol: String {
        switch self {
        case .light: return "lightbulb"
        case .switch: return "powerplug"
        case .air_conditioner: return "snowflake"
        case .heater: return "heater.vertical"
        case .fan: return "fan"
        case .air_purifier: return "wind"
        case .tv: return "tv"
        case .robot_vacuum: return "fan.badge.automatic"
        }
    }

    /// Sunucudaki katalogla aynı sınırlar. Sunucu yine de doğrular, burası yalnızca arayüz için.
    var temperatureRange: ClosedRange<Double>? {
        switch self {
        case .air_conditioner: return 16...30
        case .heater: return 5...28
        default: return nil
        }
    }
}
