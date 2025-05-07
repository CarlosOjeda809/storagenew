<script setup>

const client = useSupabaseClient();
const documentFile = ref('');
const isUploadingDocument = ref(false);
const documentUploadError = ref('');
const user = useSupabaseUser();
const userName = ref('');
const router = useRouter();
const arrayFiles = ref([])

const uploadDocument = async () => {
    if (!documentFile.value) {
        documentUploadError.value = 'selecciona un archivo.';
        return;
    }

    isUploadingDocument.value = true;
    documentUploadError.value = null;

    const userId = user.value?.id;

    if (!userId) {
        documentUploadError.value = 'Usuario no autenticado.';
        isUploadingDocument.value = false;
        return;
    }

    let storageName = '';
    const fileType = documentFile.value.type;
    const fileName = documentFile.value.name;
    const filePath = `${userId}/${fileName}`;

    const typeMap = {
        'image': 'images',
        'application': 'documents',
        'text': 'documents',
        'audio': 'audios',
        'video': 'videos'
    };

    storageName = typeMap[fileType.split('/')[0]];


    if (storageName === 'otros') {
        console.warn(`Tipo de archivo no reconocido: ${fileType}. Subiéndose al bucket 'otros'`);
    }


    if (storageName) {
        const { data, error } = await client
            .storage
            .from(storageName)
            .upload(filePath, documentFile.value, {
                cacheControl: '3600',
                upsert: false,
            });

        if (error) {
            console.error(`Error al subir el archivo a ${storageName}:`, error);
        } else {
            console.log(`Archivo subido con éxito a ${storageName}:`, data);
        }
    } else {
        documentUploadError.value = 'No se pudo determinar el bucket de destino para este tipo de archivo.';
        console.error('No se pudo determinar el bucket de destino para:', fileType);
    }

    isUploadingDocument.value = false;
    documentFile.value = null;
};

const handleDocumentUpload = async (event) => {

    documentFile.value = event.target.files[0];

};

const getUserName = async () => {
    if (user.value) {
        const { data, error } = await client
            .from('users')
            .select('nombre')
            .eq('id', user.value.id)
            .single();

        if (error) {
            console.error('Error al obtener el nombre del usuario:', error);
        } else {
            userName.value = data.nombre;
        }
    }
};

const logout = async () => {
    const { error } = await client.auth.signOut();
    if (error) {

        console.error('Error al cerrar sesión:', error);
    } else {
        userName.value = '';
    }
};

const listaArchivos = async (storageName) => {
    const { data, error } = await client
        .storage
        .from(storageName)
        .list();

    console.log(data)

    arrayFiles.value = data
};
console.log(arrayFiles)

onMounted(async () => {
    await getUserName();
    await listaArchivos("documents");
    
});



</script>

<template>
    <div class="flex flex-col bg-gradient-to-br from-pink-100 via-purple-200 to-indigo-200 min-h-screen">
        <nav
            class="text-pink-800 px-6 py-3 bg-gray-100/50 bg-opacity-75 backdrop-blur-sm flex justify-between items-center shadow-sm">
            <div class="p-2 rounded-lg">
                <h1 class="text-xl font-semibold text-pink-600">UPLOAD IT</h1>
            </div>
            <div class="space-x-3">
                <button v-if="!user" @click="navigateTo('/login')"
                    class="bg-pink-200 bg-opacity-50 py-1.5 cursor-pointer px-3 rounded-md font-medium text-pink-700 hover:bg-pink-300 hover:bg-opacity-75">
                    INICIAR SESIÓN
                </button>
                <button v-if="user" @click="navigateTo('/profile')"
                    class="bg-pink-200 bg-opacity-50 py-1.5 cursor-pointer px-3 rounded-md font-medium text-pink-700 hover:bg-pink-300 hover:bg-opacity-75">
                    {{ userName }}
                </button>
                <button v-if="user" @click="logout()"
                    class="bg-purple-200 bg-opacity-50 py-1.5 cursor-pointer px-3 rounded-md font-medium text-pink-700 hover:bg-purple-300 hover:bg-opacity-75">
                    CERRAR SESIÓN
                </button>
            </div>
        </nav>

        <main class="flex-grow container mx-auto p-4">
            <p>{{ arrayFiles.value }}</p>
            <h2 class="text-2xl font-semibold text-center py-6 text-gray-700">
                Gestiona tus archivos en el lugar correcto:
            </h2>

            <div class="grid  gap-6 mt-5">
                <div
                    class="bg-white bg-opacity-60 backdrop-blur-sm rounded-md shadow-sm p-4 flex flex-col justify-center items-center border border-gray-300">
                    <h3 class="font-semibold text-pink-700 mb-2 flex items-center">
                        Archivos
                        <Icon name="material-symbols:description" class="ml-2 text-pink-700 text-lg" />
                    </h3>
                    <p class="text-sm text-gray-600 text-center mb-2">Subir archivos (documentos, imágenes, videos, música, etc)</p>

                    <div class="flex flex-col items-center w-full">
                        <input type="file" class="hidden" id="document-upload" @change="handleDocumentUpload($event)" />
                        <label for="document-upload"
                            class="w-80 mt-2 p-2 bg-pink-300 text-pink-700 rounded-md cursor-pointer hover:bg-pink-400 text-center flex items-center justify-center space-x-2">
                            Seleccionar Archivo
                            <Icon name="material-symbols:upload-2" class="text-lg" />
                        </label>

                        <button @click="uploadDocument" :disabled="isUploadingDocument || !documentFile"
                            class="mt-2 p-2 w-60 bg-pink-500 cursor-pointer text-white rounded-md hover:bg-pink-600 disabled:bg-gray-400 disabled:cursor-not-allowed">
                            <span v-if="isUploadingDocument">Subiendo...</span>
                            <span v-else>Subir Documento</span>
                        </button>

                        <p v-if="documentUploadError" class="text-red-500 text-sm mt-2">{{ documentUploadError }}</p>
                    </div>
                </div>
            </div>
        </main>
    </div>
</template>