export default defineAppConfig({
  ui: {
    primary: 'amber',
    gray: 'stone',
    container: {
      constrained: 'max-w-7xl' // Mantém o site centralizado e elegante
    },
    button: {
      rounded: 'rounded-full', // Botões em "pílula" são mais profissionais
      default: { size: 'md' }
    },
    card: {
      rounded: 'rounded-2xl',
      shadow: 'shadow-sm',
      background: 'bg-white dark:bg-stone-900'
    }
  }
})
