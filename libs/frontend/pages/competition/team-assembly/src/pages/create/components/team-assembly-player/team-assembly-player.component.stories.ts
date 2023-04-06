import { moduleMetadata, Story, Meta } from '@storybook/angular';
import { TeamAssemblyPlayerComponent } from './team-assembly-player.component';

export default {
  title: 'TeamAssemblyPlayerComponent',
  component: TeamAssemblyPlayerComponent,
  decorators: [
    moduleMetadata({
      imports: [],
    })
  ],
} as Meta<TeamAssemblyPlayerComponent>;

const Template: Story<TeamAssemblyPlayerComponent> = (args: TeamAssemblyPlayerComponent) => ({
  props: args,
});


export const Primary = Template.bind({});
Primary.args = {
    eventType:  '',
    showType:  '',
}