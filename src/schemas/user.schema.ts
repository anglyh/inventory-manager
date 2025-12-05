import { z } from "zod";

// ============================================
// SCHEMAS DE ENTRADA (validación con Zod)
// ============================================

export const createUserSchema = z.object({
  name: z.string().min(1, "Nombre requerido"),
  email: z.email("Email inválido"),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
});

export const loginSchema = z.object({
  email: z.email("Email inválido"),
  password: z.string().min(1, "Contraseña requerida"),
});

export const updateUserSchema = z.object({
  name: z.string().min(1, "Nombre requerido").optional(),
  email: z.email("Email inválido").optional(),
}).strict();

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Contraseña actual requerida"),
  newPassword: z.string().min(8, "La nueva contraseña debe tener al menos 8 caracteres"),
  confirmPassword: z.string(),
}).refine(
  (data) => data.newPassword === data.confirmPassword,
  {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  }
);

// ============================================
// TIPOS DE ENTRADA (inferidos de los schemas)
// ============================================

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

// ============================================
// TIPOS DE SALIDA (Response DTOs)
// ============================================

export interface UserResponse {
  id: string;
  name: string;
  email: string;
}

export interface AuthResponse {
  token: string;
  user: UserResponse;
}
