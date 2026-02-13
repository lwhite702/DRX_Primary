import * as resend from 'resend';

declare function initEmail(apiKey: string, defaultFromAddress: string): void;
interface SendEmailOptions {
    to: string | string[];
    subject: string;
    html?: string;
    text?: string;
    from?: string;
    tags?: Array<{
        name: string;
        value: string;
    }>;
}
declare function sendEmail({ to, subject, html, text, from, tags }: SendEmailOptions): Promise<resend.CreateEmailResponseSuccess | null>;
type TemplateRenderer<T> = (data: T) => {
    subject: string;
    html: string;
    text?: string;
};
declare function defineTemplate<T>(id: string, renderer: TemplateRenderer<T>): void;
declare function sendTemplate<T>(id: string, to: string | string[], data: T, options?: Partial<SendEmailOptions>): Promise<resend.CreateEmailResponseSuccess | null>;

export { type SendEmailOptions, defineTemplate, initEmail, sendEmail, sendTemplate };
