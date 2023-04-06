import { moduleMetadata, Story, Meta } from '@storybook/angular';
import { CreatePageComponent } from './create.page';

export default {
  title: 'CreatePageComponent',
  component: CreatePageComponent,
  decorators: [
    moduleMetadata({
      imports: [],
    })
  ],
} as Meta<CreatePageComponent>;

const Template: Story<CreatePageComponent> = (args: CreatePageComponent) => ({
  props: args,
});


export const Primary = Template.bind({});
Primary.args = {
}