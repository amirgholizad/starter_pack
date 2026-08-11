// REFERENCE IMPLEMENTATION — the house pattern for a Web3Forms contact form.
//
// BUILD AGENT: use this as-is and restyle it to the client's design. Swap the
// copy and fields for what the brief asks for, but keep all four behaviors:
//   1. react-hook-form + zodResolver against the schema in lib/validators.ts
//   2. the access-key guard, so an unconfigured key tells the visitor to call
//      instead of silently dropping the lead
//   3. the hidden `botcheck` honeypot (Web3Forms drops filled submissions)
//   4. sonner toasts on both the success and the error path
// If the site needs no contact form, delete this file.
"use client";

import { useState } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import useWeb3forms from "@web3forms/react";
import { toast } from "sonner";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { contactFormSchema, type ContactFormType } from "@/lib/validators";
import { site } from "@/lib/constants";

const rawKey = process.env.NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY ?? "";
// Treat an unset key, or the .env.example placeholder, as "not configured yet".
const accessKey = rawKey.includes("REPLACE") ? "" : rawKey;

const notConfiguredMessage = `The contact form isn't configured yet. Please call or text ${site.phone}.`;
const errorMessage = `Something went wrong. Please call or text ${site.phone} instead.`;

export function ContactForm() {
  const [botcheck, setBotcheck] = useState("");

  const form = useForm<ContactFormType>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: { name: "", email: "", phone: "", message: "" },
  });

  const { submit } = useWeb3forms<ContactFormType & { botcheck: string }>({
    access_key: accessKey,
    settings: {
      from_name: site.name,
      subject: `New enquiry from the ${site.name} website`,
    },
    onSuccess: () => {
      toast.success("Thanks! We got your message and we'll be in touch shortly.");
      form.reset();
    },
    onError: (message, data) => {
      console.error("[ContactForm] Web3Forms rejected the submission:", message, data);
      toast.error(errorMessage);
    },
  });

  const onSubmit: SubmitHandler<ContactFormType> = async values => {
    if (!accessKey) {
      console.error("[ContactForm] NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY is not configured.");
      toast.error(notConfiguredMessage);
      return;
    }
    try {
      await submit({ ...values, botcheck });
    } catch (err) {
      // Network-level failure (or a non-JSON response): the hook rejects without calling onError.
      console.error("[ContactForm] Submission request failed:", err);
      toast.error(errorMessage);
    }
  };

  const onInvalid = (errors: typeof form.formState.errors) => {
    console.error("[ContactForm] Validation failed, submission blocked:", errors);
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit, onInvalid)}
        noValidate
        className="flex h-full flex-col rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-8"
      >
        {/* honeypot — Web3Forms drops any submission where this is filled */}
        <input
          type="checkbox"
          name="botcheck"
          tabIndex={-1}
          autoComplete="off"
          className="hidden"
          checked={botcheck === "on"}
          onChange={e => setBotcheck(e.target.checked ? "on" : "")}
          aria-hidden="true"
        />

        <div className="grid gap-5 sm:grid-cols-2 sm:items-start">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input autoComplete="name" placeholder="Your name" {...field} />
                </FormControl>
                <div className="min-h-5">
                  <FormMessage />
                </div>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone</FormLabel>
                <FormControl>
                  <Input type="tel" autoComplete="tel" placeholder="000-000-0000" {...field} />
                </FormControl>
                <div className="min-h-5">
                  <FormMessage />
                </div>
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem className="mt-5">
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" autoComplete="email" placeholder="you@example.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="message"
          render={({ field }) => (
            <FormItem className="mt-5 flex flex-1 flex-col">
              <FormLabel>How can we help?</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Tell us what you're looking for, or ask a question…"
                  className="min-h-32 flex-1"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          size="lg"
          disabled={form.formState.isSubmitting}
          className="mt-6 w-full rounded-full sm:w-auto"
        >
          <Send className="size-4" />
          {form.formState.isSubmitting ? "Sending…" : "Send message"}
        </Button>
      </form>
    </Form>
  );
}
