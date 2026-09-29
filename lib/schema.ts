import { z } from "zod";

export const intakeSchema = z.object({
  linkedinUrl: z.string().url().refine(v => /(^|\.)linkedin\.com$/i.test(new URL(v).hostname.replace(/^www\./,"")), "Use a linkedin.com profile URL"),
  instagramUrl: z.string().url().refine(v => /(^|\.)instagram\.com$/i.test(new URL(v).hostname.replace(/^www\./,"")), "Use an instagram.com public profile URL"),
  interestedIn: z.string().max(120).optional(),
  fallbackText: z.string().max(15000).optional()
});
export const profileSchema = z.object({
  summary:z.string(), career_stage:z.string(), skills:z.array(z.string()), hobbies:z.array(z.string()), interests:z.array(z.string()), values:z.array(z.string()),
  communication_style:z.string(), lifestyle:z.string(), location:z.string(), needs:z.array(z.string()), looking_for:z.string(), deal_breakers:z.array(z.string()),
  evidence:z.array(z.object({field:z.enum(["summary","career_stage","skills","hobbies","interests","values","communication_style","lifestyle","location","needs","looking_for","deal_breakers"]).optional(),claim:z.string(),source:z.enum(["LinkedIn","Instagram"]),snippet:z.string().min(1)})), confidence:z.number().min(0).max(1)
});
export type AgentProfile = z.infer<typeof profileSchema>;
export const majorEvidenceFields=["summary","career_stage","skills","hobbies","interests","values","communication_style","lifestyle","location","needs","looking_for","deal_breakers"] as const;
export const evidenceCompleteProfileSchema=profileSchema.superRefine((profile,ctx)=>{for(const field of majorEvidenceFields){if(!profile.evidence.some(e=>e.field===field))ctx.addIssue({code:"custom",path:["evidence"],message:`Missing evidence for ${field}`})}});
