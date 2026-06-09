export const MAIL_TRANSPORT_TOKEN = Symbol("MAIL_TRANSPORT_TOKEN");

export interface MailSendOptions {
  from: string;
  to: string | string[];
  cc?: string | string[];
  subject: string;
  html: string;
}

export interface IMailTransport {
  send(options: MailSendOptions): Promise<void>;
}
