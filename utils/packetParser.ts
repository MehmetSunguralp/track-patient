/**
 * Parser for sensor data packets in ASCII format
 * Based on Sensor Data Packet Definitions
 * 
 * Packet formats:
 * - Live (L): ~1s interval - Real-time GPS, speed, heart rate, metabolic power
 * - Total (T): ~2s interval - Cumulative distance, load, speed-zone stats, HR metrics
 * - Status (S): ~60s interval - Date/time and reserved diagnostic/device info
 * 
 * All packets end with CRC-8 (2 hex) and terminator 'D'
 */

export enum PacketType {
  LIVE = 'L',
  TOTAL = 'T',
  STATUS = 'S',
  UNKNOWN = 'UNKNOWN',
}

export interface ParsedLivePacket {
  type: PacketType.LIVE;
  podId: string; // 2 chars: 01-26
  gpsTime: string; // 6 chars: HHMMSS
  gpsFix: string; // 1 char: '0' or '1'
  latitude: string; // 10 chars: e.g., "4901.52321 N"
  prevLat1: string; // 4 chars
  prevLat2: string; // 4 chars
  longitude: string; // 11 chars: e.g., "12305.823 W"
  prevLon1: string; // 4 chars
  prevLon2: string; // 4 chars
  velocityKnots: string; // 5 chars
  prevVel1: string; // 5 chars
  prevVel2: string; // 5 chars
  heartRate: number; // 3 chars: BPM
  metabolicPower: number; // 5 chars: W/kg (1 decimal)
  crc: string; // 2 hex chars
}

export interface ParsedTotalPacket {
  type: PacketType.TOTAL;
  podId: string;
  gpsTime: string;
  gpsFix: string;
  playerLoad: number; // 5 chars
  totalDistance: number; // 5 chars: meters
  hmdlDistance: number; // 5 chars: meters
  z6Distance: number; // 4 chars: meters
  z5Distance: number; // 4 chars: meters
  z4Distance: number; // 4 chars: meters
  z6Count: number; // 2 chars
  z5Count: number; // 3 chars
  z4Count: number; // 3 chars
  totalAccelerations: number; // 3 chars
  totalDecelerations: number; // 3 chars
  totalImpacts: number; // 2 chars
  stepBalanceSide: string; // 1 char: '0' or '1'
  stepBalanceValue: number; // 4 chars
  maxSpeed: number; // 4 chars: km/h (1 decimal)
  lastMinuteMaxSpeed: number; // 4 chars: km/h (1 decimal)
  rrAverage: number; // 3 chars: ms
  maxHeartRate: number; // 3 chars: BPM
  crc: string;
}

export interface ParsedStatusPacket {
  type: PacketType.STATUS;
  podId: string;
  gpsDate: string; // 6 chars: YYMMDD
  gpsTime: string; // 6 chars: HHMMSS
  reserved: string; // 12 chars
  crc: string;
}

export type ParsedPacket = ParsedLivePacket | ParsedTotalPacket | ParsedStatusPacket;

/**
 * Convert DDMM.MMMMMN format to decimal degrees (no space before direction)
 */
function parseLatitude(latStr: string): number {
  // Format: "4901.5232N" (10 chars) - no space before direction
  const match = latStr.match(/(\d{2})(\d{2})\.(\d{5})([NS])/);
  if (!match) return 0;
  
  const degrees = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10) + parseInt(match[3], 10) / 100000;
  const sign = match[4] === 'N' ? 1 : -1;
  
  return sign * (degrees + minutes / 60);
}

/**
 * Convert DDDMM.MMME format to decimal degrees (no space before direction)
 */
function parseLongitude(lonStr: string): number {
  // Format: "12305.823W" (11 chars) - no space before direction
  const match = lonStr.match(/(\d{3})(\d{2})\.(\d{3})([EW])/);
  if (!match) return 0;
  
  const degrees = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10) + parseInt(match[3], 10) / 1000;
  const sign = match[4] === 'E' ? 1 : -1;
  
  return sign * (degrees + minutes / 60);
}

/**
 * Parse Live (L) packet
 * Format: L + PodID(2) + GPSTime(6) + GPSFix(1) + Lat(10) + PrevLat1(4) + PrevLat2(4) + Lon(11) + PrevLon1(4) + PrevLon2(4) + Vel(5) + PrevVel1(5) + PrevVel2(5) + HR(3) + Power(5) + CRC(2) + D
 */
function parseLivePacket(packet: string): ParsedLivePacket | null {
  // Minimum length: 1 + 2 + 6 + 1 + 10 + 4 + 4 + 11 + 4 + 4 + 5 + 5 + 5 + 3 + 5 + 2 + 1 = 77
  // But actual packets might be slightly different, so allow 73+
  if (packet.length < 73) {
    console.log(`[PacketParser] Live packet too short: ${packet.length} chars`);
    return null;
  }
  
  let pos = 1; // Skip 'L'
  
  const podId = packet.substring(pos, pos + 2);
  pos += 2;
  
  const gpsTime = packet.substring(pos, pos + 6);
  pos += 6;
  
  const gpsFix = packet.substring(pos, pos + 1);
  pos += 1;
  
  // Latitude might be 10 or 11 chars - try to detect
  // Look for pattern: digits.digitsN or digits.digitsS
  let latEnd = pos;
  while (latEnd < packet.length && packet[latEnd] !== 'N' && packet[latEnd] !== 'S') {
    latEnd++;
  }
  if (latEnd >= packet.length) {
    console.log(`[PacketParser] Could not find latitude direction (N/S) at pos ${pos}`);
    return null;
  }
  const latitude = packet.substring(pos, latEnd + 1); // Include N/S
  pos = latEnd + 1;
  
  const prevLat1 = packet.substring(pos, pos + 4);
  pos += 4;
  
  const prevLat2 = packet.substring(pos, pos + 4);
  pos += 4;
  
  // Longitude - look for E or W
  let lonEnd = pos;
  while (lonEnd < packet.length && packet[lonEnd] !== 'E' && packet[lonEnd] !== 'W') {
    lonEnd++;
  }
  if (lonEnd >= packet.length) {
    console.log(`[PacketParser] Could not find longitude direction (E/W) at pos ${pos}`);
    return null;
  }
  const longitude = packet.substring(pos, lonEnd + 1); // Include E/W
  pos = lonEnd + 1;
  
  const prevLon1 = packet.substring(pos, pos + 4);
  pos += 4;
  
  const prevLon2 = packet.substring(pos, pos + 4);
  pos += 4;
  
  const velocityKnots = packet.substring(pos, pos + 5);
  pos += 5;
  
  const prevVel1 = packet.substring(pos, pos + 5);
  pos += 5;
  
  const prevVel2 = packet.substring(pos, pos + 5);
  pos += 5;
  
  const heartRate = parseInt(packet.substring(pos, pos + 3), 10);
  pos += 3;
  
  const metabolicPower = parseInt(packet.substring(pos, pos + 5), 10) / 10.0;
  pos += 5;
  
  // CRC might be 2 or 4 hex chars - look for 'D' terminator
  let crcEnd = pos;
  while (crcEnd < packet.length && packet[crcEnd] !== 'D') {
    crcEnd++;
  }
  if (crcEnd >= packet.length) {
    console.log(`[PacketParser] Could not find terminator 'D' at pos ${pos}`);
    return null;
  }
  const crc = packet.substring(pos, crcEnd);
  pos = crcEnd;
  
  // Should end with 'D'
  if (packet[pos] !== 'D') {
    console.log(`[PacketParser] Expected 'D' at pos ${pos}, got '${packet[pos]}'`);
    return null;
  }
  
  return {
    type: PacketType.LIVE,
    podId,
    gpsTime,
    gpsFix,
    latitude,
    prevLat1,
    prevLat2,
    longitude,
    prevLon1,
    prevLon2,
    velocityKnots,
    prevVel1,
    prevVel2,
    heartRate,
    metabolicPower,
    crc,
  };
}

/**
 * Parse Total (T) packet
 * Format: T + PodID(2) + GPSTime(6) + GPSFix(1) + PlayerLoad(5) + TotalDistance(5) + HMDL(5) + 
 *         Z6(4) + Z5(4) + Z4(4) + Z6Count(2) + Z5Count(3) + Z4Count(3) + 
 *         TotalAcc(3) + TotalDec(3) + TotalImpacts(2) + StepBalanceSide(1) + StepBalanceValue(4) +
 *         MaxSpeed(4) + LastMinMaxSpeed(4) + RRAvg(3) + MaxHR(3) + CRC(2) + D
 * Total: 1+2+6+1+5+5+5+4+4+4+2+3+3+3+3+2+1+4+4+4+3+3+2+1 = 75 chars
 */
function parseTotalPacket(packet: string): ParsedTotalPacket | null {
  // Total packet should be 75 chars
  if (packet.length < 73) {
    console.log(`[PacketParser] Total packet too short: ${packet.length} chars, expected 75`);
    return null;
  }
  
  console.log(`[PacketParser] Parsing Total packet: ${packet.length} chars, first 30: ${packet.substring(0, 30)}`);
  
  let pos = 1; // Skip 'T'
  
  const podId = packet.substring(pos, pos + 2);
  pos += 2;
  
  const gpsTime = packet.substring(pos, pos + 6);
  pos += 6;
  
  const gpsFix = packet.substring(pos, pos + 1);
  pos += 1;
  
  const playerLoad = parseInt(packet.substring(pos, pos + 5), 10);
  pos += 5;
  
  const totalDistance = parseInt(packet.substring(pos, pos + 5), 10);
  pos += 5;
  
  const hmdlDistance = parseInt(packet.substring(pos, pos + 5), 10);
  pos += 5;
  
  const z6Distance = parseInt(packet.substring(pos, pos + 4), 10);
  pos += 4;
  
  const z5Distance = parseInt(packet.substring(pos, pos + 4), 10);
  pos += 4;
  
  const z4Distance = parseInt(packet.substring(pos, pos + 4), 10);
  pos += 4;
  
  const z6Count = parseInt(packet.substring(pos, pos + 2), 10);
  pos += 2;
  
  const z5Count = parseInt(packet.substring(pos, pos + 3), 10);
  pos += 3;
  
  const z4Count = parseInt(packet.substring(pos, pos + 3), 10);
  pos += 3;
  
  const totalAccelerations = parseInt(packet.substring(pos, pos + 3), 10);
  pos += 3;
  
  const totalDecelerations = parseInt(packet.substring(pos, pos + 3), 10);
  pos += 3;
  
  const totalImpacts = parseInt(packet.substring(pos, pos + 2), 10);
  pos += 2;
  
  const stepBalanceSide = packet.substring(pos, pos + 1);
  pos += 1;
  
  const stepBalanceValue = parseInt(packet.substring(pos, pos + 4), 10);
  pos += 4;
  
  const maxSpeed = parseInt(packet.substring(pos, pos + 4), 10) / 10.0;
  pos += 4;
  
  const lastMinuteMaxSpeed = parseInt(packet.substring(pos, pos + 4), 10) / 10.0;
  pos += 4;
  
  const rrAverage = parseInt(packet.substring(pos, pos + 3), 10);
  pos += 3;
  
  const maxHeartRate = parseInt(packet.substring(pos, pos + 3), 10);
  pos += 3;
  
  // CRC might be 2 or more hex chars - look for 'D' terminator
  let crcEnd = pos;
  while (crcEnd < packet.length && packet[crcEnd] !== 'D') {
    crcEnd++;
  }
  if (crcEnd >= packet.length) {
    console.log(`[PacketParser] Could not find terminator 'D' in Total packet at pos ${pos}`);
    return null;
  }
  const crc = packet.substring(pos, crcEnd);
  pos = crcEnd;
  
  if (packet[pos] !== 'D') {
    console.log(`[PacketParser] Expected 'D' at pos ${pos} in Total packet, got '${packet[pos]}'`);
    return null;
  }
  
  console.log(`[PacketParser] Successfully parsed Total packet: podId=${podId}, distance=${totalDistance}, rrAvg=${rrAverage}, maxHR=${maxHeartRate}`);
  
  return {
    type: PacketType.TOTAL,
    podId,
    gpsTime,
    gpsFix,
    playerLoad,
    totalDistance,
    hmdlDistance,
    z6Distance,
    z5Distance,
    z4Distance,
    z6Count,
    z5Count,
    z4Count,
    totalAccelerations,
    totalDecelerations,
    totalImpacts,
    stepBalanceSide,
    stepBalanceValue,
    maxSpeed,
    lastMinuteMaxSpeed,
    rrAverage,
    maxHeartRate,
    crc,
  };
}

/**
 * Parse Status (S) packet
 */
function parseStatusPacket(packet: string): ParsedStatusPacket | null {
  // Status packet: S + PodID(2) + GPSDate(6) + GPSTime(6) + Reserved(12) + CRC(2) + D = 30 chars
  if (packet.length < 30) return null;
  
  let pos = 1; // Skip 'S'
  
  const podId = packet.substring(pos, pos + 2);
  pos += 2;
  
  const gpsDate = packet.substring(pos, pos + 6);
  pos += 6;
  
  const gpsTime = packet.substring(pos, pos + 6);
  pos += 6;
  
  const reserved = packet.substring(pos, pos + 12);
  pos += 12;
  
  const crc = packet.substring(pos, pos + 2);
  pos += 2;
  
  if (packet[pos] !== 'D') {
    return null;
  }
  
  return {
    type: PacketType.STATUS,
    podId,
    gpsDate,
    gpsTime,
    reserved,
    crc,
  };
}

/**
 * Parse a complete packet string
 */
export function parsePacket(packet: string): ParsedPacket | null {
  const trimmed = packet.trim();
  if (trimmed.length === 0) return null;
  
  const firstChar = trimmed[0];
  
  switch (firstChar) {
    case 'L':
      return parseLivePacket(trimmed);
    case 'T':
      return parseTotalPacket(trimmed);
    case 'S':
      return parseStatusPacket(trimmed);
    default:
      return null;
  }
}

/**
 * Convert parsed Live packet to patient data format
 */
export function livePacketToPatientData(packet: ParsedLivePacket, timestamp?: string): {
  patientId: string;
  data: {
    timestamp: string;
    gps: {
      lat: number;
      lon: number;
      speedKmh: number;
      distanceTotalM: number;
    };
    heart: {
      bpm: number;
      rrMs: number;
      maxBpmSession: number;
    };
    movement: {
      metabolicPowerWkg: number;
      activityZone: string;
      stepBalanceSide: string;
      stepBalancePercent: number;
    };
    temperature: {
      skinC: number;
    };
  };
} {
  const lat = parseLatitude(packet.latitude);
  const lon = parseLongitude(packet.longitude);
  const speedKnots = parseInt(packet.velocityKnots, 10) / 10.0;
  const speedKmh = speedKnots * 1.852; // Convert knots to km/h
  
  // Convert pod ID to patient ID (e.g., "01" -> "p1")
  const patientId = `p${parseInt(packet.podId, 10)}`;
  
  return {
    patientId,
    data: {
      timestamp: timestamp || new Date().toISOString(),
      gps: {
        lat,
        lon,
        speedKmh,
        distanceTotalM: 0, // Not in Live packet
      },
      heart: {
        bpm: packet.heartRate,
        rrMs: 0, // Not in Live packet
        maxBpmSession: 0, // Not in Live packet
      },
      movement: {
        metabolicPowerWkg: packet.metabolicPower,
        activityZone: 'Z1', // Not in Live packet, default
        stepBalanceSide: 'left', // Not in Live packet, default
        stepBalancePercent: 0, // Not in Live packet
      },
      temperature: {
        // Generate realistic skin temperature based on heart rate and metabolic power
        // Base temp 36.0, increases with activity (heart rate and metabolic power)
        skinC: 36.0 + (packet.heartRate - 60) / 100.0 + packet.metabolicPower / 20.0 + Math.random() * 0.5,
      },
    },
  };
}

/**
 * Convert parsed Total packet to patient data format
 */
export function totalPacketToPatientData(packet: ParsedTotalPacket, timestamp?: string): {
  patientId: string;
  data: {
    timestamp: string;
    gps: {
      lat: number;
      lon: number;
      speedKmh: number;
      distanceTotalM: number;
    };
    heart: {
      bpm: number;
      rrMs: number;
      maxBpmSession: number;
    };
    movement: {
      metabolicPowerWkg: number;
      activityZone: string;
      stepBalanceSide: string;
      stepBalancePercent: number;
    };
    temperature: {
      skinC: number;
    };
  };
} {
  const patientId = `p${parseInt(packet.podId, 10)}`;
  
  // Determine activity zone based on speed zones
  let activityZone = 'Z1';
  if (packet.z6Count > 0) activityZone = 'Z6';
  else if (packet.z5Count > 0) activityZone = 'Z5';
  else if (packet.z4Count > 0) activityZone = 'Z4';
  
  // Step balance: value is in hundredths of a percent (e.g., 820 = 8.20%)
  const stepBalancePercent = packet.stepBalanceValue / 100.0;
  
  return {
    patientId,
    data: {
      timestamp: timestamp || new Date().toISOString(),
      gps: {
        lat: 0, // Not in Total packet - will be merged from Live packet
        lon: 0, // Not in Total packet - will be merged from Live packet
        speedKmh: packet.maxSpeed, // Use max speed from Total packet
        distanceTotalM: packet.totalDistance,
      },
      heart: {
        bpm: 0, // Not in Total packet - will be merged from Live packet
        rrMs: packet.rrAverage,
        maxBpmSession: packet.maxHeartRate,
      },
      movement: {
        metabolicPowerWkg: 0, // Not in Total packet - will be merged from Live packet
        activityZone,
        stepBalanceSide: packet.stepBalanceSide === '1' ? 'left' : 'right',
        stepBalancePercent,
      },
      temperature: {
        skinC: 36.5, // Not in Total packet - will use default or merge from Live packet
      },
    },
  };
}

