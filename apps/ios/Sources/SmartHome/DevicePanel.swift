import SwiftUI

/// Kontroller cihazın `capabilities` listesinden çizilir. Sunucu yetkiyi ve sınırları yine doğrular.
struct DevicePanel: View {
    @EnvironmentObject var session: Session
    let placeId: String
    let device: Device
    @State private var temperature: Double = 22
    @State private var percentage: Double = 50
    @State private var error: String?

    private var kind: DeviceKind? { DeviceKind(rawValue: device.kind) }
    private func has(_ c: String) -> Bool { device.capabilities.contains(c) }

    var body: some View {
        NavigationStack {
            Form {
                if has("turn_on") || has("turn_off") {
                    Section("Güç") {
                        HStack {
                            if has("turn_on") { Button("Aç") { run("turn_on") } }
                            if has("turn_off") { Button("Kapat") { run("turn_off") } }
                        }
                        .buttonStyle(.bordered)
                    }
                }
                if has("set_temperature"), let range = kind?.temperatureRange {
                    Section("Sıcaklık: \(Int(temperature)) °C") {
                        Slider(value: $temperature, in: range, step: 1)
                        Button("Uygula") { run("set_temperature", ["temperature": .number(temperature)]) }
                    }
                }
                if has("set_hvac_mode") {
                    Section("Mod") {
                        ForEach(modes, id: \.self) { mode in
                            Button(mode) { run("set_hvac_mode", ["hvac_mode": .string(mode)]) }
                        }
                    }
                }
                if has("set_percentage") {
                    Section("Hız: %\(Int(percentage))") {
                        Slider(value: $percentage, in: 0...100, step: 5)
                        Button("Uygula") { run("set_percentage", ["percentage": .number(percentage.rounded())]) }
                    }
                }
                if has("start") || has("return_to_base") {
                    Section("Robot") {
                        if has("start") { Button("Başlat") { run("start") } }
                        if has("pause") { Button("Duraklat") { run("pause") } }
                        if has("return_to_base") { Button("Şarj istasyonuna dön") { run("return_to_base") } }
                    }
                }
                if has("volume_up") {
                    Section("Ses") {
                        Button("Sesi aç") { run("volume_up") }
                        Button("Sesi kıs") { run("volume_down") }
                    }
                }
                if let error { Text(error).foregroundStyle(.red) }
            }
            .navigationTitle(device.name)
            .navigationBarTitleDisplayMode(.inline)
        }
    }

    /// Sunucudaki katalogla aynı mod adları (heater için off/heat/auto).
    private var modes: [String] {
        kind == .heater ? ["off", "heat", "auto"] : ["off", "cool", "heat", "dry", "fan_only", "auto"]
    }

    private func run(_ command: String, _ params: [String: JSONValue] = [:]) {
        Task {
            do {
                try await session.client().send(placeId: placeId, deviceId: device.id, command: command, params: params)
                error = nil
            } catch ApiError.server(let code) where code == "no_connection" {
                error = "Bu mekânın cihaz bağlantısı henüz kurulmadı."
            } catch {
                self.error = session.handle(error)
            }
        }
    }
}
