---
description: When the user asks about Next.js Server Actions, form actions, useActionState, useFormStatus, optimistic updates, useOptimistic, server-side mutations, form handling in Next.js, or revalidation after mutation
---

# Server Actions Patterns

Handle mutations in Next.js with Server Actions — form handling, validation, optimistic updates, error handling, and cache invalidation.

## Basic Server Action

```tsx
// app/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

const createPostSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  content: z.string().min(10, "Content must be at least 10 characters"),
  published: z.coerce.boolean().default(false),
});

export async function createPost(formData: FormData) {
  // Validate
  const parsed = createPostSchema.safeParse({
    title: formData.get("title"),
    content: formData.get("content"),
    published: formData.get("published"),
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  // Mutate
  await db.post.create({ data: parsed.data });

  // Revalidate
  revalidatePath("/posts");
}
```

```tsx
// app/posts/new/page.tsx — Simple form with action
import { createPost } from "@/app/actions";

export default function NewPostPage() {
  return (
    <form action={createPost}>
      <input name="title" placeholder="Post title" required />
      <textarea name="content" placeholder="Write your post..." required />
      <label>
        <input type="checkbox" name="published" /> Publish immediately
      </label>
      <button type="submit">Create Post</button>
    </form>
  );
}
```

## useActionState (Form State + Validation Errors)

```tsx
// app/actions.ts
"use server";

export type ActionState = {
  errors?: Record<string, string[]>;
  message?: string;
  success?: boolean;
};

export async function createPost(
  prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = createPostSchema.safeParse({
    title: formData.get("title"),
    content: formData.get("content"),
  });

  if (!parsed.success) {
    return {
      errors: parsed.error.flatten().fieldErrors,
      message: "Validation failed",
      success: false,
    };
  }

  try {
    await db.post.create({ data: parsed.data });
    revalidatePath("/posts");
    return { message: "Post created!", success: true };
  } catch {
    return { message: "Failed to create post", success: false };
  }
}
```

```tsx
// app/posts/new/page.tsx
"use client";

import { useActionState } from "react";
import { createPost, type ActionState } from "@/app/actions";

const initialState: ActionState = {};

export default function NewPostForm() {
  const [state, formAction, isPending] = useActionState(createPost, initialState);

  return (
    <form action={formAction}>
      <div>
        <label htmlFor="title">Title</label>
        <input id="title" name="title" disabled={isPending} />
        {state.errors?.title && (
          <p className="text-red-500 text-sm">{state.errors.title[0]}</p>
        )}
      </div>

      <div>
        <label htmlFor="content">Content</label>
        <textarea id="content" name="content" disabled={isPending} />
        {state.errors?.content && (
          <p className="text-red-500 text-sm">{state.errors.content[0]}</p>
        )}
      </div>

      <SubmitButton />

      {state.message && (
        <p className={state.success ? "text-green-600" : "text-red-600"}>
          {state.message}
        </p>
      )}
    </form>
  );
}
```

## useFormStatus (Submit Button State)

```tsx
"use client";

import { useFormStatus } from "react-dom";

export function SubmitButton({ label = "Submit" }: { label?: string }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
    >
      {pending ? "Saving..." : label}
    </button>
  );
}

// ⚠️ useFormStatus must be used INSIDE the <form>, not on the form itself
// It reads the status of the parent <form>
```

## Optimistic Updates (useOptimistic)

```tsx
"use client";

import { useOptimistic, useRef } from "react";
import { addComment } from "@/app/actions";

interface Comment {
  id: string;
  text: string;
  author: string;
  pending?: boolean;
}

export function CommentList({
  comments,
  postId,
}: {
  comments: Comment[];
  postId: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);

  const [optimisticComments, addOptimisticComment] = useOptimistic(
    comments,
    (state: Comment[], newComment: Comment) => [
      ...state,
      { ...newComment, pending: true },
    ]
  );

  async function handleSubmit(formData: FormData) {
    const text = formData.get("text") as string;

    // Optimistic update — show immediately
    addOptimisticComment({
      id: `temp-${Date.now()}`,
      text,
      author: "You",
      pending: true,
    });

    formRef.current?.reset();

    // Server action — persists the data
    await addComment(postId, formData);
  }

  return (
    <div>
      <ul>
        {optimisticComments.map((comment) => (
          <li
            key={comment.id}
            className={comment.pending ? "opacity-50" : ""}
          >
            <strong>{comment.author}:</strong> {comment.text}
            {comment.pending && <span className="ml-2 text-sm">Sending...</span>}
          </li>
        ))}
      </ul>

      <form ref={formRef} action={handleSubmit}>
        <input name="text" placeholder="Add a comment..." required />
        <SubmitButton label="Post" />
      </form>
    </div>
  );
}
```

## Server Action with Redirect

```tsx
"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function createProject(formData: FormData) {
  const data = projectSchema.parse({
    name: formData.get("name"),
    description: formData.get("description"),
  });

  const project = await db.project.create({ data });

  revalidatePath("/projects");
  redirect(`/projects/${project.id}`); // Navigate after mutation
}
```

## Delete with Confirmation

```tsx
"use client";

import { deletePost } from "@/app/actions";
import { useTransition } from "react";

export function DeleteButton({ postId }: { postId: string }) {
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (!confirm("Are you sure you want to delete this post?")) return;

    startTransition(async () => {
      await deletePost(postId);
    });
  }

  return (
    <button
      onClick={handleDelete}
      disabled={isPending}
      className="text-red-600 hover:text-red-800 disabled:opacity-50"
    >
      {isPending ? "Deleting..." : "Delete"}
    </button>
  );
}
```

```tsx
// app/actions.ts
"use server";

export async function deletePost(postId: string) {
  // Authorize
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  const post = await db.post.findUnique({ where: { id: postId } });
  if (!post) throw new Error("Not found");

  if (post.authorId !== session.userId && session.role !== "admin") {
    throw new Error("Forbidden");
  }

  await db.post.delete({ where: { id: postId } });
  revalidatePath("/posts");
}
```

## Server Action Security

```tsx
"use server";

// ✅ ALWAYS validate inputs — Server Actions are public HTTP endpoints!
export async function updateProfile(formData: FormData) {
  // 1. Authenticate
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  // 2. Validate input
  const parsed = updateProfileSchema.safeParse({
    name: formData.get("name"),
    bio: formData.get("bio"),
  });
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  // 3. Authorize (user can only update their own profile)
  // Don't trust a userId from the form — use the session
  await db.user.update({
    where: { id: session.userId }, // ← From session, not form
    data: parsed.data,
  });

  revalidatePath(`/profile/${session.userId}`);
  return { success: true };
}

// ❌ NEVER trust client-provided IDs for authorization
export async function updateUser(formData: FormData) {
  const userId = formData.get("userId"); // ❌ User could set any ID!
  await db.user.update({ where: { id: userId }, data: { role: "admin" } });
}
```

## Inline Server Actions

```tsx
// Define actions directly in Server Components (no separate file needed)
export default async function TodoList() {
  const todos = await getTodos();

  async function addTodo(formData: FormData) {
    "use server";
    const text = formData.get("text") as string;
    await db.todo.create({ data: { text } });
    revalidatePath("/todos");
  }

  async function toggleTodo(id: string) {
    "use server";
    const todo = await db.todo.findUnique({ where: { id } });
    await db.todo.update({
      where: { id },
      data: { completed: !todo?.completed },
    });
    revalidatePath("/todos");
  }

  return (
    <div>
      <form action={addTodo}>
        <input name="text" placeholder="New todo..." />
        <button type="submit">Add</button>
      </form>
      <ul>
        {todos.map((todo) => (
          <li key={todo.id}>
            <form action={toggleTodo.bind(null, todo.id)}>
              <button type="submit">{todo.completed ? "✅" : "⬜"}</button>
            </form>
            {todo.text}
          </li>
        ))}
      </ul>
    </div>
  );
}
```
