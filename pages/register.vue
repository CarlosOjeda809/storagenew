<script setup>
const client = useSupabaseClient();
const errorMsg = ref('');
const users = ref([]);
const nombreData = ref('');
const emailData = ref('');
const contraseñaData = ref('');
const newContraseñaData = ref('');

const signup = async (nombre, email, contraseña, repetirContraseña) => {
    if (!nombre?.trim() || !email?.trim() || !contraseña?.trim() || !repetirContraseña?.trim()) {
        errorMsg.value = 'Rellena todos los campos';
        return false;
    }

    if (contraseña !== repetirContraseña) {
        errorMsg.value = 'Las contraseñas no coinciden';
        return false;
    }

    const { data, error: authError } = await client.auth.signUp({
        email: email,
        password: contraseña,
    });

    if (authError) {
        console.error('Error al registrarse en Supabase', authError);
        errorMsg.value = authError.message;
        return false;
    }

    const userId = data.user?.id;

    if (!userId) {
        errorMsg.value = 'No se ha podido obtener el ID del usuario';
        return false;
    }

    const { error: insertError } = await client.from('users').insert([
        {
            id: userId,
            nombre: nombre,
            email: email,
        },
    ]);

    if (insertError) {
        console.error(insertError);
        errorMsg.value = insertError.message;
        return false;
    }

    errorMsg.value = 'Te has registrado con éxito. Revisa tu correo para verificar tu cuenta.';
    nombreData.value = '';
    emailData.value = '';
    contraseñaData.value = '';
    newContraseñaData.value = '';
    return true;
};

const mostrarDatos = async () => {
    const { data, error } = await client.from('users').select()
    users.value = data
};
</script>

<template>
  <div class="flex flex-col bg-gradient-to-br from-pink-100 via-purple-200 to-indigo-200 min-h-screen">
    
    <main class="flex-grow container mx-auto p-4 flex flex-col justify-center items-center">
      <!-- Título REGISTRO fuera de la tarjeta -->
      <div class="mb-4 text-center">
        <h1 class="text-4xl font-bold text-white drop-shadow-md">REGISTRO</h1>
      </div>
      
      <!-- Tarjeta de registro con tamaño responsivo -->
      <div class="bg-white bg-opacity-60 backdrop-blur-sm rounded-md shadow-sm p-8 border border-gray-300 w-full max-w-md md:max-w-lg">
        <h2 class="text-2xl font-semibold text-center mb-6 text-pink-700">
          Crear Cuenta
        </h2>

        <form @submit.prevent="signup(nombreData, emailData, contraseñaData, newContraseñaData)" class="space-y-5">
          <div>
            <input v-model="nombreData" type="text" placeholder="Nombre"
              class="w-full p-3 md:p-4 bg-pink-50 rounded-md border border-pink-200 focus:outline-none focus:ring-2 focus:ring-pink-300 placeholder-pink-300 text-gray-700" />
          </div>
          <div>
            <input v-model="emailData" type="email" placeholder="Email"
              class="w-full p-3 md:p-4 bg-pink-50 rounded-md border border-pink-200 focus:outline-none focus:ring-2 focus:ring-pink-300 placeholder-pink-300 text-gray-700" />
          </div>
          <div>
            <input v-model="contraseñaData" type="password" placeholder="Contraseña"
              class="w-full p-3 md:p-4 bg-pink-50 rounded-md border border-pink-200 focus:outline-none focus:ring-2 focus:ring-pink-300 placeholder-pink-300 text-gray-700" />
          </div>
          <div>
            <input v-model="newContraseñaData" type="password" placeholder="Repetir Contraseña"
              class="w-full p-3 md:p-4 bg-pink-50 rounded-md border border-pink-200 focus:outline-none focus:ring-2 focus:ring-pink-300 placeholder-pink-300 text-gray-700" />
          </div>
          <div>
            <button type="submit"
              class="w-full p-3 md:p-4 bg-pink-500 text-white font-semibold rounded-md hover:bg-pink-600 transition duration-300 cursor-pointer flex items-center justify-center">
              REGISTRARSE
            </button>
          </div>
          <div>
            <button @click="navigateTo('/login')"
              class="w-full p-3 md:p-4 bg-purple-400 text-white font-semibold rounded-md hover:bg-purple-500 transition duration-300 cursor-pointer flex items-center justify-center">
              IR A LOGIN
            </button>
          </div>
          <div class="text-center pt-2" v-if="errorMsg">
            <p class="text-red-500 font-semibold mt-2">{{ errorMsg }}</p>
          </div>
        </form>
      </div>
    </main>
  </div>
</template>