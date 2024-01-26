import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:badman/assets.dart';

Marker getMapsMarker(LatLng position) => Marker(
      markerId: MarkerId('0'),
      position: position,
      icon: AppBitmaps.mapMarker,
    );
