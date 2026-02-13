export * from './shared';

export async function uploadToSignedUrl({
  url,
  file,
  contentType,
  headers = {},
}: {
  url: string;
  file: File | Blob;
  contentType: string;
  headers?: Record<string, string>;
}) {
  const result = await fetch(url, {
    method: 'PUT',
    body: file,
    headers: {
      'Content-Type': contentType,
      ...headers,
    },
  });

  if (!result.ok) {
    throw new Error(`Upload failed with status ${result.status}`);
  }

  return true;
}

export async function downloadFromSignedUrl({ url }: { url: string }) {
  const result = await fetch(url);
  if (!result.ok) {
    throw new Error(`Download failed with status ${result.status}`);
  }
  return result.blob();
}
