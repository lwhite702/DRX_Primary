import * as node_buffer from 'node:buffer';
export { v as validateUpload } from './shared-DqbBUqiW.mjs';

declare function uploadToSignedUrl({ url, file, contentType, headers, }: {
    url: string;
    file: File | Blob;
    contentType: string;
    headers?: Record<string, string>;
}): Promise<boolean>;
declare function downloadFromSignedUrl({ url }: {
    url: string;
}): Promise<node_buffer.Blob>;

export { downloadFromSignedUrl, uploadToSignedUrl };
