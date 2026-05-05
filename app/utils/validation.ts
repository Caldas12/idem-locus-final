import { z } from 'zod'

// ============================================================================
// User & Profile Validation
// ============================================================================

export const loginSchema = z.object({
  email: z
    .string()
    .email('Email inválido')
    .min(1, 'Email é obrigatório'),
  password: z
    .string()
    .min(6, 'Palavra-passe deve ter pelo menos 6 caracteres')
    .min(1, 'Palavra-passe é obrigatória')
})

export type LoginForm = z.infer<typeof loginSchema>

export const registerSchema = z.object({
  email: z
    .string()
    .email('Email inválido')
    .min(1, 'Email é obrigatório'),
  password: z
    .string()
    .min(8, 'Palavra-passe deve ter pelo menos 8 caracteres'),
  confirmPassword: z
    .string()
    .min(1, 'Confirmação é obrigatória')
}).refine(data => data.password === data.confirmPassword, {
  message: 'Palavras-passe não correspondem',
  path: ['confirmPassword']
})

export type RegisterForm = z.infer<typeof registerSchema>

export const profileSchema = z.object({
  name: z
    .string()
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(100, 'Nome deve ter menos de 100 caracteres')
    .optional()
    .or(z.literal('')),
  location: z
    .string()
    .max(200, 'Localização deve ter menos de 200 caracteres')
    .optional()
    .or(z.literal('')),
  accountType: z
    .enum(['personal', 'business', 'pickup_point'])
    .default('personal')
})

export type ProfileForm = z.infer<typeof profileSchema>

// ============================================================================
// Product Validation
// ============================================================================

export const productSchema = z.object({
  title: z
    .string()
    .min(3, 'Título deve ter pelo menos 3 caracteres')
    .max(200, 'Título deve ter menos de 200 caracteres')
    .min(1, 'Título é obrigatório'),
  description: z
    .string()
    .max(2000, 'Descrição deve ter menos de 2000 caracteres')
    .optional()
    .or(z.literal('')),
  categoryId: z
    .number()
    .min(1, 'Categoria é obrigatória'),
  condition: z
    .enum(['Maduro', 'Fresco', 'Defeito Visual', 'Próximo da validade', 'Embalado'])
    .default('Fresco'),
  type: z
    .enum(['Donativo', 'Troca Direta', 'Preço Simbólico'])
    .default('Troca Direta'),
  status: z
    .enum(['Disponível', 'Indisponível', 'Esgotado'])
    .default('Disponível'),
  expiresAt: z
    .string()
    .optional()
    .or(z.literal('')),
  isSurpriseBasket: z
    .boolean()
    .default(false)
})

export type ProductForm = z.infer<typeof productSchema>

// ============================================================================
// Conversation & Proposal Validation
// ============================================================================

export const messageSchema = z.object({
  body: z
    .string()
    .min(1, 'Mensagem não pode estar vazia')
    .max(5000, 'Mensagem deve ter menos de 5000 caracteres')
})

export type MessageForm = z.infer<typeof messageSchema>

export const proposalSchema = z.object({
  pickupPointId: z
    .number()
    .optional(),
  pickupStatus: z
    .enum(['pending', 'ready', 'in_transit', 'delivered', 'cancelled'])
    .default('pending')
})

export type ProposalForm = z.infer<typeof proposalSchema>

// ============================================================================
// Pickup Point Validation
// ============================================================================

export const pickupPointSchema = z.object({
  name: z
    .string()
    .min(3, 'Nome deve ter pelo menos 3 caracteres')
    .max(200, 'Nome deve ter menos de 200 caracteres')
    .min(1, 'Nome é obrigatório'),
  address: z
    .string()
    .min(5, 'Endereço deve ter pelo menos 5 caracteres')
    .max(500, 'Endereço deve ter menos de 500 caracteres')
    .optional()
    .or(z.literal('')),
})

export type PickupPointForm = z.infer<typeof pickupPointSchema>

// ============================================================================
// Review Validation
// ============================================================================

export const reviewSchema = z.object({
  rating: z
    .number()
    .min(1, 'Pontuação deve ser entre 1 e 5')
    .max(5, 'Pontuação deve ser entre 1 e 5')
    .default(5),
  comment: z
    .string()
    .max(1000, 'Comentário deve ter menos de 1000 caracteres')
    .optional()
    .or(z.literal(''))
})

export type ReviewForm = z.infer<typeof reviewSchema>

// ============================================================================
// Alert Validation
// ============================================================================

export const alertSchema = z.object({
  keyword: z
    .string()
    .max(200, 'Palavra-chave deve ter menos de 200 caracteres')
    .optional()
    .or(z.literal('')),
  categoryId: z
    .number()
    .optional(),
  radiusKm: z
    .number()
    .min(1, 'Raio deve ser pelo menos 1 km')
    .max(1000, 'Raio deve ser menos de 1000 km')
    .optional()
})

export type AlertForm = z.infer<typeof alertSchema>

// ============================================================================
// Utility Functions
// ============================================================================

export function validateForm<T>(schema: z.ZodSchema<T>, data: unknown): { success: boolean, data?: T, errors?: Record<string, string> } {
  try {
    const validated = schema.parse(data)
    return { success: true, data: validated }
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      const errors: Record<string, string> = {}
      error.issues.forEach((err: z.ZodIssue) => {
        const path = err.path.join('.')
        errors[path] = err.message
      })
      return { success: false, errors }
    }
    return { success: false, errors: { _root: 'Erro ao validar' } }
  }
}

export function getFieldError(errors: Record<string, string> | undefined, fieldName: string): string | undefined {
  if (!errors) return undefined
  return errors[fieldName]
}
