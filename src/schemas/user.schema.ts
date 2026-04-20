import { z } from "zod";

export const createUserSchema = z.object({
  name: z.string('Nombre requerido').min(1, 'Nombre requerido').max(50, 'Máximo 50 caracteres'),
  email: z.email('Email inválido'),
  password: z.string('Contraseña requerida').min(8, 'La contraseña debe tener al menos 8 caracteres'),
});

export const loginSchema = z.object({
  email: z.email('Email inválido'),
  password: z.string('Contraseña requerida').min(1, 'Contraseña requerida'),
});

export const updateUserSchema = z.object({
  name: z.string().min(1, 'Nombre requerido').max(50, 'Máximo 50 caracteres').optional(),
  email: z.email('Email inválido').optional(),
}).strict();

export const changePasswordSchema = z.object({
  currentPassword: z.string('Contraseña actual requerida').min(1, 'Contraseña actual requerida'),
  newPassword: z.string('Nueva contraseña requerida').min(8, 'La nueva contraseña debe tener al menos 8 caracteres'),
  confirmPassword: z.string('Confirmación de contraseña requerida'),
}).refine(
  (data) => data.newPassword === data.confirmPassword,
  {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  }
);

export type CreateUserInput = z.infer<typeof createUserSchema>;z
export type LoginInput = z.infer<typeof loginSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export interface UserResponse {
  id: string;
  name: string;
  email: string;
}

export interface AuthResponse {
  token: string;
  user: UserResponse;
}
