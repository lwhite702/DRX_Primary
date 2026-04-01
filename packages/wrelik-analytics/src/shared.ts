import { ValidationError } from '@wrelik/errors';

export function validateEventName(event: string) {
  const parts = event.split('.');
  if (parts.length < 3) {
    throw new ValidationError(`Event name "${event}" must follow "app.action.object" format`);
  }
}
