<script setup>
const client = useSupabaseClient();
const user = useSupabaseUser();
const users = ref([]); 
const isLoading = ref(true);
const errorMsg = ref(null);

const userData = async () => {
    isLoading.value = true;
    errorMsg.value = null;
    try {
        const { data, error } = await client
            .from('users')
            .select('nombre', 'email')
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
    <div class="bg-gradient-to-br from-gray-50 to-blue-50 min-h-screen py-10 px-4 sm:px-6 lg:px-8">
        <div class="max-w-4xl mx-auto">
            <div class="text-center mb-10">
                <h1 class="text-4xl font-bold text-gray-900 mt-5">Mi Perfil</h1>
                <p class="text-lg text-gray-500 mt-1">Tu información personal y contenido creado.</p>
            </div>

            <div v-if="isLoading" class="text-center py-20 spinner">
                
                <p class="mt-3 text-gray-500">Cargando tu perfil...</p>
            </div>

            <div v-else-if="errorMsg"
                class="bg-red-100 border border-red-300 text-red-700 px-4 py-3 rounded-lg text-center">
                {{ errorMsg }}
            </div>

            <div v-else-if="user">
                <div class="bg-white rounded-xl shadow-lg p-6 md:p-8 mb-8 border-t-4 border-blue-900">
                    <h2 class="text-2xl font-semibold text-gray-800 mb-5 flex items-center">
                        <Icon name="material-symbols:person-outline-rounded" class="w-7 h-7 mr-2 text-blue-900" />
                        Información Personal
                    </h2>
                    <div class="space-y-3">
                        <div class="flex items-center">
                            <span class="font-medium text-gray-600 w-24">Nombre:</span>
                            <span class="text-gray-800 font-semibold text-lg">{{ users?.nombre || 'No especificado' }}</span>
                        </div>
                        <div class="flex items-center">
                            <span class="font-medium text-gray-600 w-24">Email:</span>
                            <span class="text-gray-700">{{ users?.email || 'No especificado' }}</span>
                        </div>
                    </div>
                </div>
            </div>
            <div v-else>
                <p class="text-center text-gray-500">No estás autenticado.</p>
            </div>
        </div>
    </div>
</template>