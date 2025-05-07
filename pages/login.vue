<script setup>
const client = useSupabaseClient()
const router = useRouter()
const emailData = ref('')
const contraseñaData = ref('')
const errorMsg = ref('')

const loginDatos = async () => {
    if (!emailData.value || !contraseñaData.value) {
        errorMsg.value = 'Rellena todos los campos';
        return false;
    }

    const { data, error } = await client.auth.signInWithPassword({
        email: emailData.value,
        password: contraseñaData.value,
    });

    if (error) {
        console.error('Error al iniciar sesión:', error);
        errorMsg.value = error.message;
        return false;
    }

    errorMsg.value = ''
    router.push('/')
}
</script>

<template>
    <div class="flex flex-col bg-gradient-to-br from-pink-100 via-purple-200 to-indigo-200 min-h-screen">
        <main class="flex-grow container mx-auto p-4 flex justify-center items-center flex-col">

            <div class="mb-4 text-center">
                <h1 class="text-4xl font-bold text-white drop-shadow-md">LOGIN</h1>
            </div>
            <div
                class="bg-white bg-opacity-60 backdrop-blur-sm rounded-md shadow-sm p-8 border border-gray-300 w-full max-w-md">
                <h2 class="text-2xl font-semibold text-center mb-6 text-pink-700">
                    Iniciar Sesión
                </h2>

                <form @submit.prevent="loginDatos" class="space-y-4">
                    <div>
                        <input v-model="emailData" type="email" placeholder="Email"
                            class="w-full p-3 bg-pink-50 rounded-md border border-pink-200 focus:outline-none focus:ring-2 focus:ring-pink-300 placeholder-pink-300 text-gray-700 md:p-4" />
                    </div>
                    <div>
                        <input v-model="contraseñaData" type="password" placeholder="Contraseña"
                            class="w-full p-3 bg-pink-50 rounded-md border border-pink-200 focus:outline-none focus:ring-2 focus:ring-pink-300 placeholder-pink-300 text-gray-700 md:p-4" />
                    </div>
                    <div>
                        <button type="submit"
                            class="w-full p-3 md:p-4 bg-pink-500 text-white font-semibold rounded-md hover:bg-pink-600 transition duration-300 cursor-pointer flex items-center justify-center">
                            INICIAR SESIÓN
                        </button>
                    </div>
                    <div class="text-center pt-2">
                        <p class="text-gray-600">¿No tienes cuenta?</p>
                        <a @click="navigateTo('/register')"
                            class="text-pink-700 font-semibold cursor-pointer hover:underline">
                            Crear una cuenta
                        </a>
                    </div>
                    <p v-if="errorMsg" class="text-center text-red-500 font-semibold mt-2">{{ errorMsg }}</p>
                </form>
            </div>
        </main>
    </div>
</template>