import SwiftUI

struct TerminalView: View {
    @State private var inputText: String = ""
    @State private var outputMessages: [(String, Color)] = []
    
    @ObservedObject var bluetoothManager: BluetoothManager
    
    // Grid layout for buttons
    private let buttonColumns = [GridItem(.adaptive(minimum: 120), spacing: 10)]
    
    var body: some View {
        VStack {
            // Input field + Send button
            HStack {
                TextField("Enter text to send...", text: $inputText)
                    .textFieldStyle(RoundedBorderTextFieldStyle())
                    .padding(.horizontal)
                
                Button(action: sendText) {
                    Text("Send")
                        .font(.headline)
                        .foregroundColor(.white)
                        .padding()
                        .background(Color.black)
                        .cornerRadius(8)
                }
                .padding(.trailing)
                .disabled(bluetoothManager.connectedDevice == nil || inputText.isEmpty)
            }
            .padding(.top)
            
            // Command buttons using LazyVGrid
            LazyVGrid(columns: buttonColumns, spacing: 10) {
                Button("Read Config") { sendReadConfig() }
                Button("Diagnosis") { sendDiagnosis() }
                Button("Bootloader Mode") { sendBootloader() }
                Button("Reset Device") { sendResetDevice() }
                Button("Flight Mode") { sendFlightMode() }
                Button("NBIoT Mode") { sendNbiotMode() }
                Button("Send APN") { sendApn() }
                Button("Enable Modem") { sendEnableModem() }
                Button("CEREG") { sendCereg() }
                Button("CESQ") { sendCesq() }
                Button("CGATT") { sendCgatt() }
                Button("COPS") { sendCops() }
                Button("AT") { sendAt() }
                Button("AT+CFUN?") { sendAtCfun() }
                Button("AT+CFUN=?") { sendAtCfun1() }
                Button("CSQ") { sendAtCsq() }
            }
            .font(.headline)
            .foregroundColor(.white)
            .padding()
            .background(Color.blue)
            .cornerRadius(8)
            .disabled(bluetoothManager.connectedDevice == nil)
            
            Divider()
            
            // Output ScrollView with auto-scroll
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
                    .frame(maxWidth: .infinity, alignment: .topLeading)
                    .padding()
                    .background(Color.gray.opacity(0.2))
                    .cornerRadius(8)
                    .onChange(of: outputMessages.count) { _ in
                        proxy.scrollTo(outputMessages.count - 1, anchor: .bottom)
                    }
                }
            }
            .padding(.horizontal)
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
        .padding(.bottom)
        .navigationBarTitle("Terminal", displayMode: .inline)
        .onReceive(bluetoothManager.$receivedData) { newData in
            if !newData.isEmpty {
                outputMessages.append(("Received: \(newData)", .black))
                print("Displaying received data: \(newData)")
            }
        }
    }
    
    // MARK: - Helper
    private func sendCommand(_ command: String, displayText: String? = nil) {
        guard let peripheral = bluetoothManager.connectedDevice else {
            outputMessages.append(("Error: No device connected.", .red))
            return
        }
        bluetoothManager.sendData(command, to: peripheral)
        outputMessages.append(("Sent: \(displayText ?? command)", .blue))
    }
    
    // MARK: - Commands
    func sendText() {
        guard !inputText.isEmpty else { return }
        sendCommand(inputText)
        inputText = ""
    }
    
    func sendReadConfig() { sendCommand("$readcnfg") }
    func sendDiagnosis() { sendCommand("$diognasis") }
    func sendBootloader() { sendCommand("$bootloadermode") }
    func sendResetDevice() { sendCommand("$reset") }
    
    func sendFlightMode() { sendCommand("AT+CFUN=4") }
    func sendNbiotMode() { sendCommand("AT%XSYSTEMMODE=0,1,0,0") }
    func sendApn() { sendCommand("AT+CGDCONT=1,\"IP\",\"nbiot\"") }
    func sendEnableModem() { sendCommand("AT+CFUN=1") }
    
    func sendCereg() { sendCommand("AT+CEREG?") }
    func sendCesq() { sendCommand("AT+CESQ") }
    func sendCgatt() { sendCommand("AT+CGATT?") }
    func sendCops() { sendCommand("AT+COPS?") }
    
    func sendAt() { sendCommand("AT") }
    func sendAtCfun() { sendCommand("AT+CFUN?") }
    func sendAtCfun1() { sendCommand("AT+CFUN=?") }
    func sendAtCsq() { sendCommand("AT+CSQ") }
}
