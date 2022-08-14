import { SetMetadata } from '@nestjs/common';

export const ALLOW_ANONYMOUS_META_KEY = 'allowAnonymous';

export const AllowAnonymous = () => SetMetadata(ALLOW_ANONYMOUS_META_KEY, true);
