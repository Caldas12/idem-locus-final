import { ref, computed } from 'vue'
import type { ZodSchema } from 'zod'
import { validateForm, getFieldError } from '~/utils/validation'

export function useFormValidation<T>(schema: ZodSchema<T>, initialData: T) {
  const formData = ref<T>(initialData)
  const errors = ref<Record<string, string>>({})
  const isSubmitting = ref(false)
  const submitSuccess = ref(false)

  const hasErrors = computed(() => Object.keys(errors.value).length > 0)
  const isValid = computed(() => !hasErrors.value)

  function validate() {
    const result = validateForm(schema, formData.value)
    if (result.success) {
      errors.value = {}
      return true
    } else {
      errors.value = result.errors || {}
      return false
    }
  }

  function clearErrors() {
    errors.value = {}
  }

  function setFieldError(fieldName: string, error: string) {
    errors.value[fieldName] = error
  }

  function getError(fieldName: string): string | undefined {
    return getFieldError(errors.value, fieldName)
  }

  function resetForm() {
    formData.value = initialData
    errors.value = {}
    submitSuccess.value = false
  }

  return {
    formData,
    errors,
    isSubmitting,
    submitSuccess,
    hasErrors,
    isValid,
    validate,
    clearErrors,
    setFieldError,
    getError,
    resetForm
  }
}

// Composable for async form submission
export function useAsyncFormSubmission() {
  const isLoading = ref(false)
  const errorMessage = ref('')
  const successMessage = ref('')

  async function submit<T>(submitFn: () => Promise<T>): Promise<T | null> {
    isLoading.value = true
    errorMessage.value = ''
    successMessage.value = ''

    try {
      const result = await submitFn()
      return result
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : 'Erro desconhecido'
      return null
    } finally {
      isLoading.value = false
    }
  }

  return {
    isLoading,
    errorMessage,
    successMessage,
    submit
  }
}
