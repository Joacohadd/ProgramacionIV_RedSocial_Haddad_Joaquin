import { BadGatewayException, BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import { mkdir, writeFile } from 'fs/promises';
import { randomUUID } from 'crypto';
import { join } from 'path';
import { MAX_IMAGE_BYTES, MAX_IMAGE_MB } from './image-limits';

@Injectable()
export class ImageService {
  async save(file?: Express.Multer.File): Promise<string | undefined> {
    if (!file) return undefined;
    const extensions: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' };
    const ext = extensions[file.mimetype];
    const bytes = file.buffer;
    const valid = file.mimetype === 'image/jpeg' ? bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
      : file.mimetype === 'image/png' ? bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))
      : file.mimetype === 'image/webp' ? bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP'
      : file.mimetype === 'image/gif' ? ['GIF87a', 'GIF89a'].includes(bytes.toString('ascii', 0, 6)) : false;
    if (!ext || !valid || file.size > MAX_IMAGE_BYTES || bytes.length > MAX_IMAGE_BYTES) {
      throw new BadRequestException(`La imagen debe ser JPG, PNG, WebP o GIF y pesar hasta ${MAX_IMAGE_MB} MB.`);
    }
    const name = `${randomUUID()}.${ext}`;
    const storage = process.env.IMAGE_STORAGE || (process.env.VERCEL === '1' || process.env.NODE_ENV === 'production' ? 'cloudinary' : 'local');
    if (storage === 'cloudinary') return this.uploadToCloudinary(bytes, name);
    if (storage !== 'local' || process.env.VERCEL === '1') {
      throw new ServiceUnavailableException('Configurá el almacenamiento de imágenes en el servidor.');
    }
    const dir = join(process.cwd(), 'uploads');
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, name), file.buffer, { flag: 'wx' });
    return `${process.env.PUBLIC_API_URL || 'http://localhost:3000'}/uploads/${name}`;
  }

  private async uploadToCloudinary(bytes: Buffer, name: string): Promise<string> {
    const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;
    if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
      throw new ServiceUnavailableException('Falta configurar el almacenamiento de imágenes.');
    }
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream({
        cloud_name: CLOUDINARY_CLOUD_NAME, api_key: CLOUDINARY_API_KEY, api_secret: CLOUDINARY_API_SECRET,
        resource_type: 'image', public_id: `trama/${name.replace(/\.[^.]+$/, '')}`, overwrite: false, timeout: 30000,
      }, (error, result) => {
        if (error || !result?.secure_url) return reject(new BadGatewayException('No se pudo guardar la imagen. Intentá nuevamente.'));
        resolve(result.secure_url);
      });
      stream.on('error', () => reject(new BadGatewayException('No se pudo guardar la imagen. Intentá nuevamente.')));
      stream.end(bytes);
    });
  }
}
