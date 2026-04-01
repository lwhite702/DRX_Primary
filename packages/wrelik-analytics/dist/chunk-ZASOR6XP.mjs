// src/shared.ts
import { ValidationError } from "@wrelik/errors";
function validateEventName(event) {
  const parts = event.split(".");
  if (parts.length < 3) {
    throw new ValidationError(`Event name "${event}" must follow "app.action.object" format`);
  }
}

export {
  validateEventName
};
