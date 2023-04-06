import { moduleMetadata, Story, Meta } from '@storybook/angular';
import { AssemblyMessageComponent } from './assembly-message.component';

export default {
  title: 'AssemblyMessageComponent',
  component: AssemblyMessageComponent,
  decorators: [
    moduleMetadata({
      imports: [],
    })
  ],
} as Meta<AssemblyMessageComponent>;

const Template: Story<AssemblyMessageComponent> = (args: AssemblyMessageComponent) => ({
  props: args,
});


export const Primary = Template.bind({});
Primary.args = {
}