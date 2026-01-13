<script setup>
import { ref, reactive } from 'vue';
const props = defineProps({
    promt: { type: String, default: 'Please select a file.' },
    multiple: { type: Boolean }
});
const files = defineModel("files", { default: [] })
const emit = defineEmits(["filesSelected"]);
// One reactive state object to hold all file-related information
// const files = ref([])
const dragging = ref(false)

// Reference to the hidden file input
const fileInputRef = ref(null);

// Open file picker programmatically
function triggerFileInput() {
    fileInputRef.value.click();
}

// Handle file upload via input element
function handleFileUpload(event) {
    files.value = event.target.files;
    // processFile(file);
}

// Confirm the selected file
function confirmFile() {
    emit("filesSelected", files.value)
}

// Drag-and-drop handling
function onDragOver() {
    dragging.value = true;
}

function onDragLeave() {
    dragging.value = false;
}

function onDrop(event) {
    console.log(event)
    files.value = event.dataTransfer.files;
    // processFile();
    emit("filesSelected", files.value[0])
    dragging.value = false;
}
function createImgThumbnail(file) {
    return URL.createObjectURL(file)
    // return { load: () => { URL.revokeObjectURL(src); }, src }
}
function destroyImgThumbnail(event) {
    URL.revokeObjectURL(event.target.src);
}
</script>

<template>
    <div class="flex flex-col justify-center items-center p-4 w-full rounded-lg relative" @dragover.prevent="onDragOver"
        :class="dragging ? 'bg-blue-100 border-blue-400' : 'bg-white'">
        <!-- Show selected file name -->
        <div class="flex-col flex justify-center items-center">
            <div class="flex flex-col">
                <p>Selected file{{ files.length > 1 ? 's' : '' }}:</p>
                <div
                    class="gap-2 justify-center items-center px-4 py-2 flex border-dashed border-2 border-gray-300 rounded-lg">
                    <div v-if="files.length !== 0" v-for="(file, index) in files" :key="index">
                        <div
                            class="min-w-16 shadow-md shadow-gray-600/20 ring ring-gray-400/50 rounded bg-gray-100 flex flex-col justify-center items-center">
                            <img class="w-8 h-8" v-if="file.type.startsWith('image/')" @load="destroyImgThumbnail"
                                :src="createImgThumbnail(file)" alt="">
                            <img class="w-8 h-8" v-else src="/icons/file.svg" />
                            <div class="text-xs w-1/2 text-wrap break-words">
                                {{ file.name }}
                            </div>
                        </div>
                    </div>
                    <div v-else>No files selected</div>
                    <div class="flex flex-col justify-center items-center">
                        <!-- <p>{{ props.promt }}</p> -->
                        <input type="file" @change="handleFileUpload" class="hidden" ref="fileInputRef" />
                        <button @click.prevent="triggerFileInput" class="bg-blue-500 text-white px-4 py-2 rounded-md">
                            +
                        </button>
                    </div>
                </div>
            </div>

            <button @click="confirmFile" class="mt-2 bg-green-500 text-white px-4 py-2 rounded-md">
                Confirm Selection
            </button>
        </div>

        <!-- Drag-and-drop visualization -->
        <div v-if="dragging" @dragleave="onDragLeave" @drop.prevent="onDrop"
            class="absolute inset-0 flex justify-center items-center bg-blue-200 bg-opacity-50 backdrop-blur-sm">
            <p class="text-blue-700 font-bold text-lg">Drop your file here</p>
        </div>

    </div>
</template>
