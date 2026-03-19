import 'dart:convert';
import 'dart:typed_data';

import 'package:blue_thermal_printer/blue_thermal_printer.dart';
import 'package:esc_pos_utils_plus/esc_pos_utils.dart';

class ReceiptPrinter {
  static final BlueThermalPrinter _bt = BlueThermalPrinter.instance;

  static Future<List<BluetoothDevice>> pairedDevices() async {
    return await _bt.getBondedDevices();
  }

  static Future<void> connect(BluetoothDevice device) async {
    await _bt.connect(device);
  }

  static Future<void> disconnect() async {
    await _bt.disconnect();
  }

  static Future<bool> isConnected() async {
    return (await _bt.isConnected) ?? false;
  }

  // ----------------------------
  // RAW ESC/POS QR (no QRSize enum)
  // ----------------------------
  static List<int> _escposQr(
    String data, {
    int moduleSize = 6,
    int ecLevel = 48,
  }) {
    // moduleSize: 1..16 (typical: 4-8)
    // ecLevel: 48(L),49(M),50(Q),51(H)  => we default to 48 (L)
    final bytes = <int>[];
    final store = utf8.encode(data);

    // [1] Select the model: 2
    bytes.addAll([0x1D, 0x28, 0x6B, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00]);

    // [2] Set module size
    final ms = moduleSize.clamp(1, 16);
    bytes.addAll([0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x43, ms]);

    // [3] Set error correction level
    // 48=L, 49=M, 50=Q, 51=H
    final ecl = ecLevel.clamp(48, 51);
    bytes.addAll([0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x45, ecl]);

    // [4] Store data
    // pL pH = (data length + 3) in little endian
    final len = store.length + 3;
    final pL = len & 0xFF;
    final pH = (len >> 8) & 0xFF;
    bytes.addAll([0x1D, 0x28, 0x6B, pL, pH, 0x31, 0x50, 0x30]);
    bytes.addAll(store);

    // [5] Print QR
    bytes.addAll([0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x51, 0x30]);

    return bytes;
  }

  static Future<void> printVoucher({
    required String voucherId,
    required int pricePhp,
  }) async {
    final connected = await isConnected();
    if (!connected) {
      throw Exception('PRINTER_NOT_CONNECTED');
    }

    final profile = await CapabilityProfile.load();
    final gen = Generator(PaperSize.mm58, profile);

    final bytes = <int>[];

    bytes.addAll(gen.reset());

    bytes.addAll(
      gen.text(
        'SNAPRESIBO',
        styles: const PosStyles(
          bold: true,
          height: PosTextSize.size2,
          width: PosTextSize.size2,
          align: PosAlign.center,
        ),
      ),
    );
    bytes.addAll(
      gen.text(
        'Counter Receipt',
        styles: const PosStyles(align: PosAlign.center, bold: true),
      ),
    );
    bytes.addAll(gen.hr());
    bytes.addAll(
      gen.text(
        'PHP $pricePhp',
        styles: const PosStyles(align: PosAlign.center, bold: true),
      ),
    );
    bytes.addAll(gen.feed(1));

    // ✅ QR printed via raw ESC/POS command (NO QRSize enum)
    bytes.addAll(_escposQr(voucherId, moduleSize: 6, ecLevel: 48));

    bytes.addAll(gen.feed(1));
    bytes.addAll(
      gen.text(
        voucherId,
        styles: const PosStyles(align: PosAlign.center, bold: true),
      ),
    );
    bytes.addAll(gen.feed(2));

    // Some BT printers choke on cut. If yours supports it, keep:
    bytes.addAll(gen.cut());

    await _bt.writeBytes(Uint8List.fromList(bytes));
  }

  static Future<void> testPrint() async {
    final connected = await isConnected();
    if (!connected) throw Exception('PRINTER_NOT_CONNECTED');

    final profile = await CapabilityProfile.load();
    final gen = Generator(PaperSize.mm58, profile);

    final bytes = <int>[];
    bytes.addAll(
      gen.text(
        'TEST PRINT',
        styles: const PosStyles(align: PosAlign.center, bold: true),
      ),
    );
    bytes.addAll(gen.feed(2));
    await _bt.writeBytes(Uint8List.fromList(bytes));
  }
}
