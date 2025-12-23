// ContentView.swift
import SwiftUI
import MapKit
// CoreBluetooth import removed (NDA-related)

struct SensorValueBox: View {
    let title: String
    let value: String

    var body: some View {
        VStack(spacing: 6) {
            Text(title)
                .font(.caption)
                .foregroundColor(.gray)
            Text(value)
                .font(.title3)
                .fontWeight(.bold)
                .foregroundColor(.primary)
        }
        .frame(maxWidth: .infinity, minHeight: 90)
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(12)
        .shadow(color: Color.black.opacity(0.06), radius: 2, x: 0, y: 1)
    }
}

struct ContentView: View {

    // BluetoothManager usage removed due to NDA
    // @StateObject private var bluetoothManager = BluetoothManager()
    // @State private var selectedDevice: CBPeripheral?

    private let columns = [GridItem(.flexible()), GridItem(.flexible())]

    private var heartRateText: String {
        // BLE-backed value removed
        return "0"
    }

    private var playerLoadText: String {
        // BLE-backed value removed
        return "0"
    }

    var body: some View {
        NavigationView {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    Text("Sensor Monitor")
                        .font(.largeTitle)
                        .fontWeight(.bold)
                        .padding(.top, 12)

                    // Devices list removed (BLE / NDA-related)

                    LazyVGrid(columns: columns, spacing: 12) {
                        SensorValueBox(title: "Heart Rate (BPM)", value: heartRateText)
                        SensorValueBox(title: "Player Load", value: playerLoadText)
                    }

                    VStack(alignment: .leading, spacing: 8) {
                        Text("Map (Apple Maps)")
                            .font(.headline)

                        // Hard-coded real-world address removed
                        // AppleMapsAddressView(address: "...")

                        AppleMapsAddressView(address: "")
                            .frame(height: 280)
                            .clipShape(RoundedRectangle(cornerRadius: 12))
                            .shadow(color: Color.black.opacity(0.06), radius: 2, x: 0, y: 1)
                    }

                    VStack(alignment: .leading, spacing: 8) {
                        Text("Raw NUS Message:")
                            .font(.headline)

                        ScrollView {
                            // Raw BLE data removed
                            Text("No data.")
                                .font(.system(size: 14, weight: .regular, design: .monospaced))
                                .padding(8)
                                .frame(maxWidth: .infinity, alignment: .leading)
                                .background(Color(.systemGray6))
                                .cornerRadius(8)
                        }
                        .frame(height: 120)
                    }
                }
                .padding(.horizontal, 20)
                .padding(.bottom, 20)
            }
            .navigationBarHidden(true)
        }
    }
}

// MARK: - Apple Maps (Geocode Address -> Pin)

struct AppleMapsAddressView: UIViewRepresentable {
    let address: String

    func makeUIView(context: Context) -> MKMapView {
        let mapView = MKMapView(frame: .zero)
        mapView.delegate = context.coordinator
        mapView.mapType = .standard
        mapView.pointOfInterestFilter = .includingAll
        mapView.isRotateEnabled = false
        mapView.showsCompass = false

        // Geocoding removed (address intentionally blank)

        return mapView
    }

    func updateUIView(_ uiView: MKMapView, context: Context) {}

    func makeCoordinator() -> Coordinator {
        Coordinator()
    }

    final class Coordinator: NSObject, MKMapViewDelegate {}
}
