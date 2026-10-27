import SceneKit
import SwiftUI

struct PlaceView: View {
    @EnvironmentObject var session: Session
    let place: Place
    @State private var scene: SCNScene?
    @State private var devices: [Device] = []
    @State private var selected: Device?
    @State private var error: String?
    @State private var noPlan = false

    var body: some View {
        VStack(spacing: 0) {
            if let scene {
                SceneContainer(scene: scene) { id in
                    selected = devices.first { $0.id == id }
                }
            } else if noPlan {
                ContentUnavailableView("Plan yok", systemImage: "cube.transparent",
                                       description: Text("Bu mekân henüz taranmadı. Cihazları listeden yönetebilirsin."))
            } else {
                ProgressView().frame(maxHeight: .infinity)
            }
            if let error { Text(error).foregroundStyle(.red).padding(.horizontal) }
            deviceList
        }
        .navigationTitle(place.name)
        .navigationBarTitleDisplayMode(.inline)
        .sheet(item: $selected) { device in
            DevicePanel(placeId: place.id, device: device).presentationDetents([.medium])
        }
        .task { await load() }
    }

    private var deviceList: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack {
                ForEach(devices) { device in
                    Button {
                        selected = device
                    } label: {
                        Label(device.name, systemImage: DeviceKind(rawValue: device.kind)?.symbol ?? "questionmark")
                    }
                    .buttonStyle(.bordered)
                }
            }
            .padding()
        }
    }

    private func load() async {
        do {
            let client = try session.client()
            devices = try await client.devices(placeId: place.id)
            do {
                let scan = try await client.latestScan(placeId: place.id)
                scene = PlanScene.build(scan: scan, devices: devices)
            } catch ApiError.notFound {
                noPlan = true
            }
            error = nil
        } catch {
            self.error = session.handle(error)
        }
    }
}
