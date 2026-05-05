// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@nuxt/ui',
    '@nuxtjs/supabase'
  ],

  supabase: {
      redirect: false
    },

  devtools: {
    enabled: true
  },

  colorMode: {
      preference: 'light',
      fallback: 'light',
      classSuffix: '' // Isto impede que o Nuxt adicione a classe .dark ao <html>
    },

  ui: {
      safelistColors: ['amber', 'stone']
    },

  css: ['~/assets/css/main.css'],

  routeRules: {
    '/': { prerender: true }
  },

  compatibilityDate: '2025-01-15',

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  }
})
