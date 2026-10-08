import { z } from "zod";

export const createUserSchema = z.object({
  name: z.string('Nombre requerido').trim().min(1, 'Nombre requerido').max(50, 'Máximo 50 caracteres')
    .meta({ example: 'Juan Pérez' }),
  email: z.email('Email inválido').max(100).meta({ example: 'juan@example.com' }),
  password: z.string('Contraseña requerida')
  .min(12, 'La contraseña debe tener al menos 12 caracteres')
  .regex(/[A-Z]/, "Debe contener al menos una mayúscula")
  .meta({ writeOnly: true, example: 'Secret1234567' }),
});

/** Body for adding a worker to the current store; unknown fields are rejected. */
export const createStoreUserSchema = createUserSchema.strict();

export const loginSchema = z.object({
  email: z.email('Email inválido').meta({ example: 'juan@example.com' }),
  password: z.string('Contraseña requerida').min(1, 'Contraseña requerida').meta({ example: 'Secret1234567' }),
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

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

// Response schemas; .strict() documents additionalProperties: false.
export const storeUserSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  email: z.email(),
  role: z.enum(['ADMIN', 'GUEST']),
}).strict().meta({ id: 'StoreUser' });

export const authResponseSchema = z.object({
  token: z.string(),
  user: z.object({
    id: z.uuid(),
    name: z.string(),
    email: z.email(),
  }),
}).meta({ id: 'AuthResponse' });

export const authStatusResponseSchema = z.object({
  token: z.string(),
  user: z.object({
    userId: z.uuid(),
    storeId: z.uuid(),
    name: z.string(),
    email: z.email(),
    role: z.enum(['ADMIN', 'GUEST']),
    iat: z.number().int(),
    exp: z.number().int(),
  }),
}).meta({ id: 'AuthStatusResponse' });

export interface UserResponse {
  id: string;
  name: string;
  email: string;
}

export interface AuthResponse {
  token: string;
  user: UserResponse;
}
