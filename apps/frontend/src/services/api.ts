import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export const api = axios.create({
  baseURL: API_BASE_URL,
});

export interface Finding {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  analyzer: string;
  title: string;
  description: string;
  filePath: string;
  lineStart: number;
  lineEnd: number;
  codeSnippet: string;
  fixSuggestion: string;
  effort: 'quick' | 'medium' | 'complex';
  cweId?: string;
  owaspCategory?: string;
}

export interface Scan {
  id: string;
  status: 'pending' | 'running' | 'complete' | 'failed';
  vibeScore: number | null;
  createdAt: string;
  findings: Finding[];
  _count?: {
    findings: number;
  };
}

export const getScan = async (scanId: string): Promise<Scan> => {
  const { data } = await api.get(`/v1/scans/${scanId}`);
  return data;
};

export const getScans = async (): Promise<Scan[]> => {
  const { data } = await api.get('/v1/scans');
  return data;
};

export const createScan = async (formData: FormData) => {
  const { data } = await api.post('/v1/scans', formData);
  return data;
};
