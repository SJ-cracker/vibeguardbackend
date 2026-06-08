import { z } from "zod";

export const ScanFindingsSchema = z.object({
  id: z.string(),
  severity: z.enum(["critical", "high", "medium", "low", "info"]),
  analyzer: z.enum(["bug", "security", "api", "deployment"]),
  title: z.string(),
  description: z.string(),
  cwe_id: z.string().optional(),
  owasp_category: z.string().optional(),
  file_path: z.string(),
  line_start: z.number(),
  line_end: z.number(),
  code_snippet: z.string(),
  fix_suggestion: z.string(),
  fix_diff: z.string().optional(),
  effort: z.enum(["quick", "medium", "complex"]),
  suppressed: z.boolean(),
  suppression_reason: z.string().optional()
});

export type ScanFinding = z.infer<typeof ScanFindingsSchema>;
