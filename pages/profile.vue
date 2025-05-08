<script setup>
const client = useSupabaseClient();
const user = useSupabaseUser();
const users = ref({}); 
const isLoading = ref(true);
const errorMsg = ref(null);

const userData = async () => {
    isLoading.value = true;
    errorMsg.value = null;
    try {
        const { data, error } = await client
            .from('users')
            .select('nombre, email')
            .eq('id', user.value?.id)
            .single();

        if (error) {
            console.error('Error al obtener datos del usuario:', error);
            errorMsg.value = 'Error al cargar la información del perfil.';
        } else {
            users.value = data;
        }
    } catch (error) {
        console.error('Error inesperado al obtener datos del usuario:', error);
        errorMsg.value = 'Ocurrió un error inesperado.';
    } finally {
        isLoading.value = false;
    }
};

onMounted(async () => {
    if (user.value?.id) {
        await userData();
    } else {
        isLoading.value = false;
        errorMsg.value = 'Usuario no autenticado.';
    }
});
</script>

<template>
  <div class="flex flex-col bg-gradient-to-br from-pink-100 via-purple-200 to-indigo-200 min-h-screen">
    <nav class="text-pink-800 px-6 py-3 bg-gray-100/50 bg-opacity-75 backdrop-blur-sm flex justify-between items-center shadow-sm">
      <div class="p-2 rounded-lg">
        <h1 class="text-xl font-semibold text-pink-600">UPLOAD IT</h1>
      </div>
      <div class="space-x-3">
        <button @click="navigateTo('/')"
          class="bg-pink-200 bg-opacity-50 py-1.5 cursor-pointer px-3 rounded-md font-medium text-pink-700 hover:bg-pink-300 hover:bg-opacity-75">
          INICIO
        </button>
        <button @click="client.auth.signOut(); navigateTo('/login')"
          class="bg-purple-200 bg-opacity-50 py-1.5 cursor-pointer px-3 rounded-md font-medium text-pink-700 hover:bg-purple-300 hover:bg-opacity-75">
          CERRAR SESIÓN
        </button>
      </div>
    </nav>

    <main class="flex-grow container mx-auto p-4 flex flex-col items-center">
      <div class="mb-4 text-center">
        <h1 class="text-4xl font-bold text-white drop-shadow-md">PERFIL</h1>
        <p class="text-lg text-white mt-1 opacity-90">Tu información personal</p>
      </div>
      
      
      <div v-if="isLoading" class="bg-white bg-opacity-60 backdrop-blur-sm rounded-md shadow-sm p-8 border border-gray-300 w-full max-w-md md:max-w-lg text-center py-10">
        <div class="flex justify-center">
          <div class="h-12 w-12 border-4 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
        <p class="mt-4 text-pink-700">Cargando tu perfil...</p>
      </div>
      <div v-else-if="errorMsg" class="bg-white bg-opacity-60 backdrop-blur-sm rounded-md shadow-sm p-8 border border-red-200 w-full max-w-md md:max-w-lg">
        <div class="bg-red-100 text-red-700 px-4 py-3 rounded-lg text-center">
          {{ errorMsg }}
        </div>
        <div class="mt-4 text-center">
          <button @click="navigateTo('/login')" 
            class="mt-2 p-3 bg-pink-500 text-white font-semibold rounded-md hover:bg-pink-600 transition duration-300">
            Ir a Login
          </button>
        </div>
      </div>

      <div v-else-if="user" class="bg-white bg-opacity-60 backdrop-blur-sm rounded-md shadow-sm p-8 border border-gray-300 w-full max-w-md md:max-w-lg">
        <h2 class="text-2xl font-semibold text-center mb-6 text-pink-700">
          Información Personal
        </h2>
        
        <div class="space-y-6">
          <div class="bg-pink-50 rounded-lg p-4 border border-pink-200">
            <div class="text-gray-600 mb-1 font-medium">Nombre:</div>
            <div class="text-pink-800 font-semibold text-lg">{{ users?.nombre || 'No especificado' }}</div>
          </div>
          
          <div class="bg-pink-50 rounded-lg p-4 border border-pink-200">
            <div class="text-gray-600 mb-1 font-medium">Email:</div>
            <div class="text-pink-800">{{ users?.email || 'No especificado' }}</div>
          </div>
          
          <div class="mt-6 text-center">
            <button @click="navigateTo('/')" 
              class="w-full p-3 md:p-4 bg-pink-500 text-white font-semibold rounded-md hover:bg-pink-600 transition duration-300 cursor-pointer flex items-center justify-center">
              IR A INICIO
            </button>
          </div>
        </div>
      </div>
      
      <div v-else class="bg-white bg-opacity-60 backdrop-blur-sm rounded-md shadow-sm p-8 border border-gray-300 w-full max-w-md md:max-w-lg text-center">
        <p class="text-pink-700 mb-4">No estás autenticado.</p>
        <button @click="navigateTo('/login')" 
          class="p-3 bg-pink-500 text-white font-semibold rounded-md hover:bg-pink-600 transition duration-300">
          Ir a Login
        </button>
      </div>
    </main>
  </div>
</template>