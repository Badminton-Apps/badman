import { moduleMetadata, Story, Meta } from '@storybook/angular';
import { AssemblyComponent } from './assembly.component';

export default {
  title: 'AssemblyComponent',
  component: AssemblyComponent,
  decorators: [
    moduleMetadata({
      imports: [],
    })
  ],
} as Meta<AssemblyComponent>;

const Template: Story<AssemblyComponent> = (args: AssemblyComponent) => ({
  props: args,
});


export const Primary = Template.bind({});
Primary.args = {
}