export class Faq {
  id?: string;
  question?: string;
  answer?: string;

  constructor({ ...args }: Partial<Faq>) {
    this.id = args.id;
    this.question = args.question;
    this.answer = args.answer;
  }
}
