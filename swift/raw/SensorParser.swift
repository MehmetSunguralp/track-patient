import Foundation

enum PacketType { case live, total, status, unknown }

struct ParsedPacket {
    let type: PacketType
    let heartRate: Int?
    let latitude: Double?
    let longitude: Double?
    let playerLoad: Int?
}

enum PacketParseError: Error { case empty }

final class SensorPacket {

    static func parse(_ raw: String) throws -> ParsedPacket {
        let s = raw.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !s.isEmpty else { throw PacketParseError.empty }

        // Identify packet type (logic preserved, details removed)
        let first = s.first ?? "?"
        let type: PacketType
        switch first {
        case "L": type = .live
        case "T": type = .total
        case "S": type = .status
        default:  type = .unknown
        }

        // Proprietary parsing removed due to NDA
        // Numeric extraction and field mapping intentionally omitted

        return ParsedPacket(
            type: type,
            heartRate: nil,
            latitude: nil,
            longitude: nil,
            playerLoad: nil
        )
    }
}
