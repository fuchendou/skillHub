import { z } from "zod";

// Mirrors schema.md / api.md constraints. The server validates again — this is for UX speed.
export const INSTALL_COMMAND_RE =
  /^(codex|claude|gemini|opencode)\s+skill\s+(install|add)\s+[A-Za-z0-9._/-]+$/;

export const skillSubmitSchema = z.object({
  name: z.string().min(3, "At least 3 characters.").max(120),
  summary: z.string().min(10, "At least 10 characters.").max(280),
  category_id: z.string().min(1, "Choose a category."),
  install_command: z
    .string()
    .min(1, "Required.")
    .regex(INSTALL_COMMAND_RE, "Format: `codex skill install owner/name`."),
  source_url: z.string().min(1, "Required.").max(500),
  tags: z.string().max(200).optional(),
  usage_note: z.string().max(5000).optional(),
});

export type SkillFormValues = z.infer<typeof skillSubmitSchema>;
