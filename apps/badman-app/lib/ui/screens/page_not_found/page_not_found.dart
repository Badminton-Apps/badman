import 'package:badman/common_libs.dart';
import 'package:badman/logic/common/platform_info.dart';
import 'package:badman/ui/common/themed_text.dart';
import 'package:badman/ui/common/wonderous_logo.dart';

class PageNotFound extends StatelessWidget {
  const PageNotFound(this.url, {super.key});

  final String url;

  @override
  Widget build(BuildContext context) {
    void handleHomePressed() => context.go(ScreenPaths.home);

    return Scaffold(
      backgroundColor: $styles.colors.black,
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            WonderousLogo(),
            Gap(10),
            Text(
              'Wonderous',
              style: $styles.text.wonderTitle.copyWith(color: $styles.colors.accent1, fontSize: 28),
            ),
            Gap(70),
            Text(
              $strings.pageNotFoundMessage,
              style: $styles.text.body.copyWith(color: $styles.colors.offWhite),
            ),
            if (PlatformInfo.isDesktop) ...{
              LightText(child: Text('Path: $url', style: $styles.text.bodySmall)),
            },
            Gap(70),
            AppBtn(
              minimumSize: Size(200, 0),
              bgColor: $styles.colors.offWhite,
              onPressed: handleHomePressed,
              semanticLabel: 'Back',
              child: DarkText(
                child: Text(
                  $strings.pageNotFoundBackButton,
                  style: $styles.text.btn.copyWith(fontSize: 12),
                ),
              ),
            )
          ],
        ),
      ),
    );
  }
}
