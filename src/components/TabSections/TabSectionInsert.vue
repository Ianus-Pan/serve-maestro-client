<script setup>
import { ref, watch, reactive, computed } from 'vue'

import { leafletMap } from '@/stores/leafletMap';
import { useSrvInsertCategoryStore } from '@/stores/srvInsertCategory';
import { useSrvCaseStore } from '@/stores/srvCase'

import FormSection from '@/components/FormSection.vue'
import Button from '@/components/Button.vue'
import TextInput from '@/components/TextInput.vue'
import Carousel from '@/components/Carousel.vue';
import Draggable from '@/components/Draggable.vue';
import FileSelect from '@/components/FileSelect.vue';
import TabSection from '@/components/TabSection.vue';
import Modal from '@/components/Modal.vue'
import { useForm } from '@/composables/form.js';

const root_url = import.meta.env.VITE_MAESTRO_LARAVEL;

const srvInsertCategoryStore = useSrvInsertCategoryStore()
const srvCaseStore = useSrvCaseStore()

const mapStore = leafletMap()

const exportForm = useForm({
    filename: { value: "" }
})

const importModalShow = ref(false)
const exportModalShow = ref(false)

function selectFile() {
    importModalShow.value = true
}
function filesSelected(files) {
    importModalShow.value = false
    for (const file of files) {
        mapStore.importGeoJson(file)
    }
}

function selectName() {
    exportModalShow.value = true
}
function formSubmit() {

    exportFile()
    exportModalShow.value = false

}
function exportFile() {
    const geojson = mapStore.exportGeoJson()
    try {
        const fileBlob = new Blob([JSON.stringify(geojson)], { type: 'application/json' });

        const tempLink = document.createElement("a");
        tempLink.setAttribute('href', URL.createObjectURL(fileBlob));
        tempLink.setAttribute('download', exportForm.values.filename + ".geojson");

        tempLink.click();



        URL.revokeObjectURL(tempLink.href);
    } catch (error) {
        console.log(error)
    }
}


/**
@param {DragEvent} e
@param {Object} data

*/
function onDragStart(e, element) {
    const case_id = srvCaseStore.selectedSrvCase
    if (!case_id) {
        throw Error("Can not insert an element outside of a case")
    }
    element.case_id = case_id
    e.dataTransfer.setData("map.insert", JSON.stringify(element));
    Object.keys(carouselState).forEach(key => carouselState[key] = false);
}
// const carouselState = reactive(srvInsertCategoryStore.srvInsertCategories.reduce((acc, { type }) => ({ ...acc, [type]: false }), {}));
const carouselState = reactive({});
</script>

<template>
    <div class="flex items-baseline gap-1 h-1 flex-grow">
        <TabSection class="flex-1" :label="category.title"
            v-for="(category, c_index) in srvInsertCategoryStore.srvInsertCategories" :key="c_index">

            <Carousel v-model="carouselState[category.type]" class="flex-1">

                <Draggable
                    class="flex flex-col w-20 h-[80%] m-1 py-1 px-2 text-center rounded-xl bg-cl_background-300 dark:bg-cl_background-400"
                    :draggable="true" v-for="(element, e_index) in category.elements" :key="e_index"
                    v-tooltip.bottom="element.description" @dragstart="(e) => { onDragStart(e, element) }">

                    <div class="flex justify-center h-fit w-full">
                        <img :id="'img-' + element.icon" class="h-[26px] w-[75%]" :src="root_url + element.icon"
                            :alt="element.title" loading="lazy">
                    </div>
                    <div class="w-full overflow-hidden text-ellipsis ">
                        <span class="text-xs whitespace-nowrap">{{ element.title }}</span>
                    </div>
                </Draggable>
            </Carousel>
        </TabSection>
    </div>

    <div class="flex flex-col gap-1">
        <button class="flex justify-center items-center bg-cl_accent-100 text-gray-200 p-1 rounded-sm"
            @click="selectFile">IMPORT</button>
        <button class="flex justify-center items-center bg-cl_accent-100 text-gray-200 p-1 rounded-sm"
            @click="selectName">EXPORT</button>
    </div>

    <Modal :show="importModalShow" @close="importModalShow = !importModalShow">
        <!-- <p>INFO ABOUT IMPORT TODO::</p> -->
        <FileSelect @filesSelected="filesSelected" />
    </Modal>
    <Modal :show="exportModalShow" @close="exportModalShow = !exportModalShow">
        <!-- <p>INFO ABOUT EXPORT TODO::</p> -->

        <form class="flex space-y-2 flex-col gap-1 p-4 flex-1 justify-center items-center" @submit.prevent="formSubmit">
            <FormSection label="Filename">
                <div class="flex justify-center items-baseline gap-1 ">
                    <TextInput required class="flex-grow" v-model="exportForm.values.filename" />
                    <span>.geojson</span>
                </div>
            </FormSection>
            <footer class="flex justify-end gap-5">
                <Button @click.prevent="exportModalShow = !exportModalShow"
                    class="hover:bg-red-700 bg-cl_accent-100 text-gray-200 p-2">Cancel</Button>
                <Button class="hover:bg-green-700 bg-cl_accent-100 text-gray-200 p-2">Submit</Button>
            </footer>
        </form>

    </Modal>
</template>
