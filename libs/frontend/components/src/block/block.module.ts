import { NgModule } from '@angular/core';
import {
  BadmanBlockComponent,
  BadmanBlockTitleDirective,
  BadmanBlockTitleGroupComponent,
  BadmanBlockContentDirective,
  BadmanBlockSubtitleDirective,
  BadmanBlockActionsDirective,
  BadmanBlockHeaderComponent,
  BadmanBlockFooterDirective,
  BadmanBlockImageDirective,
  BadmanBlockSmImageDirective,
  BadmanBlockMdImageDirective,
  BadmanBlockLgImageDirective,
  BadmanBlockXlImageDirective,
  BadmanBlockAvatarDirective,
} from './block.component';

const BLOCK_DIRECTIVES = [
  BadmanBlockComponent,
  BadmanBlockTitleDirective,
  BadmanBlockTitleGroupComponent,
  BadmanBlockContentDirective,
  BadmanBlockSubtitleDirective,
  BadmanBlockActionsDirective,
  BadmanBlockHeaderComponent,
  BadmanBlockFooterDirective,

  BadmanBlockImageDirective,
  BadmanBlockSmImageDirective,
  BadmanBlockMdImageDirective,
  BadmanBlockLgImageDirective,
  BadmanBlockXlImageDirective,

  BadmanBlockAvatarDirective,
];

@NgModule({
  imports: [],
  exports: [BLOCK_DIRECTIVES],
  declarations: BLOCK_DIRECTIVES,
})
export class BadmanBlockModule {}
