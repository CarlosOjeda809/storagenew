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
    { name: 'Archivados', value: 'archivados', icon: 'material-symbols:archive' }
];
const fileCategories = ref({
    documents: [],
    images: [],
    audios: [],
    videos: []
});
const previewFile = ref(null);
const showPreview = ref(false);
const activeTab = ref('upload');

const archiveFile = async (file) => {
    const userId = user.value?.id;
    if (!userId) return;

    const sourceCategory = file.category;
    const originalFilePath = `${userId}/${file.name}`;
    const destinationFilePath = `${userId}/${file.name}`;

    const { data: fileData, error: downloadError } = await client
        .storage
        .from(sourceCategory)
        .download(originalFilePath);

    if (downloadError) {
        console.error(`Error al descargar el archivo para archivar`, downloadError.message);
        return;
    }

    const { error: uploadError } = await client
        .storage
        .from('archivados')
        .upload(destinationFilePath, fileData, {
            cacheControl: '3600',
            upsert: true,
        });

    if (uploadError) {
        console.error(`Error al subir el archivo al bucket archivados`, uploadError.message);
        return;
    }

    const { error: deleteError } = await client
        .storage
        .from(sourceCategory)
        .remove([originalFilePath]);

    if (deleteError) {
        console.error(`Error al eliminar el archivo del bucket original`, deleteError.message);
        return;
    }

    fileCategories.value[sourceCategory] = fileCategories.value[sourceCategory].filter(f => f.name !== file.name);

    const { data: urlData } = client
        .storage
        .from('archivados')
        .getPublicUrl(`${userId}/${file.name}`);

    const archivedFile = {
        ...file,
        url: urlData.publicUrl,
        category: 'archivados'
    };

    fileCategories.value.archivados.push(archivedFile);

    console.log(`Archivo archivado correctamente`);

    if (previewFile.value && previewFile.value.name === file.name) {
        closePreview();
    }
};


const deleteFile = async (file) => {
    const userId = user.value?.id;
    if (!userId) return;

    const filePath = `${userId}/${file.name}`;
    const category = file.category;

    const { error } = await client
        .storage
        .from(category)
        .remove([filePath]);

    if (error) {
        console.error(`Error al eliminar archivo`, error.message);
    } else {
        fileCategories.value[category] = fileCategories.value[category].filter(f => f.name !== file.name);
        console.log(`Archivo eliminado correctamente`);
    }
};

const uploadDocument = async () => {
    if (!documentFile.value) {
        documentUploadError.value = 'Por favor, selecciona un archivo.';
        return;
    }

    isUploadingDocument.value = true;
    documentUploadError.value = null;

    const userId = user.value?.id;

    if (!userId) {
        documentUploadError.value = 'Debes iniciar sesión';
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
        activeTab.value = 'files';
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
    fileCategories.value = {
        documents: [],
        images: [],
        audios: [],
        videos: [],
        archivados: []
    };

    const userId = user.value?.id;

    if (userId) {

        const allFileTypes = [
            ...fileTypes,

        ];

        await Promise.all(allFileTypes.map(async (fileType) => {
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

const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
};

const getCategoryCount = (category) => {
    return fileCategories.value[category].length;
};

const totalFiles = computed(() => {
    return Object.values(fileCategories.value).reduce((total, files) => total + files.length, 0);
});

onMounted(async () => {
    await getUserName();
    if (user.value) {
        await listUserFiles();
    }
});
</script>

<template>
    <div class="flex flex-col bg-gradient-to-br from-pink-100 via-purple-200 to-indigo-200 min-h-screen">
        <!-- Navbar -->
        <nav
            class="text-pink-800 px-6 py-4 bg-white/80 backdrop-blur-md flex justify-between items-center shadow-md sticky top-0 z-10">
            <div class="flex items-center space-x-2">
                <div class="bg-gradient-to-r from-pink-500 to-purple-600 text-white p-2 rounded-lg shadow-md">
                    <Icon name="material-symbols:cloud-upload" class="text-xl icon-margin-fix" />
                </div>
                <h1
                    class="text-2xl font-bold bg-gradient-to-r from-pink-600 to-purple-700 bg-clip-text text-transparent">
                    UPLOAD IT</h1>
            </div>
            <div class="flex items-center space-x-3">
                <button v-if="!user" @click="navigateTo('/login')"
                    class="bg-gradient-to-r from-pink-500 to-purple-600 cursor-pointer text-white py-2 px-4 rounded-md font-medium hover:shadow-lg transition duration-200">
                    INICIAR SESIÓN
                </button>
                <button v-if="user" @click="navigateTo('/profile')"
                    class="bg-pink-100 text-pink-700 py-2 px-3 rounded-md font-medium hover:bg-pink-200 transition duration-200 flex items-center">
                    <Icon name="material-symbols:person" class="text-xl" />
                </button>
                <button v-if="user" @click="logout()"
                    class="bg-purple-100 text-purple-700 p-2 cursor-pointer rounded-md font-medium hover:bg-purple-200 transition duration-200">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 ml-1" fill="none" viewBox="0 0 24 24"
                        stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                </button>
            </div>
        </nav>

        <main class="flex-grow container mx-auto p-4 md:p-6 xl:max-w-6xl">
            <div v-if="!user" class="mt-10 bg-white/70 backdrop-blur-md rounded-xl shadow-lg p-8 text-center">
                <Icon name="material-symbols:lock" class="text-5xl text-pink-600 mb-4" />
                <h2 class="text-2xl font-bold text-gray-800 mb-3">Inicia sesión para gestionar tus archivos</h2>
                <p class="text-gray-600 mb-6">Necesitas iniciar sesión para subir y administrar tus archivos.</p>
                <button @click="navigateTo('/login')"
                    class="bg-gradient-to-r from-pink-500 to-purple-600 cursor-pointer text-white py-3 px-6 rounded-md font-medium hover:shadow-xl hover:-translate-y-0.5 transition duration-200">
                    INICIAR SESIÓN
                </button>
            </div>

            <div v-if="user">

                <div class="bg-white/70 backdrop-blur-md rounded-xl shadow-lg mt-6 overflow-hidden">
                    <div class="flex border-b border-gray-200">
                        <button @click="activeTab = 'upload'"
                            :class="['flex-1 py-4 text-center cursor-pointer font-medium transition duration-200',
                                activeTab === 'upload' ? 'text-pink-600 border-b-2 border-pink-500' : 'text-gray-600 hover:text-pink-500']">
                            <div class="flex items-center  justify-center">
                                <Icon name="material-symbols:upload" class="mr-2" />
                                Subir Archivos
                            </div>
                        </button>
                        <button @click="activeTab = 'files'"
                            :class="['flex-1 py-4 text-center font-medium transition duration-200',
                                activeTab === 'files' ? 'text-pink-600 border-b-2 border-pink-500' : 'text-gray-600 hover:text-pink-500']">
                            <div class="flex items-center cursor-pointer justify-center">
                                <Icon name="material-symbols:folder" class="mr-2" />
                                Mis Archivos
                                <span v-if="totalFiles > 0"
                                    class="ml-2 bg-pink-100 text-pink-700 text-xs px-2 py-1 rounded-full">
                                    {{ totalFiles }}
                                </span>
                            </div>
                        </button>
                    </div>


                    <div v-if="activeTab === 'upload'" class="p-6">
                        <div class="text-center mb-6">
                            <h2 class="text-2xl font-bold text-gray-800 mb-2">Sube tus archivos</h2>
                            <p class="text-gray-600">Arrastra aquí tu archivo o selecciónalo desde tu dispositivo</p>
                        </div>

                        <div
                            class="border-2 border-dashed border-pink-300 rounded-xl p-8 bg-pink-50/50 flex flex-col items-center justify-center">
                            <Icon name="material-symbols:cloud-upload" class="text-6xl text-pink-400 mb-4" />

                            <div class="flex flex-col items-center w-full max-w-md">
                                <input type="file" class="hidden" id="document-upload"
                                    @change="handleDocumentUpload($event)" />
                                <label for="document-upload"
                                    class="w-full mt-4 py-3 px-6 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-lg cursor-pointer hover:shadow-lg transition duration-200 text-center flex items-center justify-center space-x-2">
                                    <Icon name="material-symbols:attach-file" class="mr-2" />
                                    Seleccionar Archivo
                                </label>

                                <div v-if="documentFile"
                                    class="mt-4 p-4 bg-white/80 rounded-lg w-full flex items-center justify-between">
                                    <div class="flex items-center">
                                        <Icon name="material-symbols:insert-drive-file" class="text-pink-500 mr-2" />
                                        <div>
                                            <p class="font-medium text-gray-800 truncate max-w-xs">{{ documentFile.name
                                                }}</p>
                                            <p class="text-sm text-gray-500">{{ formatFileSize(documentFile.size) }}</p>
                                        </div>
                                    </div>
                                    <button @click="documentFile = null" class="text-gray-500 hover:text-red-500">
                                        <Icon name="material-symbols:close" />
                                    </button>
                                </div>

                                <button @click="uploadDocument" :disabled="isUploadingDocument || !documentFile"
                                    class="mt-6 py-3 px-8 bg-pink-600 text-white rounded-lg hover:bg-pink-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition duration-200 flex items-center justify-center w-64">
                                    <span v-if="isUploadingDocument" class="flex items-center">
                                        <Icon name="eos-icons:loading" class="animate-spin mr-2" />
                                        Subiendo...
                                    </span>
                                    <span v-else class="flex items-center">
                                        <Icon name="material-symbols:upload-file" class="mr-2" />
                                        Subir Archivo
                                    </span>
                                </button>

                                <p v-if="documentUploadError"
                                    class="text-red-500 text-sm mt-4 bg-red-50 p-3 rounded-md w-full text-center">
                                    {{ documentUploadError }}
                                </p>
                            </div>
                        </div>

                        <div class="mt-6 bg-white/80 rounded-lg p-4">
                            <h3 class="font-medium text-gray-700 mb-2">Secciones:</h3>
                            <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <div v-for="type in fileTypes" :key="type.value"
                                    class="bg-white p-3 rounded-md shadow-sm border border-gray-100 flex items-center">
                                    <Icon :name="type.icon" class="text-pink-600 mr-2" />
                                    <span class="text-gray-700">{{ type.name }}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div v-if="activeTab === 'files'" class="p-6">
                        <div class="mb-6">
                            <h2 class="text-2xl font-bold text-gray-800 mb-2 flex items-center">
                                Mis Archivos
                                <span v-if="totalFiles > 0"
                                    class="ml-3 bg-pink-100 text-pink-700 text-sm px-3 py-1 rounded-full">
                                    {{ totalFiles }} archivos
                                </span>
                            </h2>
                            <p class="text-gray-600">Gestiona todos tus archivos subidos</p>
                        </div>

                        <div v-if="loadingFiles" class="flex justify-center items-center py-12">
                            <Icon name="eos-icons:loading" class="animate-spin text-4xl text-pink-600" />
                            <span class="ml-3 text-gray-600">Cargando tus archivos...</span>
                        </div>

                        <div v-else-if="totalFiles === 0" class="bg-white/80 rounded-xl p-8 text-center">
                            <Icon name="material-symbols:folder-off" class="text-5xl text-gray-400 mb-4" />
                            <h3 class="text-xl font-medium text-gray-700 mb-2">No tienes archivos aún</h3>
                            <p class="text-gray-500 mb-6">¡Comienza a subir tus archivos para verlos aquí!</p>
                            <button @click="activeTab = 'upload'"
                                class="bg-gradient-to-r from-pink-500 to-purple-600 text-white py-2 px-6 rounded-md hover:shadow-lg transition duration-200">
                                Subir ahora
                            </button>
                        </div>

                        <div v-else>

                            <div class="border-b border-gray-200 mb-6 flex flex-wrap">
                                <button v-for="type in fileTypes" :key="type.value"
                                    :class="['mr-6 py-2 px-3 font-medium flex items-center transition duration-200',
                                        getCategoryCount(type.value) > 0 ? 'text-pink-600 border-b-2 border-pink-500' : 'text-gray-400']">
                                    <Icon :name="type.icon" class="mr-2" />
                                    {{ type.name }}
                                    <span v-if="getCategoryCount(type.value) > 0"
                                        class="ml-2 bg-pink-100 text-pink-700 text-xs px-2 py-0.5 rounded-full">
                                        {{ getCategoryCount(type.value) }}
                                    </span>
                                </button>
                            </div>


                            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div v-if="fileCategories.documents.length > 0"
                                    class="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                                    <div class="flex items-center mb-4">
                                        <div class="p-2 bg-pink-100 rounded-lg mr-3">
                                            <Icon :name="fileTypes[0].icon" class="text-pink-700 text-xl" />
                                        </div>
                                        <h3 class="font-semibold text-lg text-gray-800">{{ fileTypes[0].name }}</h3>
                                    </div>

                                    <div class="divide-y divide-gray-100">
                                        <div v-for="file in fileCategories.documents" :key="file.name"
                                            class="py-4 first:pt-1 hover:bg-pink-50/50 transition duration-200 rounded-md px-2">
                                            <div class="flex justify-between items-center">
                                                <div class="flex items-center space-x-3 flex-1 min-w-0">
                                                    <div class="p-2 bg-pink-100 rounded-md">
                                                        <Icon name="material-symbols:description"
                                                            class="text-pink-600" />
                                                    </div>
                                                    <div class="min-w-0">
                                                        <p class="font-medium text-gray-800 truncate">{{ file.name }}
                                                        </p>
                                                        <p class="text-xs text-gray-500">{{ formatFileSize(file.size) }}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div class="flex items-center space-x-1">
                                                    <a :href="file.url" target="_blank" download
                                                        class="p-2 text-gray-600 hover:text-pink-600 hover:bg-pink-50 rounded-full transition">
                                                        <Icon name="material-symbols:download" />
                                                    </a>
                                                    <button @click="archiveFile(file)"
                                                        class="p-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-full transition"
                                                        title="Archivar">
                                                        <Icon name="material-symbols:archive" />
                                                    </button>
                                                    <button @click="deleteFile(file)"
                                                        class="p-2 text-gray-600 hover:text-red-600 cursor-pointer hover:bg-red-50 rounded-full transition">
                                                        <Icon name="material-symbols:delete" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>


                                <div v-if="fileCategories.images.length > 0"
                                    class="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                                    <div class="flex items-center mb-4">
                                        <div class="p-2 bg-purple-100 rounded-lg mr-3">
                                            <Icon :name="fileTypes[1].icon" class="text-purple-700 text-xl" />
                                        </div>
                                        <h3 class="font-semibold text-lg text-gray-800">{{ fileTypes[1].name }}</h3>
                                    </div>

                                    <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                        <div v-for="file in fileCategories.images" :key="file.name"
                                            class="group relative rounded-lg overflow-hidden shadow-sm border border-gray-100">
                                            <img :src="file.url" :alt="file.name"
                                                class="h-32 w-full object-cover transition-transform group-hover:scale-105"
                                                @click="openPreview(file)" />
                                            <div
                                                class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                                                <p class="text-white text-xs truncate">{{ file.name }}</p>
                                            </div>
                                            <div
                                                class="absolute top-0 right-0 flex opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button @click.stop="openPreview(file)"
                                                    class="p-1 bg-white/80 text-purple-600 m-1 rounded-full hover:bg-white transition">
                                                    <Icon name="material-symbols:preview" class="text-sm" />
                                                </button>
                                                <a :href="file.url" target="_blank" download @click.stop
                                                    class="p-1 bg-white/80 text-pink-600 m-1 rounded-full hover:bg-white transition">
                                                    <Icon name="material-symbols:download" class="text-sm" />
                                                </a>
                                                <button @click.stop="archiveFile(file)"
                                                    class="p-1 bg-white/80 text-purple-600 m-1 rounded-full hover:bg-white transition"
                                                    title="Archivar">
                                                    <Icon name="material-symbols:archive" class="text-sm" />
                                                </button>
                                                <button @click.stop="deleteFile(file)"
                                                    class="p-1 bg-white/80 text-red-600 m-1 rounded-full cursor-pointer hover:bg-white transition">
                                                    <Icon name="material-symbols:delete" class="text-sm" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>


                                <div v-if="fileCategories.audios.length > 0"
                                    class="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                                    <div class="flex items-center mb-4">
                                        <div class="p-2 bg-indigo-100 rounded-lg mr-3">
                                            <Icon :name="fileTypes[2].icon" class="text-indigo-700 text-xl" />
                                        </div>
                                        <h3 class="font-semibold text-lg text-gray-800">{{ fileTypes[2].name }}</h3>
                                    </div>

                                    <div class="divide-y divide-gray-100">
                                        <div v-for="file in fileCategories.audios" :key="file.name"
                                            class="py-4 first:pt-1">
                                            <div class="flex justify-between items-center mb-2">
                                                <div class="flex items-center space-x-3">
                                                    <div class="p-2 bg-indigo-100 rounded-md">
                                                        <Icon name="material-symbols:audio-file"
                                                            class="text-indigo-600" />
                                                    </div>
                                                    <span class="font-medium text-gray-800 truncate max-w-xs">{{
                                                        file.name }}</span>
                                                </div>
                                                <div class="flex items-center space-x-1">
                                                    <button @click="openPreview(file)"
                                                        class="p-2 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition">
                                                        <Icon name="material-symbols:play-circle" />
                                                    </button>
                                                    <a :href="file.url" target="_blank" download
                                                        class="p-2 text-gray-600 hover:text-pink-600 hover:bg-pink-50 rounded-full transition">
                                                        <Icon name="material-symbols:download" />
                                                    </a>
                                                    <button @click="archiveFile(file)"
                                                        class="p-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-full transition"
                                                        title="Archivar">
                                                        <Icon name="material-symbols:archive" />
                                                    </button>
                                                    <button @click="deleteFile(file)"
                                                        class="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 cursor-pointer rounded-full transition">
                                                        <Icon name="material-symbols:delete" />
                                                    </button>
                                                </div>
                                            </div>

                                            <audio controls class="w-full h-10 mt-2">
                                                <source :src="file.url" type="audio/mpeg">
                                                Tu navegador no soporta la reproducción de audio.
                                            </audio>
                                        </div>
                                    </div>
                                </div>

                                <div v-if="fileCategories.videos.length > 0"
                                    class="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                                    <div class="flex items-center mb-4">
                                        <div class="p-2 bg-blue-100 rounded-lg mr-3">
                                            <Icon :name="fileTypes[3].icon" class="text-blue-700 text-xl" />
                                        </div>
                                        <h3 class="font-semibold text-lg text-gray-800">{{ fileTypes[3].name }}</h3>
                                    </div>

                                    <div class="space-y-4">
                                        <div v-for="file in fileCategories.videos" :key="file.name"
                                            class="bg-gray-50 rounded-lg overflow-hidden">
                                            <div class="relative group">
                                                <video class="w-full object-cover h-40 cursor-pointer"
                                                    @click="openPreview(file)">
                                                    <source :src="file.url" type="video/mp4">
                                                    Tu navegador no soporta la reproducción de video.
                                                </video>
                                                <div
                                                    class="absolute inset-0 flex    items-center justify-center group-hover:bg-black/30 transition">
                                                    <button @click="openPreview(file)"
                                                        class="bg-white/90 p-3 rounded-full text-blue-600 transform scale-90 group-hover:scale-100 transition">
                                                        <Icon name="material-symbols:play-arrow" class="text-xl" />
                                                    </button>
                                                </div>
                                            </div>
                                            <div class="p-3 flex justify-between items-center">
                                                <span class="font-medium text-gray-800 truncate max-w-xs">{{ file.name
                                                    }}</span>
                                                <div class="flex space-x-1">
                                                    <a :href="file.url" target="_blank" download
                                                        class="p-1.5 text-gray-600 hover:text-pink-600 hover:bg-pink-50 rounded-full transition">
                                                        <Icon name="material-symbols:download" class="text-sm" />
                                                    </a>
                                                    <button @click="archiveFile(file)"
                                                        class="p-1.5 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-full transition"
                                                        title="Archivar">
                                                        <Icon name="material-symbols:archive" class="text-sm" />
                                                    </button>
                                                    <button @click="deleteFile(file)"
                                                        class="p-1.5 text-gray-600 hover:text-red-600 hover:bg-red-50 cursor-pointer rounded-full transition">
                                                        <Icon name="material-symbols:delete" class="text-sm" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div class="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                                    <div class="flex items-center mb-4">
                                        <div class="p-2 bg-purple-100 rounded-lg mr-3">
                                            <Icon :name="fileTypes[1].icon" class="text-purple-700 text-xl" />
                                        </div>
                                        <h3 class="font-semibold text-lg text-gray-800">{{ fileTypes[4].name }}</h3>
                                    </div>

                                    <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                        <div v-if="fileCategories.archivados.length == 0">
                                            <p class="font-semibold text-md">No hay archivos</p>
                                        </div>
                                        <div v-else v-for="file in fileCategories.archivados" :key="file.name"
                                            class="group relative rounded-lg overflow-hidden shadow-sm border border-gray-100">
                                            <img :src="file.url" :alt="file.name"
                                                class="h-32 w-full object-cover transition-transform group-hover:scale-105"
                                                @click="openPreview(file)" />
                                            <div
                                                class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                                                <p class="text-white text-xs truncate">{{ file.name }}</p>
                                            </div>
                                            <div
                                                class="absolute top-0 right-0 flex opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button @click.stop="openPreview(file)"
                                                    class="p-1 bg-white/80 text-purple-600 m-1 rounded-full hover:bg-white transition">
                                                    <Icon name="material-symbols:preview" class="text-sm" />
                                                </button>
                                                <a :href="file.url" target="_blank" download @click.stop
                                                    class="p-1 bg-white/80 text-pink-600 m-1 rounded-full hover:bg-white transition">
                                                    <Icon name="material-symbols:download" class="text-sm" />
                                                </a>
                                                <button @click.stop="archiveFile(file)"
                                                    class="p-1 bg-white/80 text-purple-600 m-1 rounded-full hover:bg-white transition"
                                                    title="Archivar">
                                                    <Icon name="material-symbols:archive" class="text-sm" />
                                                </button>
                                                <button @click.stop="deleteFile(file)"
                                                    class="p-1 bg-white/80 text-red-600 m-1 rounded-full cursor-pointer hover:bg-white transition">
                                                    <Icon name="material-symbols:delete" class="text-sm" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div v-if="showPreview"
                class="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                <div class="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-screen overflow-auto">
                    <div class="p-4 border-b border-gray-200 flex justify-between items-center">
                        <h3 class="font-semibold text-lg text-gray-700">{{ previewFile?.name }}</h3>
                        <button @click="closePreview"
                            class="text-gray-500 hover:text-gray-700 p-1 rounded-full hover:bg-gray-100">
                            <Icon name="material-symbols:close" class="text-2xl" />
                        </button>
                    </div>

                    <div class="p-6 flex justify-center bg-gray-50">
                        <img v-if="previewFile?.type === 'image'" :src="previewFile?.url" alt="Preview"
                            class="max-h-96 max-w-full object-contain rounded-md shadow-md" />

                        <audio v-if="previewFile?.type === 'audio'" controls class="w-full">
                            <source :src="previewFile?.url" type="audio/mpeg">
                            Tu navegador no soporta la reproducción de audio.
                        </audio>

                        <video v-if="previewFile?.type === 'video'" controls
                            class="max-h-96 max-w-full rounded-md shadow-md">
                            <source :src="previewFile?.url" type="video/mp4">
                            Tu navegador no soporta la reproducción de video.
                        </video>
                    </div>

                    <div class="p-4 border-t border-gray-200 flex justify-end space-x-3">
                        <button @click="deleteFile(previewFile)"
                            class="px-4 py-2 border border-red-200 text-red-600 rounded-md cursor-pointer hover:bg-red-50 flex items-center transition">
                            <Icon name="material-symbols:delete" class="mr-2" />
                            Eliminar
                        </button>
                        <button @click="archiveFile(previewFile); closePreview()"
                            class="px-4 py-2 border border-purple-200 text-purple-600 rounded-md cursor-pointer hover:bg-purple-50 flex items-center transition">
                            <Icon name="material-symbols:archive" class="mr-2" />
                            Archivar
                        </button>
                        <a :href="previewFile?.url" download
                            class="bg-gradient-to-r from-pink-500 to-purple-600 text-white px-4 py-2 rounded-md hover:shadow-md transition flex items-center">
                            <Icon name="material-symbols:download" class="mr-2" />
                            Descargar
                        </a>
                    </div>
                </div>
            </div>
        </main>
    </div>
</template>

<style scoped>
.icon-margin-fix {
    vertical-align: bottom;
}
</style>