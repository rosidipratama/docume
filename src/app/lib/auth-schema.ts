import { z } from "zod";
import { username } from "./auth";

export function credentialsSchema(mode: "login" | "signup") {
  return z.object({
    username,
    password: z.string().min(mode === "signup" ? 10 : 1).max(128),
  });
}
