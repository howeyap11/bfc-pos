import 'package:flutter/material.dart';
import 'package:hive_flutter/hive_flutter.dart';

import 'pages/counter_home_page.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Hive.initFlutter();

  // Same box name as booth to share file formats/conventions
  await Hive.openBox(
    'voucher_cache',
  ); // voucherId -> status ('available','issued','used')
  await Hive.openBox('voucher_meta'); // misc (optional)

  runApp(const CounterApp());
}

class CounterApp extends StatelessWidget {
  const CounterApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Snapresibo Counter',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF4E2A1E),
        ), // choco brown-ish
        useMaterial3: true,
      ),
      home: const CounterHomePage(),
    );
  }
}
