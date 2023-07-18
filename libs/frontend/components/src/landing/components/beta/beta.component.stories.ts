import { Meta } from '@storybook/angular';
import { BetaComponent } from './beta.component';

export default {
  title: 'BetaComponent',
  component: BetaComponent,
} as Meta<BetaComponent>;

export const Primary = {
  render: (args: BetaComponent) => ({
    props: args,
  }),
  args: {},
};
