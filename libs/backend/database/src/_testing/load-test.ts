import { RankingSystems } from '@badman/utils';
import { SystemBuilder } from './systemBuilder';
import { SystemGroupBuilder } from './systemGroupBuilder';

export async function loadTest() {
  const group = SystemGroupBuilder.Create();
  const system = await SystemBuilder.Create(RankingSystems.BVL, 12, 75, 50)
    .AsPrimary()
    .WithGroup(group)
    .Build();

  return {
    system,
    group,
  };
}
