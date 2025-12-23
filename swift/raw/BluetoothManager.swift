// BluetoothManager.swift
import Foundation
import Combine

/// A mock Bluetooth manager for SwiftUI, ObservableObject compatible.
/// This simulates BLE behavior without CoreBluetooth for testing.
class BluetoothManager: NSObject, ObservableObject {

    // MARK: - Published state for SwiftUI
    @Published var devices: [String] = []           // Replace Any with device identifier if needed
    @Published var connectedDevice: String?        // Currently connected device identifier
    @Published var receivedData: String = ""       // Last received data
    @Published var lastRawPacket: String = ""      // Last raw packet received

    // UI summaries
    @Published var lastPacketSummary: String = ""
    @Published var lastErrorCode: String = ""

    // Facts for UI
    @Published var lastHeartRate: Int? = nil
    @Published var lastLatitude: Double? = nil
    @Published var lastLongitude: Double? = nil
    @Published var lastPlayerLoad: Int? = nil

    // MARK: - Initialization
    override init() {
        super.init()
        // Normally, BLE central manager setup would go here
    }

    // MARK: - Scanning / Connection Simulation
    func startContinuousScanning() {
        // Simulate device discovery
        DispatchQueue.main.asyncAfter(deadline: .now() + 1) {
            self.devices = ["Device-001", "Device-002"]
        }
    }

    func scanForNUSDevices() {
        devices.removeAll()
        DispatchQueue.main.asyncAfter(deadline: .now() + 1) {
            self.devices = ["Device-001", "Device-002"]
        }
    }

    func connect(to device: String) {
        connectedDevice = device
        appendReceivedMessage("Connected to \(device)")
    }

    func disconnect(from device: String) {
        if connectedDevice == device {
            connectedDevice = nil
            appendReceivedMessage("Disconnected from \(device)")
        }
    }

    func isConnected(to device: String) -> Bool {
        return connectedDevice == device
    }

    // MARK: - RX Simulation
    func didReceiveData(_ data: String) {
        receivedData = data
        appendReceivedMessage("Received: \(data)")
        parseAndSummarize(data)
    }

    // MARK: - TX Simulation
    func sendData(_ data: String, to device: String) {
        guard connectedDevice == device else {
            appendReceivedMessage("Error: Not connected to \(device)")
            return
        }

        // Simulate sending
        appendReceivedMessage("Sent: \(data) to \(device)")

        // For testing, simulate device reply after a short delay
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) {
            self.didReceiveData("Echo: \(data)")
        }
    }

    // MARK: - Packet Parsing
    private func parseAndSummarize(_ raw: String) {
        // Example: parse heart rate or location from string
        if raw.contains("HR:") {
            if let hrString = raw.split(separator: ":").last,
               let hr = Int(hrString) {
                lastHeartRate = hr
            }
        }
        // Add other parsers here as needed
        lastPacketSummary = raw
    }

    // MARK: - Helpers
    private func appendReceivedMessage(_ message: String) {
        // Optionally, store lastRawPacket
        lastRawPacket = message
        // You can use Combine publishers in views
        receivedData = message
        print(message)
    }

    // MARK: - Test Helpers
    func ingestHexPacketLine(_ hex: String) {
        didReceiveData("Hex: \(hex)")
    }

    func ingestAsciiPacketLine(_ line: String) {
        didReceiveData("ASCII: \(line)")
    }
}
