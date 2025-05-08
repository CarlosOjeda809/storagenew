<script setup>

const client = useSupabaseClient();
const documentFile = ref('');
const isUploadingDocument = ref(false);
const documentUploadError = ref('');
const user = useSupabaseUser();
const userName = ref('');
const router = useRouter();
const loadingFiles = ref(false);
const fileTypes = [
    { name: 'Documentos', value: 'documents', icon: 'material-symbols:description' },
    { name: 'Imágenes', value: 'images', icon: 'material-symbols:image' },
    { name: 'Audios', value: 'audios', icon: 'material-symbols:audio-file' },
    { name: 'Videos', value: 'videos', icon: 'material-symbols:video-file' },
];
const fileCategories = ref({
    documents: [],
    images: [],
    audios: [],
    videos: []
});
const previewFile = ref(null);
const showPreview = ref(false);

const uploadDocument = async () => {
    if (!documentFile.value) {
        documentUploadError.value = 'Por favor, selecciona un archivo.';
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

    if (!storageName) {
        documentUploadError.value = 'No se pudo determinar la categoría del archivo.';
        isUploadingDocument.value = false;
        console.error(`Tipo de archivo no reconocido: ${fileType}`);
        return;
    }

    const { data, error } = await client
        .storage
        .from(storageName)
        .upload(filePath, documentFile.value, {
            cacheControl: '3600',
            upsert: false,
        });

    if (error) {
        console.error(`Error al subir el archivo a ${storageName}:`, error);
        documentUploadError.value = `Error al subir el archivo: ${error.message}`;
    } else {
        console.log(`Archivo subido con éxito a ${storageName}:`, data);
        await listUserFiles();
    }

    isUploadingDocument.value = false;
    documentFile.value = null;
};

const handleDocumentUpload = (event) => {
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

const getFileType = (fileName) => {
    const extension = fileName.split('.').pop().toLowerCase();
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'];
    const audioExtensions = ['mp3', 'wav', 'ogg', 'aac', 'm4a'];
    const videoExtensions = ['mp4', 'webm', 'mov', 'avi', 'mkv'];
    
    if (imageExtensions.includes(extension)) return 'image';
    if (audioExtensions.includes(extension)) return 'audio';
    if (videoExtensions.includes(extension)) return 'video';
    return 'document';
};

const listUserFiles = async () => {
    loadingFiles.value = true;
    // Resetear todas las categorías
    fileCategories.value = {
        documents: [],
        images: [],
        audios: [],
        videos: []
    };
    
    const userId = user.value?.id;

    if (userId) {
        // Cargar todos los tipos de archivos simultáneamente
        await Promise.all(fileTypes.map(async (fileType) => {
            const { data, error } = await client
                .storage
                .from(fileType.value)
                .list(`${userId}/`);

            if (error) {
                console.error(`Error al listar archivos de ${fileType.value}:`, error);
            } else if (data && data.length > 0) {
                const filesWithUrls = await Promise.all(data.map(async (file) => {
                    const { data: urlData } = client
                        .storage
                        .from(fileType.value)
                        .getPublicUrl(`${userId}/${file.name}`);
                    
                    const detectedType = getFileType(file.name);
                    
                    return { 
                        ...file, 
                        url: urlData.publicUrl,
                        type: detectedType,
                        category: fileType.value
                    };
                }));
                
                // Asignar archivos a su categoría correspondiente
                fileCategories.value[fileType.value] = filesWithUrls;
            }
        }));
    } else {
        console.warn('Usuario no autenticado, no se pueden listar los archivos.');
    }
    
    loadingFiles.value = false;
};

const openPreview = (file) => {
    previewFile.value = file;
    showPreview.value = true;
};

const closePreview = () => {
    showPreview.value = false;
    previewFile.value = null;
};

onMounted(async () => {
    await getUserName();
    if (user.value) {
        await listUserFiles();
    }
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
            <h2 class="text-2xl font-semibold text-center py-6 text-gray-700">
                Gestiona tus archivos en el lugar correcto:
            </h2>

            <div class="grid gap-6 mt-5">
                <div
                    class="bg-white bg-opacity-60 backdrop-blur-sm rounded-md shadow-sm p-4 flex flex-col justify-center items-center border border-gray-300">
                    <h3 class="font-semibold text-pink-700 mb-2 flex items-center">
                        Subir Archivo
                        <Icon name="material-symbols:upload-file" class="ml-2 text-pink-700 text-lg" />
                    </h3>
                    <p class="text-sm text-gray-600 text-center mb-2">Selecciona el archivo que deseas subir.</p>

                    <div class="flex flex-col items-center w-full">
                        <input type="file" class="hidden" id="document-upload" @change="handleDocumentUpload($event)" />
                        <label for="document-upload"
                            class="w-80 mt-2 p-2 bg-pink-300 text-pink-700 rounded-md cursor-pointer hover:bg-pink-400 text-center flex items-center justify-center space-x-2">
                            Seleccionar Archivo
                            <Icon name="material-symbols:attach-file" class="text-lg" />
                        </label>
                        <button @click="uploadDocument" :disabled="isUploadingDocument || !documentFile"
                            class="mt-2 p-2 w-60 bg-pink-500 cursor-pointer text-white rounded-md hover:bg-pink-600 disabled:bg-gray-400 disabled:cursor-not-allowed">
                            <span v-if="isUploadingDocument">Subiendo...</span>
                            <span v-else>Subir Archivo</span>
                        </button>
                        <p v-if="documentUploadError" class="text-red-500 text-sm mt-2">{{ documentUploadError }}</p>
                    </div>
                </div>

                <div v-if="user" class="mb-6">
                    <h2 class="text-xl font-semibold text-gray-700 mb-4 flex items-center">
                        Tus Archivos Subidos
                        <Icon name="material-symbols:folder-open" class="ml-2 text-gray-700 text-lg" />
                    </h2>
                   
                    <div v-if="loadingFiles" class="text-center text-gray-500 py-4 bg-white bg-opacity-60 backdrop-blur-sm rounded-md shadow-sm p-4 border border-gray-300">
                        Cargando archivos...
                    </div>
                   
                    <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div class="bg-white bg-opacity-60 backdrop-blur-sm rounded-md shadow-sm p-8 border border-gray-300">
                            <div class="flex items-center mb-3">
                                <Icon :name="fileTypes[0].icon" class="text-pink-700 text-xl mr-2" />
                                <h3 class="font-semibold text-pink-700">{{ fileTypes[0].name }}</h3>
                            </div>
                            
                            <div v-if="fileCategories.documents.length > 0">
                                <ul class="list-none pl-0">
                                    <li v-for="file in fileCategories.documents" :key="file.name"
                                        class="py-3 border-b border-gray-200 last:border-b-0">
                                        <div class="flex justify-between items-center">
                                            <span class="text-gray-700 font-medium truncate max-w-xs">{{ file.name }}</span>
                                            <div>
                                                <a :href="file.url" target="_blank" download
                                                    class="text-pink-600 hover:text-pink-800 font-medium flex items-center">
                                                    <Icon name="material-symbols:download" class="inline-block mr-1 text-lg" />
                                                    Descargar
                                                </a>
                                            </div>
                                        </div>
                                    </li>
                                </ul>
                            </div>
                            <div v-else class="text-center text-gray-500 py-4">
                                No has subido documentos aún.
                            </div>
                        </div>

                        
                        <div class="bg-white bg-opacity-60 backdrop-blur-sm rounded-md shadow-sm p-8 border border-gray-300">
                            <div class="flex items-center mb-3">
                                <Icon :name="fileTypes[1].icon" class="text-purple-700 text-xl mr-2" />
                                <h3 class="font-semibold text-purple-700">{{ fileTypes[1].name }}</h3>
                            </div>
                            
                            <div v-if="fileCategories.images.length > 0">
                                <ul class="list-none pl-0">
                                    <li v-for="file in fileCategories.images" :key="file.name"
                                        class="py-3 border-b border-gray-200 last:border-b-0">
                                        <div class="flex justify-between items-center mb-2">
                                            <span class="text-gray-700 font-medium truncate max-w-xs">{{ file.name }}</span>
                                            <div class="flex space-x-2">
                                                <button @click="openPreview(file)"
                                                    class="text-purple-600 hover:text-purple-800 font-medium flex items-center">
                                                    <Icon name="material-symbols:preview" class="inline-block mr-1 text-lg" />
                                                    Ver
                                                </button>
                                                <a :href="file.url" target="_blank" download
                                                    class="text-pink-600 hover:text-pink-800 font-medium flex items-center">
                                                    <Icon name="material-symbols:download" class="inline-block mr-1 text-lg" />
                                                    Descargar
                                                </a>
                                            </div>
                                        </div>
                                        
                                        <div class="mt-2">
                                            <img :src="file.url" alt="Miniatura" class="h-20 object-contain rounded-md shadow-md cursor-pointer" @click="openPreview(file)" />
                                        </div>
                                    </li>
                                </ul>
                            </div>
                            <div v-else class="text-center text-gray-500 py-4">
                                No has subido imágenes aún.
                            </div>
                        </div>

                        <div class="bg-white bg-opacity-60 backdrop-blur-sm rounded-md shadow-sm p-8 border border-gray-300">
                            <div class="flex items-center mb-3">
                                <Icon :name="fileTypes[2].icon" class="text-indigo-700 text-xl mr-2" />
                                <h3 class="font-semibold text-indigo-700">{{ fileTypes[2].name }}</h3>
                            </div>
                            
                            <div v-if="fileCategories.audios.length > 0">
                                <ul class="list-none pl-0">
                                    <li v-for="file in fileCategories.audios" :key="file.name"
                                        class="py-3 border-b border-gray-200 last:border-b-0">
                                        <div class="flex justify-between items-center mb-2">
                                            <span class="text-gray-700 font-medium truncate max-w-xs">{{ file.name }}</span>
                                            <div class="flex space-x-2">
                                                <button @click="openPreview(file)"
                                                    class="text-indigo-600 hover:text-indigo-800 font-medium flex items-center">
                                                    <Icon name="material-symbols:preview" class="inline-block mr-1 text-lg" />
                                                    Reproducir
                                                </button>
                                                <a :href="file.url" target="_blank" download
                                                    class="text-pink-600 hover:text-pink-800 font-medium flex items-center">
                                                    <Icon name="material-symbols:download" class="inline-block mr-1 text-lg" />
                                                    Descargar
                                                </a>
                                            </div>
                                        </div>
                                        
                                        <div class="mt-2">
                                            <audio controls class="w-full h-8">
                                                <source :src="file.url" type="audio/mpeg">
                                                Tu navegador no soporta la reproducción de audio.
                                            </audio>
                                        </div>
                                    </li>
                                </ul>
                            </div>
                            <div v-else class="text-center text-gray-500 py-4">
                                No has subido audios aún.
                            </div>
                        </div>

                        <div class="bg-white bg-opacity-60 backdrop-blur-sm rounded-md shadow-sm p-8 border border-gray-300">
                            <div class="flex items-center mb-3">
                                <Icon :name="fileTypes[3].icon" class="text-blue-700 text-xl mr-2" />
                                <h3 class="font-semibold text-blue-700">{{ fileTypes[3].name }}</h3>
                            </div>
                            
                            <div v-if="fileCategories.videos.length > 0">
                                <ul class="list-none pl-0">
                                    <li v-for="file in fileCategories.videos" :key="file.name"
                                        class="py-3 border-b border-gray-200 last:border-b-0">
                                        <div class="flex justify-between items-center mb-2">
                                            <span class="text-gray-700 font-medium truncate max-w-xs">{{ file.name }}</span>
                                            <div class="flex space-x-2">
                                                <button @click="openPreview(file)"
                                                    class="text-blue-600 hover:text-blue-800 font-medium flex items-center">
                                                    <Icon name="material-symbols:preview" class="inline-block mr-1 text-lg" />
                                                    Reproducir
                                                </button>
                                                <a :href="file.url" target="_blank" download
                                                    class="text-pink-600 hover:text-pink-800 font-medium flex items-center">
                                                    <Icon name="material-symbols:download" class="inline-block mr-1 text-lg" />
                                                    Descargar
                                                </a>
                                            </div>
                                        </div>
                                       
                                        <div class="mt-2">
                                            <video class="h-24 w-full object-cover rounded-md shadow-md cursor-pointer" @click="openPreview(file)">
                                                <source :src="file.url" type="video/mp4">
                                                Tu navegador no soporta la reproducción de video.
                                            </video>
                                        </div>
                                    </li>
                                </ul>
                            </div>
                            <div v-else class="text-center text-gray-500 py-4">
                                No has subido videos aún.
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div v-if="showPreview" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div class="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-screen overflow-auto">
                    <div class="p-4 border-b border-gray-200 flex justify-between items-center">
                        <h3 class="font-semibold text-lg text-gray-700">{{ previewFile?.name }}</h3>
                        <button @click="closePreview" class="text-gray-500 hover:text-gray-700">
                            <Icon name="material-symbols:close" class="text-2xl" />
                        </button>
                    </div>
                    <div class="p-4 flex justify-center">
                        
                        <img v-if="previewFile?.type === 'image'" :src="previewFile?.url" alt="Preview" class="max-h-96 max-w-full object-contain" />
                        
                        <audio v-if="previewFile?.type === 'audio'" controls class="w-full">
                            <source :src="previewFile?.url" type="audio/mpeg">
                            Tu navegador no soporta la reproducción de audio.
                        </audio>
                        
                        <video v-if="previewFile?.type === 'video'" controls class="max-h-96 max-w-full">
                            <source :src="previewFile?.url" type="video/mp4">
                            Tu navegador no soporta la reproducción de video.
                        </video>
                    </div>
                    <div class="p-4 border-t border-gray-200 flex justify-end">
                        <a :href="previewFile?.url" download class="bg-pink-500 text-white px-4 py-2 rounded-md hover:bg-pink-600">
                            Descargar
                        </a>
                    </div>
                </div>
            </div>
        </main>
    </div>
</template>