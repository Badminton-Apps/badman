import { Field, InputType, Int, ObjectType } from '@nestjs/graphql';

@ObjectType({ description: 'A AvailiblyDay' })
export class AvailiblyDayType {
  @Field(() => String, { nullable: true })
  day?: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
  @Field(() => String, { nullable: true })
  startTime?: string;
  @Field(() => String, { nullable: true })
  endTime?: string;
  @Field(() => Int, { nullable: true })
  courts?: number;
}

@InputType({ description: 'A AvailiblyDay' })
export class AvailiblyDayInputType {
  @Field(() => String, { nullable: true })
  day?: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
  @Field(() => String, { nullable: true })
  startTime?: string;
  @Field(() => String, { nullable: true })
  endTime?: string;
  @Field(() => Int, { nullable: true })
  courts?: number;
}
