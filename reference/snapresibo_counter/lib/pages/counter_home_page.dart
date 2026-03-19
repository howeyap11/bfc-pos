import 'dart:io';

import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:hive/hive.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'package:blue_thermal_printer/blue_thermal_printer.dart';

import '../services/receipt_printer.dart';

class CounterHomePage extends StatefulWidget {
  const CounterHomePage({super.key});

  @override
  State<CounterHomePage> createState() => _CounterHomePageState();
}

class _CounterHomePageState extends State<CounterHomePage> {
  static const int _pricePhp = 50;

  late final Box _cache;

  bool _importing = false;
  bool _issuing = false;

  int _total = 0;
  int _available = 0;
  int _sold = 0;

  // Printer UI
  bool _printerBusy = false;
  bool _printerConnected = false;

  // purely for display (selected device)
  BluetoothDevice? _selectedDevice;

  String? _error;

  @override
  void initState() {
    super.initState();
    _cache = Hive.box('voucher_cache');
    _recount();
    _refreshPrinterConnected();
  }

  Future<void> _refreshPrinterConnected() async {
    try {
      final c = await ReceiptPrinter.isConnected();
      if (!mounted) return;
      setState(() => _printerConnected = c);
    } catch (_) {
      if (!mounted) return;
      setState(() => _printerConnected = false);
    }
  }

  void _setError(String? msg) {
    if (!mounted) return;
    setState(() => _error = msg);
  }

  void _snack(String msg) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));
  }

  // ----------------------------
  // VOUCHERS
  // ----------------------------

  void _recount() {
    int total = 0, available = 0, sold = 0;

    for (final k in _cache.keys) {
      final v = _cache.get(k);
      total++;
      if (v == 'available') available++;
      if (v == 'sold') sold++;
    }

    if (!mounted) return;
    setState(() {
      _total = total;
      _available = available;
      _sold = sold;
    });
  }

  bool _isVoucherId(String s) => s.startsWith('VCHR_') && s.length >= 10;

  Future<void> _importVouchersCsv() async {
    if (_importing) return;
    _setError(null);
    setState(() => _importing = true);

    try {
      final res = await FilePicker.platform.pickFiles(
        type: FileType.custom,
        allowedExtensions: ['csv', 'txt'],
        withData: false,
      );
      if (res == null || res.files.isEmpty) return;

      final path = res.files.single.path;
      if (path == null) return;

      final text = await File(path).readAsString();

      final lines =
          text
              .split(RegExp(r'\r?\n'))
              .map((l) => l.trim())
              .where((l) => l.isNotEmpty)
              .toList();

      if (lines.isEmpty) return;

      int start = 0;
      final first = lines.first.toLowerCase();
      if (first.contains('voucher')) start = 1;

      int added = 0;
      int skipped = 0;

      final Map<dynamic, dynamic> toPut = {};

      for (int i = start; i < lines.length; i++) {
        final id = lines[i].split(',').first.trim();
        if (!_isVoucherId(id)) {
          skipped++;
          continue;
        }

        final existing = _cache.get(id);
        if (existing == null || existing == 'unknown') {
          toPut[id] = 'available';
          added++;
        } else {
          skipped++;
        }
      }

      if (toPut.isNotEmpty) await _cache.putAll(toPut);

      _recount();
      _snack('Imported: +$added (skipped $skipped)');
    } catch (e) {
      _setError('IMPORT_FAILED: $e');
    } finally {
      if (mounted) setState(() => _importing = false);
    }
  }

  String? _pickNextAvailableVoucher() {
    final keys = _cache.keys.map((e) => e.toString()).toList()..sort();
    for (final id in keys) {
      if (_cache.get(id) == 'available') return id;
    }
    return null;
  }

  Future<void> _issueQrMarkSold() async {
    if (_issuing) return;
    _setError(null);
    setState(() => _issuing = true);

    try {
      final id = _pickNextAvailableVoucher();
      if (id == null) {
        _setError('NO_AVAILABLE_VOUCHERS');
        return;
      }

      await _cache.put(id, 'sold');
      _recount();

      if (!mounted) return;
      await Navigator.of(context).push(
        MaterialPageRoute(
          builder: (_) => IssueQrFullscreenPage(voucherId: id, pricePhp: _pricePhp),
        ),
      );
    } finally {
      if (mounted) setState(() => _issuing = false);
    }
  }

  Future<void> _clearAllVouchers() async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Clear all vouchers?'),
        content: const Text('This deletes ALL local vouchers on the counter device.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text('Clear'),
          ),
        ],
      ),
    );

    if (ok != true) return;

    await _cache.clear();
    _recount();
    _snack('Cleared all vouchers.');
  }

  // ----------------------------
  // PRINTER (BlueThermalPrinter)
  // ----------------------------

  Future<void> _selectAndConnectPrinter() async {
    if (_printerBusy) return;
    _setError(null);
    setState(() => _printerBusy = true);

    try {
      final devices = await ReceiptPrinter.pairedDevices();
      if (!mounted) return;

      if (devices.isEmpty) {
        _setError('NO_PAIRED_PRINTERS_FOUND (pair printer in Android Bluetooth settings first)');
        return;
      }

      final picked = await showDialog<BluetoothDevice>(
        context: context,
        builder: (_) => AlertDialog(
          title: const Text('Select printer (paired)'),
          content: SizedBox(
            width: double.maxFinite,
            child: ListView.separated(
              shrinkWrap: true,
              itemCount: devices.length,
              separatorBuilder: (_, __) => const Divider(height: 1),
              itemBuilder: (_, i) {
                final d = devices[i];
                final name = (d.name ?? '').trim().isEmpty ? '(no name)' : d.name!.trim();
                final addr = (d.address ?? '').trim();
                return ListTile(
                  title: Text(name),
                  subtitle: Text(addr.isEmpty ? '(no address)' : addr),
                  onTap: () => Navigator.of(context).pop(d),
                );
              },
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(null),
              child: const Text('Cancel'),
            ),
          ],
        ),
      );

      if (picked == null) return;

      await ReceiptPrinter.connect(picked);
      _selectedDevice = picked;

      await _refreshPrinterConnected();
      _snack('Printer connected.');
    } catch (e) {
      _setError('PRINTER_CONNECT_FAILED: $e');
    } finally {
      if (mounted) setState(() => _printerBusy = false);
    }
  }

  Future<void> _disconnectPrinter() async {
    if (_printerBusy) return;
    _setError(null);
    setState(() => _printerBusy = true);

    try {
      await ReceiptPrinter.disconnect();
      await _refreshPrinterConnected();
      _snack('Printer disconnected.');
    } catch (e) {
      _setError('PRINTER_DISCONNECT_FAILED: $e');
    } finally {
      if (mounted) setState(() => _printerBusy = false);
    }
  }

  Future<void> _testPrint() async {
    if (_printerBusy) return;
    _setError(null);
    setState(() => _printerBusy = true);

    try {
      await ReceiptPrinter.testPrint();
      _snack('Test print sent.');
    } catch (e) {
      _setError('TEST_PRINT_FAILED: $e');
    } finally {
      if (mounted) setState(() => _printerBusy = false);
    }
  }

  // ----------------------------
  // UI
  // ----------------------------

  @override
  Widget build(BuildContext context) {
    final primary = Theme.of(context).colorScheme.primary;

    final selectedName =
        (_selectedDevice?.name ?? '').trim().isEmpty ? '(none)' : _selectedDevice!.name!.trim();
    final selectedAddr = (_selectedDevice?.address ?? '').trim();

    return Scaffold(
      appBar: AppBar(title: const Text('Counter')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Card(
            child: Padding(
              padding: const EdgeInsets.all(14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    '₱$_pricePhp per session',
                    style: TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.w900,
                      color: primary,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Tap “Issue QR” after payment (marks voucher as sold).',
                    style: TextStyle(
                      fontWeight: FontWeight.w600,
                      color: primary.withOpacity(0.75),
                    ),
                  ),
                ],
              ),
            ),
          ),

          const SizedBox(height: 12),

          if (_error != null) ...[
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.red.withOpacity(0.10),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.red.withOpacity(0.35)),
              ),
              child: Row(
                children: [
                  const Icon(Icons.error_outline, color: Colors.red),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      _error!,
                      style: const TextStyle(
                        color: Colors.red,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),
          ],

          // Printer
          Card(
            child: Padding(
              padding: const EdgeInsets.all(14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Printer',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800),
                  ),
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      Icon(
                        _printerConnected ? Icons.print_rounded : Icons.print_disabled_rounded,
                        color: _printerConnected ? primary : Colors.grey,
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          _printerConnected ? 'Connected' : 'Not connected',
                          style: TextStyle(
                            fontWeight: FontWeight.w800,
                            color: _printerConnected ? primary : Colors.grey,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Selected: $selectedName',
                    style: const TextStyle(fontWeight: FontWeight.w600),
                  ),
                  if (selectedAddr.isNotEmpty) ...[
                    const SizedBox(height: 2),
                    Text(
                      selectedAddr,
                      style: TextStyle(
                        fontWeight: FontWeight.w600,
                        color: Colors.black.withOpacity(0.55),
                        fontSize: 12,
                      ),
                    ),
                  ],
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: _printerBusy ? null : _selectAndConnectPrinter,
                          icon: _printerBusy
                              ? const SizedBox(
                                  width: 18,
                                  height: 18,
                                  child: CircularProgressIndicator(strokeWidth: 2),
                                )
                              : const Icon(Icons.bluetooth_searching_rounded),
                          label: const Text('Select & connect'),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: FilledButton.icon(
                          onPressed: _printerBusy
                              ? null
                              : (_printerConnected ? _disconnectPrinter : _selectAndConnectPrinter),
                          icon: Icon(_printerConnected ? Icons.link_off_rounded : Icons.link_rounded),
                          label: Text(_printerConnected ? 'Disconnect' : 'Connect'),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  OutlinedButton.icon(
                    onPressed: _printerBusy ? null : _testPrint,
                    icon: const Icon(Icons.receipt_long_rounded),
                    label: const Text('Test print'),
                  ),
                ],
              ),
            ),
          ),

          const SizedBox(height: 12),

          // Voucher pack
          Card(
            child: Padding(
              padding: const EdgeInsets.all(14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Voucher pack',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800),
                  ),
                  const SizedBox(height: 10),
                  _kv('Total', _total),
                  _kv('Available', _available),
                  _kv('Sold', _sold),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: ElevatedButton.icon(
                          onPressed: _importing ? null : _importVouchersCsv,
                          icon: _importing
                              ? const SizedBox(
                                  width: 18,
                                  height: 18,
                                  child: CircularProgressIndicator(strokeWidth: 2),
                                )
                              : const Icon(Icons.upload_file_rounded),
                          label: Text(_importing ? 'Importing...' : 'Import vouchers CSV'),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      Expanded(
                        child: FilledButton.icon(
                          onPressed: (_available <= 0 || _issuing) ? null : _issueQrMarkSold,
                          icon: _issuing
                              ? const SizedBox(
                                  width: 18,
                                  height: 18,
                                  child: CircularProgressIndicator(strokeWidth: 2),
                                )
                              : const Icon(Icons.qr_code_rounded),
                          label: Text(_issuing ? 'Issuing...' : 'Issue QR (Mark sold)'),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  OutlinedButton.icon(
                    onPressed: _clearAllVouchers,
                    icon: const Icon(Icons.delete_sweep_rounded),
                    label: const Text('Clear all vouchers'),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _kv(String k, dynamic v) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Row(
        children: [
          Expanded(child: Text(k, style: const TextStyle(fontWeight: FontWeight.w600))),
          Text(v.toString(), style: const TextStyle(fontWeight: FontWeight.w800)),
        ],
      ),
    );
  }
}

class IssueQrFullscreenPage extends StatefulWidget {
  final String voucherId;
  final int pricePhp;

  const IssueQrFullscreenPage({
    super.key,
    required this.voucherId,
    required this.pricePhp,
  });

  @override
  State<IssueQrFullscreenPage> createState() => _IssueQrFullscreenPageState();
}

class _IssueQrFullscreenPageState extends State<IssueQrFullscreenPage> {
  bool _printing = false;
  String? _printError;

  Future<void> _printReceipt() async {
    if (_printing) return;

    setState(() {
      _printing = true;
      _printError = null;
    });

    try {
      await ReceiptPrinter.printVoucher(
        voucherId: widget.voucherId,
        pricePhp: widget.pricePhp,
      );

      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Receipt printed.')),
      );
    } catch (e) {
      if (!mounted) return;
      setState(() => _printError = 'PRINT_FAILED: $e');
    } finally {
      if (mounted) setState(() => _printing = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final primary = Theme.of(context).colorScheme.primary;

    return Scaffold(
      appBar: AppBar(title: const Text('Show customer this QR')),
      body: SafeArea(
        child: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(
                  '₱${widget.pricePhp}',
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.w900,
                    color: primary,
                  ),
                ),
                const SizedBox(height: 10),
                Container(
                  padding: const EdgeInsets.all(18),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(18),
                    border: Border.all(color: Colors.black.withOpacity(0.12)),
                    boxShadow: [
                      BoxShadow(
                        blurRadius: 18,
                        color: Colors.black.withOpacity(0.10),
                      ),
                    ],
                  ),
                  child: QrImageView(
                    data: widget.voucherId,
                    version: QrVersions.auto,
                    size: 280,
                  ),
                ),
                const SizedBox(height: 16),
                SelectableText(
                  widget.voucherId,
                  style: const TextStyle(fontWeight: FontWeight.w800),
                ),
                const SizedBox(height: 14),

                if (_printError != null) ...[
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: Colors.red.withOpacity(0.10),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: Colors.red.withOpacity(0.30)),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.error_outline, color: Colors.red),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Text(
                            _printError!,
                            style: const TextStyle(
                              color: Colors.red,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 12),
                ],

                SizedBox(
                  width: double.infinity,
                  child: OutlinedButton.icon(
                    onPressed: _printing ? null : _printReceipt,
                    icon: _printing
                        ? const SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Icon(Icons.print_rounded),
                    label: Text(_printing ? 'Printing...' : 'Print QR receipt'),
                  ),
                ),

                const SizedBox(height: 10),
                SizedBox(
                  width: double.infinity,
                  child: FilledButton(
                    onPressed: () => Navigator.of(context).pop(),
                    child: const Text('Done'),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
