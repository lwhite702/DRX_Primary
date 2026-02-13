import { ValidationError } from '@wrelik/errors';

export function validateUpload(
  file: { contentType: string; sizeBytes: number },
  policy: { maxSizeBytes: number; allowedTypes: string[] },
) {
  if (file.sizeBytes > policy.maxSizeBytes) {
    throw new ValidationError(`File too large. Max ${policy.maxSizeBytes} bytes.`);
  }
  if (!policy.allowedTypes.includes(file.contentType)) {
    throw new ValidationError(`Invalid file type ${file.contentType}`);
  }
  return true;
}
