import fs from 'fs/promises';
import path from 'path';
import AdmZip from 'adm-zip';
import simpleGit from 'simple-git';
import { createScanDir } from './storage';

export const handleFileUpload = async (scanId: string, filename: string, fileBuffer: Buffer) => {
  const scanDir = await createScanDir(scanId);
  const filePath = path.join(scanDir, filename);
  await fs.writeFile(filePath, fileBuffer);
  return scanDir;
};

export const handleZipUpload = async (scanId: string, fileBuffer: Buffer) => {
  const scanDir = await createScanDir(scanId);
  const zip = new AdmZip(fileBuffer);
  zip.extractAllTo(scanDir, true);
  return scanDir;
};

export const handleGitClone = async (scanId: string, gitUrl: string) => {
  const scanDir = await createScanDir(scanId);
  const git = simpleGit();
  await git.clone(gitUrl, scanDir);
  return scanDir;
};
