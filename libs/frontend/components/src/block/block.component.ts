import {
  ChangeDetectionStrategy,
  Component,
  Directive,
  Input,
  ViewEncapsulation,
} from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'badman-block',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './block.component.html',
  styleUrls: ['./block.component.scss'],
  host: {
    class: 'mat-mdc-card mdc-card',
    '[class.mat-mdc-card-outlined]': 'appearance === "outlined"',
    '[class.mdc-card--outlined]': 'appearance === "outlined"',
  },
  exportAs: 'badmanBlock',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BadmanBlockComponent {}

/**
 * Title of a card, intended for use within `<badman-block>`. This component is an optional
 * convenience for one variety of card title; any custom title element may be used in its place.
 *
 * BadmanBlockTitle provides no behaviors, instead serving as a purely visual treatment.
 */
@Directive({
  selector: `badman-block-title, [badman-block-title], [badmanBlockTitle]`,
  host: { class: 'badman-block-title' },
})
export class BadmanBlockTitle {}

/**
 * Container intended to be used within the `<badman-block>` component. Can contain exactly one
 * `<badman-block-title>`, one `<badman-block-subtitle>` and one content image of any size
 * (e.g. `<img badmanBlockLgImage>`).
 */
@Component({
  selector: 'badman-block-title-group',
  templateUrl: './block-title-group.component.html',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'badman-block-title-group' },
})
export class BadmanBlockTitleGroup {}

/**
 * Content of a card, intended for use within `<badman-block>`. This component is an optional
 * convenience for use with other convenience elements, such as `<badman-block-title>`; any custom
 * content block element may be used in its place.
 *
 * BadmanBlockContent provides no behaviors, instead serving as a purely visual treatment.
 */
@Directive({
  selector: 'badman-block-content',
  host: { class: 'badman-block-content' },
})
export class BadmanBlockContent {}

/**
 * Sub-title of a card, intended for use within `<badman-block>` beneath a `<badman-block-title>`. This
 * component is an optional convenience for use with other convenience elements, such as
 * `<badman-block-title>`.
 *
 * BadmanBlockSubtitle provides no behaviors, instead serving as a purely visual treatment.
 */
@Directive({
  selector: `badman-block-subtitle, [badman-block-subtitle], [badmanBlockSubtitle]`,
  host: { class: 'badman-block-subtitle' },
})
export class BadmanBlockSubtitle {}

/**
 * Bottom area of a card that contains action buttons, intended for use within `<badman-block>`.
 * This component is an optional convenience for use with other convenience elements, such as
 * `<badman-block-content>`; any custom action block element may be used in its place.
 *
 * BadmanBlockActions provides no behaviors, instead serving as a purely visual treatment.
 */
@Directive({
  selector: 'badman-block-actions',
  exportAs: 'badmanBlockActions',
  host: {
    class: 'badman-block-actions mdc-card__actions',
    '[class.badman-block-actions-align-end]': 'align === "end"',
  },
})
export class BadmanBlockActions {
  // TODO(jelbourn): deprecate `align` in favor of `actionPosition` or `actionAlignment`
  // as to not conflict with the native `align` attribute.

  /** Position of the actions inside the card. */
  @Input() align: 'start' | 'end' = 'start';

  // TODO(jelbourn): support `.mdc-card__actions--full-bleed`.

  // TODO(jelbourn): support  `.mdc-card__action-buttons` and `.mdc-card__action-icons`.

  // TODO(jelbourn): figure out how to use `.mdc-card__action`, `.mdc-card__action--button`, and
  // `mdc-card__action--icon`. They're used primarily for positioning, which we might be able to
  // do implicitly.
}

/**
 * Header region of a card, intended for use within `<badman-block>`. This header captures
 * a card title, subtitle, and avatar.  This component is an optional convenience for use with
 * other convenience elements, such as `<badman-block-footer>`; any custom header block element may be
 * used in its place.
 *
 * BadmanBlockHeader provides no behaviors, instead serving as a purely visual treatment.
 */
@Component({
  selector: 'badman-block-header',
  templateUrl: './block-header.component.html',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'badman-block-header' },
})
export class BadmanBlockHeader {}

/**
 * Footer area a card, intended for use within `<badman-block>`.
 * This component is an optional convenience for use with other convenience elements, such as
 * `<badman-block-content>`; any custom footer block element may be used in its place.
 *
 * BadmanBlockFooter provides no behaviors, instead serving as a purely visual treatment.
 */
@Directive({
  selector: 'badman-block-footer',
  host: { class: 'badman-block-footer' },
})
export class BadmanBlockFooter {}

// TODO(jelbourn): deprecate the "image" selectors to replace with "media".

// TODO(jelbourn): support `.mdc-card__media-content`.

/**
 * Primary image content for a card, intended for use within `<badman-block>`. Can be applied to
 * any media element, such as `<img>` or `<picture>`.
 *
 * This component is an optional convenience for use with other convenience elements, such as
 * `<badman-block-content>`; any custom media element may be used in its place.
 *
 * BadmanBlockImage provides no behaviors, instead serving as a purely visual treatment.
 */
@Directive({
  selector: '[badman-block-image], [badmanBlockImage]',
  host: { class: 'badman-block-image mdc-card__media' },
})
export class BadmanBlockImage {
  // TODO(jelbourn): support `.mdc-card__media--square` and `.mdc-card__media--16-9`.
}

/** Same as `BadmanBlockImage`, but small. */
@Directive({
  selector: '[badman-block-sm-image], [badmanBlockImageSmall]',
  host: { class: 'badman-block-sm-image mdc-card__media' },
})
export class BadmanBlockSmImage {}

/** Same as `BadmanBlockImage`, but medium. */
@Directive({
  selector: '[badman-block-md-image], [badmanBlockImageMedium]',
  host: { class: 'badman-block-md-image mdc-card__media' },
})
export class BadmanBlockMdImage {}

/** Same as `BadmanBlockImage`, but large. */
@Directive({
  selector: '[badman-block-lg-image], [badmanBlockImageLarge]',
  host: { class: 'badman-block-lg-image mdc-card__media' },
})
export class BadmanBlockLgImage {}

/** Same as `BadmanBlockImage`, but extra-large. */
@Directive({
  selector: '[badman-block-xl-image], [badmanBlockImageXLarge]',
  host: { class: 'badman-block-xl-image mdc-card__media' },
})
export class BadmanBlockXlImage {}

/**
 * Avatar image content for a card, intended for use within `<badman-block>`. Can be applied to
 * any media element, such as `<img>` or `<picture>`.
 *
 * This component is an optional convenience for use with other convenience elements, such as
 * `<badman-block-title>`; any custom media element may be used in its place.
 *
 * BadmanBlockAvatar provides no behaviors, instead serving as a purely visual treatment.
 */
@Directive({
  selector: '[badman-block-avatar], [badmanBlockAvatar]',
  host: { class: 'badman-block-avatar' },
})
export class BadmanBlockAvatar {}
