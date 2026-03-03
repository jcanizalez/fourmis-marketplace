---
description: When the user asks about React forms, React Hook Form, form validation in React, multi-step forms, optimistic updates, server actions with forms, or form handling patterns in React or Next.js
---

# Form Patterns

## React Hook Form + Zod

The standard approach for client-side forms with type-safe validation.

### Basic Form
```tsx
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const ContactSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
  subject: z.enum(["general", "support", "billing"]),
  message: z.string().min(10, "Message must be at least 10 characters"),
});

type ContactForm = z.infer<typeof ContactSchema>;

export function ContactForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<ContactForm>({
    resolver: zodResolver(ContactSchema),
    defaultValues: {
      subject: "general",
    },
  });

  const onSubmit = async (data: ContactForm) => {
    await submitContact(data);
    reset();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label htmlFor="name">Name</label>
        <input id="name" {...register("name")} />
        {errors.name && <p className="text-red-500 text-sm">{errors.name.message}</p>}
      </div>

      <div>
        <label htmlFor="email">Email</label>
        <input id="email" type="email" {...register("email")} />
        {errors.email && <p className="text-red-500 text-sm">{errors.email.message}</p>}
      </div>

      <div>
        <label htmlFor="subject">Subject</label>
        <select id="subject" {...register("subject")}>
          <option value="general">General</option>
          <option value="support">Support</option>
          <option value="billing">Billing</option>
        </select>
      </div>

      <div>
        <label htmlFor="message">Message</label>
        <textarea id="message" {...register("message")} rows={4} />
        {errors.message && <p className="text-red-500 text-sm">{errors.message.message}</p>}
      </div>

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Sending..." : "Send"}
      </button>
    </form>
  );
}
```

### Reusable Form Field Component
```tsx
import { FieldError, UseFormRegisterReturn } from "react-hook-form";

interface FormFieldProps {
  label: string;
  error?: FieldError;
  registration: UseFormRegisterReturn;
  type?: string;
  placeholder?: string;
}

function FormField({ label, error, registration, type = "text", placeholder }: FormFieldProps) {
  return (
    <div>
      <label htmlFor={registration.name} className="block text-sm font-medium">
        {label}
      </label>
      <input
        id={registration.name}
        type={type}
        placeholder={placeholder}
        className={clsx(
          "mt-1 block w-full rounded-md border px-3 py-2",
          error ? "border-red-500" : "border-gray-300",
        )}
        {...registration}
      />
      {error && <p className="mt-1 text-sm text-red-500">{error.message}</p>}
    </div>
  );
}

// Usage
<FormField label="Email" error={errors.email} registration={register("email")} type="email" />
```

---

## Multi-Step Form

### Wizard Pattern
```tsx
"use client";

import { useState } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

// Schema per step
const Step1Schema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
});

const Step2Schema = z.object({
  company: z.string().min(1),
  role: z.string().min(1),
});

const Step3Schema = z.object({
  plan: z.enum(["free", "pro", "enterprise"]),
  agreedToTerms: z.literal(true, {
    errorMap: () => ({ message: "You must agree to the terms" }),
  }),
});

// Combined schema
const FullSchema = Step1Schema.merge(Step2Schema).merge(Step3Schema);
type FormData = z.infer<typeof FullSchema>;

const STEPS = [
  { schema: Step1Schema, title: "Personal Info" },
  { schema: Step2Schema, title: "Company" },
  { schema: Step3Schema, title: "Plan" },
];

export function SignupWizard() {
  const [step, setStep] = useState(0);

  const methods = useForm<FormData>({
    resolver: zodResolver(FullSchema),
    mode: "onTouched",
    defaultValues: {
      plan: "free",
    },
  });

  const currentStep = STEPS[step];

  const nextStep = async () => {
    // Validate only current step's fields
    const fields = Object.keys(currentStep.schema.shape) as (keyof FormData)[];
    const isValid = await methods.trigger(fields);
    if (isValid) setStep((s) => s + 1);
  };

  const prevStep = () => setStep((s) => s - 1);

  const onSubmit = async (data: FormData) => {
    await createAccount(data);
  };

  return (
    <FormProvider {...methods}>
      {/* Progress bar */}
      <div className="flex gap-2 mb-6">
        {STEPS.map((s, i) => (
          <div
            key={i}
            className={clsx(
              "flex-1 h-2 rounded-full",
              i <= step ? "bg-blue-600" : "bg-gray-200",
            )}
          />
        ))}
      </div>

      <h2 className="text-xl font-bold mb-4">{currentStep.title}</h2>

      <form onSubmit={methods.handleSubmit(onSubmit)}>
        {step === 0 && <Step1Fields />}
        {step === 1 && <Step2Fields />}
        {step === 2 && <Step3Fields />}

        <div className="flex justify-between mt-6">
          {step > 0 && (
            <button type="button" onClick={prevStep}>
              Back
            </button>
          )}
          {step < STEPS.length - 1 ? (
            <button type="button" onClick={nextStep}>
              Next
            </button>
          ) : (
            <button type="submit" disabled={methods.formState.isSubmitting}>
              {methods.formState.isSubmitting ? "Creating..." : "Create Account"}
            </button>
          )}
        </div>
      </form>
    </FormProvider>
  );
}
```

---

## Server Actions (Next.js)

### Form with Server Action + Validation
```tsx
// actions.ts
"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

const CreateTodoSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
});

type ActionState = {
  errors?: Record<string, string[]>;
  message?: string;
} | null;

export async function createTodo(
  prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const result = CreateTodoSchema.safeParse({
    title: formData.get("title"),
    priority: formData.get("priority"),
  });

  if (!result.success) {
    return { errors: result.error.flatten().fieldErrors };
  }

  await db.todos.create({ data: result.data });
  revalidatePath("/todos");
  return { message: "Todo created!" };
}
```

```tsx
// TodoForm.tsx
"use client";

import { useActionState } from "react";
import { createTodo } from "./actions";

export function TodoForm() {
  const [state, formAction, isPending] = useActionState(createTodo, null);

  return (
    <form action={formAction}>
      <input name="title" placeholder="What needs to be done?" />
      {state?.errors?.title && (
        <p className="text-red-500">{state.errors.title[0]}</p>
      )}

      <select name="priority">
        <option value="low">Low</option>
        <option value="medium">Medium</option>
        <option value="high">High</option>
      </select>

      <button type="submit" disabled={isPending}>
        {isPending ? "Adding..." : "Add Todo"}
      </button>

      {state?.message && <p className="text-green-600">{state.message}</p>}
    </form>
  );
}
```

---

## Optimistic Updates

### With useOptimistic
```tsx
"use client";

import { useOptimistic, useTransition } from "react";
import { toggleTodo } from "./actions";

interface Todo {
  id: string;
  title: string;
  done: boolean;
}

export function TodoList({ todos }: { todos: Todo[] }) {
  const [optimisticTodos, addOptimistic] = useOptimistic(
    todos,
    (state: Todo[], updatedId: string) =>
      state.map((t) => (t.id === updatedId ? { ...t, done: !t.done } : t)),
  );
  const [, startTransition] = useTransition();

  const handleToggle = (id: string) => {
    startTransition(async () => {
      addOptimistic(id); // Instantly update UI
      await toggleTodo(id); // Server action (revalidates on complete)
    });
  };

  return (
    <ul>
      {optimisticTodos.map((todo) => (
        <li key={todo.id}>
          <label>
            <input
              type="checkbox"
              checked={todo.done}
              onChange={() => handleToggle(todo.id)}
            />
            <span className={todo.done ? "line-through" : ""}>{todo.title}</span>
          </label>
        </li>
      ))}
    </ul>
  );
}
```

---

## Dynamic Field Arrays

```tsx
"use client";

import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const InvoiceSchema = z.object({
  client: z.string().min(1),
  items: z
    .array(
      z.object({
        description: z.string().min(1),
        quantity: z.coerce.number().int().positive(),
        price: z.coerce.number().positive(),
      }),
    )
    .min(1, "At least one item required"),
});

type InvoiceForm = z.infer<typeof InvoiceSchema>;

export function InvoiceForm() {
  const { register, control, handleSubmit, watch, formState: { errors } } =
    useForm<InvoiceForm>({
      resolver: zodResolver(InvoiceSchema),
      defaultValues: {
        items: [{ description: "", quantity: 1, price: 0 }],
      },
    });

  const { fields, append, remove } = useFieldArray({ control, name: "items" });
  const items = watch("items");
  const total = items.reduce((sum, item) => sum + (item.quantity || 0) * (item.price || 0), 0);

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register("client")} placeholder="Client name" />

      {fields.map((field, index) => (
        <div key={field.id} className="flex gap-2">
          <input {...register(`items.${index}.description`)} placeholder="Item" />
          <input {...register(`items.${index}.quantity`)} type="number" min={1} />
          <input {...register(`items.${index}.price`)} type="number" step="0.01" />
          {fields.length > 1 && (
            <button type="button" onClick={() => remove(index)}>✕</button>
          )}
        </div>
      ))}

      <button type="button" onClick={() => append({ description: "", quantity: 1, price: 0 })}>
        + Add Item
      </button>

      <p className="font-bold">Total: ${total.toFixed(2)}</p>
      <button type="submit">Create Invoice</button>
    </form>
  );
}
```

---

## Quick Reference

| Pattern | When to Use |
|---------|------------|
| React Hook Form + Zod | Any client-side form with validation |
| Server Actions | Next.js forms (progressive enhancement) |
| Multi-step wizard | Long forms, onboarding flows |
| useOptimistic | Instant feedback on mutations |
| useFieldArray | Dynamic lists of inputs (invoice items, tags) |
| useActionState | Server action forms with pending/error state |
| Uncontrolled + ref | File uploads, third-party integrations |
