import Foundation
import CoreBluetooth
import Combine   // ← REQUIRED for ObservableObject

class PeripheralManager: NSObject, ObservableObject, CBPeripheralManagerDelegate {

    private var peripheralManager: CBPeripheralManager!

    override init() {
        super.init()
        peripheralManager = CBPeripheralManager(delegate: self, queue: nil)
    }

    func startAdvertisingFor10Seconds() {
        let advertisementData: [String: Any] = [
            CBAdvertisementDataManufacturerDataKey: "$".data(using: .utf8)!,
            CBAdvertisementDataLocalNameKey: "EptsNusAll"
        ]

        peripheralManager.startAdvertising(advertisementData)
        print("Started advertising for 10 seconds")

        DispatchQueue.main.asyncAfter(deadline: .now() + 10) {
            self.peripheralManager.stopAdvertising()
            print("Stopped advertising after 10 seconds")
        }
    }

    func peripheralManagerDidUpdateState(_ peripheral: CBPeripheralManager) {
        if peripheral.state != .poweredOn {
            print("Peripheral Manager is not powered on")
        }
    }
}
