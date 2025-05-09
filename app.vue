<script setup>

import Navbar from './pages/navbar.vue';
import authHandler from '@/composables/oauthHandler'

const router = useRouter()
router.beforeEach(async (to, from) => {
  await authHandler(to, from)
})

</script>

<template>
  <Navbar />
  <div> 
    <NuxtPage />
  </div>
</template>
