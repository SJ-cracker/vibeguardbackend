import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const STORAGE_ROOT = process.env.VERCEL
  ? path.join('/tmp', 'storage')
  : path.join(process.cwd(), 'storage');

export const ensureStorageDirs = async () => {
  await fs.mkdir(STORAGE_ROOT, { recursive: true });
  await fs.mkdir(path.join(STORAGE_ROOT, 'scans'), { recursive: true });
};

export const getScanDir = (scanId: string) => {
  return path.join(STORAGE_ROOT, 'scans', scanId);
};

export const createScanDir = async (scanId: string) => {
  const dir = getScanDir(scanId);
  await fs.mkdir(dir, { recursive: true });
  return dir;
};

export const cleanupScanDir = async (scanId: string) => {
  const dir = getScanDir(scanId);
  await fs.rm(dir, { recursive: true, force: true });
};
