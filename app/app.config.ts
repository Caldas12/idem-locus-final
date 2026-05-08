export default defineAppConfig({
  ui: {
    primary: 'amber',
    gray: 'stone',

    // Configuração global para grupos de formulário (Labels e espaçamento)
    formGroup: {
      wrapper: 'mb-5', // Adiciona margem inferior global a cada campo
      label: {
        base: 'block font-medium text-stone-700 mb-1.5' // Estilo e margem da etiqueta
      }
    },

    // Configuração global para as caixas de texto
    input: {
      default: {
        size: 'lg' // Aumenta a altura de todas as caixas de texto
      },
      rounded: 'rounded-lg'
    },

    // Configuração global para os botões
    button: {
      default: {
        size: 'lg',
        variant: 'solid',
        color: 'amber' // Garante que todos os botões não especificados adotam esta cor
      },
      rounded: 'rounded-lg'
    },

    // Configuração global para os cartões
    card: {
      rounded: 'rounded-2xl',
      shadow: 'shadow-sm',
      background: 'bg-white'
    }
  }
})
