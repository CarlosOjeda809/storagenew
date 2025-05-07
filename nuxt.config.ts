// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  supabase: {
    redirectOptions: {
      login: '/login',
      callback: '/confirm',
      include: ['/profile'],
      exclude: undefined,
      saveRedirectToCookie: false,
    }

  },
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },
  modules: ['@nuxt/icon', '@nuxt/ui', '@nuxtjs/supabase'],
  css: ['~/assets/css/main.css']
})