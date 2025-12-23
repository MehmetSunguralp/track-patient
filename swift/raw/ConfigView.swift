import SwiftUI

struct ConfigView: View {
    // AppStorage for persistent settings
    @AppStorage("name") private var name: String = "actin"
    @AppStorage("deviceNumber") private var deviceNumber: String = "1"
    @AppStorage("uid") private var uid: String = "0000"
    @AppStorage("hrs") private var hrs: String = "None"

    @State private var generatedPacket: String = ""
    @State private var nameError: String?
    @State private var outputMessages: [(String, Color)] = []

    @ObservedObject var bluetoothManager: BluetoothManager

    var body: some View {
        GeometryReader { _ in
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {

                    // MARK: - Settings Grid
                    LazyVGrid(
                        columns: [GridItem(.flexible()), GridItem(.flexible())],
                        spacing: 15
                    ) {
                        ConfigTextField(
                            label: "Name (5 chars, lowercase)",
                            text: $name,
                            error: $nameError,
                            validation: validateName
                        )

                        ConfigTextField(
                            label: "Device Number",
                            text: $deviceNumber,
                            keyboard: .numberPad
                        )

                        ConfigTextField(
                            label: "UID (4 digit number)",
                            text: $uid,
                            keyboard: .numberPad
                        )

                        ConfigTextField(
                            label: "HRS Device Name (Max 20 chars)",
                            text: $hrs
                        )
                    }

                    // MARK: - Buttons
                    HStack {
                        Button(action: generatePacket) {
                            Text("Generate Packet")
                                .font(.headline)
                                .foregroundColor(.white)
                                .padding()
                                .background(Color.blue)
                                .cornerRadius(10)
                        }

                        Spacer()

                        Button(action: sendPacketToDevice) {
                            Text("Send Packet to Device")
                                .font(.headline)
                                .foregroundColor(.white)
                                .padding()
                                .background(Color.green)
                                .cornerRadius(10)
                        }
                        .disabled(
                            generatedPacket.isEmpty ||
                            bluetoothManager.connectedDevice == nil
                        )
                    }
                    .padding(.vertical)

                    // MARK: - Generated Packet
                    Text("Generated Packet:")
                        .font(.headline)

                    Text(generatedPacket)
                        .padding()
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .font(.system(size: 16, weight: .medium, design: .monospaced))
                        .background(Color.gray.opacity(0.15))
                        .cornerRadius(8)

                    // MARK: - Output Messages
                    ScrollViewReader { proxy in
                        ScrollView {
                            VStack(alignment: .leading) {
                                ForEach(outputMessages.indices, id: \.self) { i in
                                    let (message, color) = outputMessages[i]
                                    Text(message)
                                        .foregroundColor(color)
                                        .padding(.bottom, 2)
                                        .id(i)
                                }
                            }
                            .padding()
                        }
                        .background(Color.gray.opacity(0.2))
                        .cornerRadius(8)
                        .onChange(of: outputMessages.count) {
                            guard outputMessages.count > 0 else { return }
                            proxy.scrollTo(outputMessages.count - 1, anchor: .bottom)
                        }
                    }
                    .frame(maxHeight: 300)
                }
                .padding()
            }
        }
    }

    // MARK: - Functions

    func generatePacket() {
        generatedPacket = "$cnfg,\(name),\(deviceNumber),\(uid),\(hrs)"
    }

    func sendPacketToDevice() {
        guard let peripheral = bluetoothManager.connectedDevice else {
            outputMessages.append(("Error: No device connected.", .red))
            return
        }

        bluetoothManager.sendData(generatedPacket, to: peripheral)
        outputMessages.append(("Sent: \(generatedPacket)", .blue))
    }

    func validateName(_ newValue: String) {
        var correctedValue = newValue.lowercased()

        if correctedValue.count > 5 {
            correctedValue = String(correctedValue.prefix(5))
        }

        name = correctedValue

        if correctedValue.count != 5 {
            nameError = "Name must be exactly 5 characters."
        } else {
            nameError = nil
        }
    }
}

// MARK: - Reusable ConfigTextField

struct ConfigTextField: View {
    let label: String
    @Binding var text: String
    @Binding var error: String?
    var keyboard: UIKeyboardType = .default
    var validation: ((String) -> Void)? = nil

    init(
        label: String,
        text: Binding<String>,
        error: Binding<String?> = .constant(nil),
        keyboard: UIKeyboardType = .default,
        validation: ((String) -> Void)? = nil
    ) {
        self.label = label
        self._text = text
        self._error = error
        self.keyboard = keyboard
        self.validation = validation
    }

    var body: some View {
        VStack(alignment: .leading) {
            Text(label)
                .font(.caption)
                .foregroundColor(.gray)

            TextField(label, text: $text)
                .keyboardType(keyboard)
                .textFieldStyle(RoundedBorderTextFieldStyle())
                .onChange(of: text) {
                    validation?(text)
                }

            if let errorMessage = error {
                Text(errorMessage)
                    .foregroundColor(.red)
                    .font(.caption)
            }
        }
    }
}
