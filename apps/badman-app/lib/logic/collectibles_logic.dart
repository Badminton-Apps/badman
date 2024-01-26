import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:badman/common_libs.dart';
import 'package:badman/logic/common/save_load_mixin.dart';
import 'package:badman/logic/data/collectible_data.dart';
import 'package:badman/logic/native_widget_service.dart';

class CollectiblesLogic with ThrottledSaveLoadMixin {
  @override
  String get fileName => 'collectibles.dat';

  /// Holds all collectibles that the views should care about
  final List<CollectibleData> all = collectiblesData;

  /// Current state for each collectible
  late final statesById = ValueNotifier<Map<String, int>>({})..addListener(_updateCounts);

  int _discoveredCount = 0;

  int get discoveredCount => _discoveredCount;

  int _exploredCount = 0;

  int get exploredCount => _exploredCount;

  late final _nativeWidget = GetIt.I<NativeWidgetService>();

  void init() => _nativeWidget.init();

  CollectibleData? fromId(String? id) => id == null ? null : all.firstWhereOrNull((o) => o.id == id);

  List<CollectibleData> forWonder(WonderType wonder) {
    return all.where((o) => o.wonder == wonder).toList(growable: false);
  }

  void setState(String id, int state) {
    Map<String, int> states = Map.of(statesById.value);
    states[id] = state;
    statesById.value = states;
    if (state == CollectibleState.discovered) {
      final data = fromId(id)!;
      _updateNativeWidgetTextData(
        title: data.title,
        id: data.id,
        imageUrl: data.imageUrlSmall,
      );
    }
    scheduleSave();
  }

  void _updateCounts() {
    _discoveredCount = _exploredCount = 0;
    statesById.value.forEach((_, state) {
      if (state == CollectibleState.discovered) _discoveredCount++;
      if (state == CollectibleState.explored) _exploredCount++;
    });
    final foundCount = discoveredCount + exploredCount;
    _nativeWidget.save<int>('discoveredCount', foundCount).then((value) {
      _nativeWidget.markDirty();
    });

    debugPrint('setting discoveredCount for home widget $foundCount');
  }

  /// Get a discovered item, sorted by the order of wondersLogic.all
  CollectibleData? getFirstDiscoveredOrNull() {
    List<CollectibleData> discovered = [];
    statesById.value.forEach((key, value) {
      if (value == CollectibleState.discovered) discovered.add(fromId(key)!);
    });
    for (var w in wondersLogic.all) {
      for (var d in discovered) {
        if (d.wonder == w.type) return d;
      }
    }
    return null;
  }

  bool isLost(WonderType wonderType, int i) {
    final datas = forWonder(wonderType);
    final states = statesById.value;
    if (datas.length > i && states.containsKey(datas[i].id)) {
      return states[datas[i].id] == CollectibleState.lost;
    }
    return true;
  }

  void reset() {
    Map<String, int> states = {};
    for (int i = 0; i < all.length; i++) {
      states[all[i].id] = CollectibleState.lost;
    }
    if (_nativeWidget.isSupported) {
      _updateNativeWidgetTextData(); // clear home widget data
    }
    statesById.value = states;
    debugPrint('collection reset');
    scheduleSave();
  }

  Future<void> _updateNativeWidgetTextData({String title = '', String id = '', String imageUrl = ''}) async {
    // Save title
    await _nativeWidget.save<String>('lastDiscoveredTitle', title);
    // Subtitle
    String subTitle = '';
    if (id.isNotEmpty) {
      final artifactData = await artifactLogic.getArtifactByID(id);
      subTitle = artifactData?.date ?? '';
    }
    await _nativeWidget.save<String>('lastDiscoveredSubTitle', subTitle);
    // Image,
    // Download, convert to base64 string and write to shared widget data
    String imageBase64 = '';
    if (imageUrl.isNotEmpty) {
      var bytes = await http.readBytes(Uri.parse(imageUrl));
      imageBase64 = base64Encode(bytes);
      debugPrint('Saving base64 bytes: $imageBase64');
    }
    await _nativeWidget.save<String>('lastDiscoveredImageData', imageBase64);
    await _nativeWidget.markDirty();
  }

  @override
  void copyFromJson(Map<String, dynamic> value) {
    Map<String, int> states = {};
    for (int i = 0; i < all.length; i++) {
      String id = all[i].id;
      states[id] = value[id] ?? CollectibleState.lost;
    }
    statesById.value = states;
  }

  @override
  Map<String, dynamic> toJson() => statesById.value;
}
