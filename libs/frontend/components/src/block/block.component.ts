/* eslint-disable @angular-eslint/directive-selector */
import {
  ChangeDetectionStrategy,
  Component,
  Directive,
  HostBinding,
  ViewEncapsulation,
  input
} from '@angular/core';
@Component({
  selector: 'badman-block',
  templateUrl: './block.component.html',
  styleUrls: ['./block.component.scss'],
  exportAs: 'badmanBlock',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BadmanBlockComponent {
  @HostBinding('class')
  hostClass = 'badman-block';

  // @HostBinding('class.mat-badman-block-outlined')
  // get isOutlined() {
  //   return this.appearance === 'outlined';
  // }

  // @HostBinding('class.badman-block--outlined')
  // get isMdcOutlined() {
  //   return this.appearance === 'outlined';
  // }

  // @Input() appearance?: string;
}

/**
 * Title of a card, intended for use within `<badman-block>`. This component is an optional
 * convenience for one variety of card title; any custom title element may be used in its place.
 *
 * BadmanBlockTitle provides no behaviors, instead serving as a purely visual treatment.
 */
@Directive({
  selector: `badman-block-title, [badman-block-title], [badmanBlockTitle]`,
})
export class BadmanBlockTitleDirective {
  @HostBinding('class')
  hostClass = 'badman-block-title';
}

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
})
export class BadmanBlockTitleGroupComponent {
  @HostBinding('class')
  hostClass = 'badman-block-title-group';
}

/**
 * Content of a card, intended for use within `<badman-block>`. This component is an optional
 * convenience for use with other convenience elements, such as `<badman-block-title>`; any custom
 * content block element may be used in its place.
 *
 * BadmanBlockContent provides no behaviors, instead serving as a purely visual treatment.
 */
@Directive({
  selector: 'badman-block-content',
})
export class BadmanBlockContentDirective {
  @HostBinding('class')
  hostClass = 'badman-block-content';
}

/**
 * Sub-title of a card, intended for use within `<badman-block>` beneath a `<badman-block-title>`. This
 * component is an optional convenience for use with other convenience elements, such as
 * `<badman-block-title>`.
 *
 * BadmanBlockSubtitle provides no behaviors, instead serving as a purely visual treatment.
 */
@Directive({
  selector: `badman-block-subtitle, [badman-block-subtitle], [badmanBlockSubtitle]`,
})
export class BadmanBlockSubtitleDirective {
  @HostBinding('class')
  hostClass = 'badman-block-subtitle';
}

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
})
export class BadmanBlockActionsDirective {
  /** Position of the actions inside the card. */
  align = input<'start' | 'end'>('start');

  @HostBinding('class')
  hostClass = 'badman-block-actions';

  @HostBinding('class.badman-block-actions-align-end')
  get isAtEnd() {
    return this.align() === 'end';
  }

  @HostBinding('class.badman-block-actions-align-start')
  get isAtStart() {
    return this.align() === 'start';
  }
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
})
export class BadmanBlockHeaderComponent {
  @HostBinding('class')
  hostClass = 'badman-block-header';
}

/**
 * Footer area a card, intended for use within `<badman-block>`.
 * This component is an optional convenience for use with other convenience elements, such as
 * `<badman-block-content>`; any custom footer block element may be used in its place.
 *
 * BadmanBlockFooter provides no behaviors, instead serving as a purely visual treatment.
 */
@Directive({
  selector: 'badman-block-footer',
})
export class BadmanBlockFooterDirective {
  @HostBinding('class')
  hostClass = 'badman-block-footer';
}

// TODO(jelbourn): deprecate the "image" selectors to replace with "media".

// TODO(jelbourn): support `.badman-block__media-content`.

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
})
export class BadmanBlockImageDirective {
  @HostBinding('class')
  hostClass = 'badman-block-image badman-block__media';
}

/** Same as `BadmanBlockImage`, but small. */
@Directive({
  selector: '[badman-block-sm-image], [badmanBlockImageSmall]',
})
export class BadmanBlockSmImageDirective {
  @HostBinding('class')
  hostClass = 'badman-block-sm-image badman-block__media';
}

/** Same as `BadmanBlockImage`, but medium. */
@Directive({
  selector: '[badman-block-md-image], [badmanBlockImageMedium]',
})
export class BadmanBlockMdImageDirective {
  @HostBinding('class')
  hostClass = 'badman-block-md-image badman-block__media';
}

/** Same as `BadmanBlockImage`, but large. */
@Directive({
  selector: '[badman-block-lg-image], [badmanBlockImageLarge]',
})
export class BadmanBlockLgImageDirective {
  @HostBinding('class')
  hostClass = 'badman-block-lg-image badman-block__media';
}

/** Same as `BadmanBlockImage`, but extra-large. */
@Directive({
  selector: '[badman-block-xl-image], [badmanBlockImageXLarge]',
})
export class BadmanBlockXlImageDirective {
  @HostBinding('class')
  hostClass = 'badman-block-xl-image badman-block__media';
}

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
})
export class BadmanBlockAvatarDirective {
  @HostBinding('class')
  hostClass = 'badman-block-avatar';
}
