import { moduleMetadata, Story, Meta } from '@storybook/angular';
import { EnrollmentMessageComponent } from './enrollment-message.component';

export default {
  title: 'EnrollmentMessageComponent',
  component: EnrollmentMessageComponent,
  decorators: [
    moduleMetadata({
      imports: [],
    })
  ],
} as Meta<EnrollmentMessageComponent>;

const Template: Story<EnrollmentMessageComponent> = (args: EnrollmentMessageComponent) => ({
  props: args,
});


export const Primary = Template.bind({});
Primary.args = {
}