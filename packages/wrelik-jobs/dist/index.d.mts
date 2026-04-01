import * as inngest_types from 'inngest/types';
import * as inngest from 'inngest';
import { Inngest } from 'inngest';

declare let client: Inngest;
declare function initJobs(appId: string, eventSchema?: any): void;
declare function emit(eventName: string, payload: any): Promise<inngest_types.SendEventOutput<inngest.ClientOptions>>;
declare function createFunction(name: string, trigger: {
    event: string;
} | {
    cron: string;
}, handler: (args: any) => Promise<any>): inngest.InngestFunction<Omit<inngest.InngestFunction.Options<Inngest<inngest.ClientOptions>, inngest.InngestMiddleware.Stack, [{
    event: string;
}] | [{
    cron: string;
}], inngest.Handler<Inngest<inngest.ClientOptions>, string, {
    event: inngest.FailureEventPayload<inngest.EventPayload<any>>;
    logger: inngest.Logger;
    error: Error;
}>>, "triggers">, (args: any) => Promise<any>, inngest.Handler<Inngest<inngest.ClientOptions>, string, {
    event: inngest.FailureEventPayload<inngest.EventPayload<any>>;
    logger: inngest.Logger;
    error: Error;
}>, Inngest<inngest.ClientOptions>, inngest.InngestMiddleware.Stack, [{
    event: string;
}] | [{
    cron: string;
}]>;

export { createFunction, emit, initJobs, client as inngest };
