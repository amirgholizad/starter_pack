// Every zod schema for the site lives here, with its inferred type exported
// next to it. Never inline a schema in a component or re-declare field rules.
import { z } from "zod";

export const contactFormSchema = z.object({
  name: z.string().min(1, "Please enter your name"),
  email: z.email("Please enter a valid email address"),
  phone: z.string().optional(),
  message: z.string().min(10, "Please add a few more details (at least 10 characters)."),
});

export type ContactFormType = z.infer<typeof contactFormSchema>;
