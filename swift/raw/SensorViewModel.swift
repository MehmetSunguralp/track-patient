import Foundation
import Combine

struct SensorFacts {
    var heartRate: Int? = nil
    var latitude: Double? = nil
    var longitude: Double? = nil
    var playerLoad: Int? = nil   // renamed from totalAccel
}

final class SensorViewModel: ObservableObject {
    @Published var facts = SensorFacts()
    @Published var lastPacketSummary: String = ""
}
