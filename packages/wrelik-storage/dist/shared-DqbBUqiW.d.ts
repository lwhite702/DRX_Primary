declare function validateUpload(file: {
    contentType: string;
    sizeBytes: number;
}, policy: {
    maxSizeBytes: number;
    allowedTypes: string[];
}): boolean;

export { validateUpload as v };
