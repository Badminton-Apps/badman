import 'package:badman/common_libs.dart';
import 'package:badman/ui/common/lazy_indexed_stack.dart';
import 'package:badman/ui/common/measurable_widget.dart';
import 'package:badman/ui/screens/artifact/artifact_carousel/artifact_carousel_screen.dart';
import 'package:badman/ui/screens/editorial/editorial_screen.dart';
import 'package:badman/ui/screens/photo_gallery/photo_gallery.dart';
import 'package:badman/ui/screens/wonder_details/wonder_details_tab_menu.dart';
import 'package:badman/ui/screens/wonder_events/wonder_events.dart';

class WonderDetailsScreen extends StatefulWidget with GetItStatefulWidgetMixin {
  WonderDetailsScreen({Key? key, required this.type, this.tabIndex = 0}) : super(key: key);
  final WonderType type;
  final int tabIndex;

  @override
  State<WonderDetailsScreen> createState() => _WonderDetailsScreenState();
}

class _WonderDetailsScreenState extends State<WonderDetailsScreen>
    with GetItStateMixin, SingleTickerProviderStateMixin {
  late final _tabController = TabController(
    length: 4,
    vsync: this,
    initialIndex: _clampIndex(widget.tabIndex),
  )..addListener(_handleTabChanged);
  AnimationController? _fade;

  double? _tabBarSize;
  bool _useNavRail = false;

  @override
  void didUpdateWidget(covariant WonderDetailsScreen oldWidget) {
    if (oldWidget.tabIndex != widget.tabIndex) {
      _tabController.index = _clampIndex(widget.tabIndex);
    }
    super.didUpdateWidget(oldWidget);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  int _clampIndex(int index) => index.clamp(0, 3);

  void _handleTabChanged() {
    _fade?.forward(from: 0);
    setState(() {});
  }

  void _handleTabTapped(int index) {
    _tabController.index = index;
    context.go(ScreenPaths.wonderDetails(widget.type, tabIndex: _tabController.index));
  }

  void _handleTabMenuSized(Size size) {
    setState(() {
      _tabBarSize = (_useNavRail ? size.width : size.height) - WonderDetailsTabMenu.buttonInset;
    });
  }

  @override
  Widget build(BuildContext context) {
    _useNavRail = appLogic.shouldUseNavRail();

    final wonder = wondersLogic.getData(widget.type);
    int tabIndex = _tabController.index;
    bool showTabBarBg = tabIndex != 1;
    final tabBarSize = _tabBarSize ?? 0;
    final menuPadding = _useNavRail ? EdgeInsets.only(left: tabBarSize) : EdgeInsets.only(bottom: tabBarSize);
    return ColoredBox(
      color: Colors.black,
      child: Stack(
        children: [
          /// Fullscreen tab views
          LazyIndexedStack(
            index: _tabController.index,
            children: [
              WonderEditorialScreen(wonder, contentPadding: menuPadding),
              PhotoGallery(collectionId: wonder.unsplashCollectionId, wonderType: wonder.type),
              ArtifactCarouselScreen(type: wonder.type, contentPadding: menuPadding),
              WonderEvents(type: widget.type, contentPadding: menuPadding),
            ],
          ),

          /// Tab menu
          Align(
            alignment: _useNavRail ? Alignment.centerLeft : Alignment.bottomCenter,
            child: MeasurableWidget(
              onChange: _handleTabMenuSized,
              child: WonderDetailsTabMenu(
                  tabController: _tabController,
                  onTap: _handleTabTapped,
                  wonderType: wonder.type,
                  showBg: showTabBarBg,
                  axis: _useNavRail ? Axis.vertical : Axis.horizontal),
            ),
          ),
        ],
      ),
    );
  }
}
