/**
 * Shape of an uploaded file (Multer). Use this instead of Express.Multer.File
 * when the Express namespace is not available in the build.
 */
export interface MulterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  destination: string;
  filename: string;
  path: string;
  buffer: Buffer;
}
