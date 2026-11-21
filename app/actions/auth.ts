"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

import {
  loginSchema,
  signupSchema,
  type AuthFormState,
} from "@/lib/auth/validation";
import { createServerClient } from "@/lib/supabase/server";

async function getAuthCallbackUrl() {
  const headerStore = await headers();
  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host") ?? "localhost:3000";
  const protocol = headerStore.get("x-forwarded-proto") ?? "http";
  return `${protocol}://${host}/auth/callback`;
}

export async function signup(
  _previousState: AuthFormState | undefined,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = signupSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return {
      message: "Please fix the highlighted fields.",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  const { name, email, password } = parsed.data;
  const supabase = await createServerClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: name },
      emailRedirectTo: await getAuthCallbackUrl(),
    },
  });

  if (error) {
    return { message: "We couldn't create that account. Check your details and try again." };
  }

  if (data.user?.identities?.length === 0) {
    return { message: "An account with that email already exists or is awaiting confirmation." };
  }

  if (!data.session) {
    return { message: "Account created. Check your email to confirm your address before logging in." };
  }

  revalidatePath("/", "layout");
  redirect("/");
}

export async function login(
  _previousState: AuthFormState | undefined,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { message: "Invalid email or password." };
  }

  const { email, password } = parsed.data;
  const supabase = await createServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.session) {
    return { message: "Invalid email or password." };
  }

  revalidatePath("/", "layout");
  redirect("/");
}

export async function logout() {
  const supabase = await createServerClient();
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error("Could not log out. Please try again.");
  revalidatePath("/", "layout");
  redirect("/login");
}
