<script setup>
import { ref, reactive, computed, onMounted, toRaw, watch } from 'vue'
import { useSrvCaseStore } from '@/stores/srvCase'
import Paginator from '@/components/Paginator.vue'
import { useForm } from '@/composables/form.js'
import useSifter from '@/composables/sifter.js'
import FileSelect from '@/components/FileSelect.vue'
import Dropdown from '@/components/Dropdown.vue'
import TextInput from '@/components/TextInput.vue'
import FormSection from '@/components/FormSection.vue'
import Button from '@/components/Button.vue'
import Modal from '@/components/Modal.vue'
import dayjs from 'dayjs'
import customParseFormat from 'dayjs/plugin/customParseFormat' // ES 2015
import { useSrvUserStore } from '@/stores/srvUser'
import SelectionList from '@/components/SelectionList.vue'
import { useLoading } from 'vue-loading-overlay'

dayjs.extend(customParseFormat);

const srvCaseStore = useSrvCaseStore()
const srvUserStore = useSrvUserStore()

const search = { field: 'title', query: '' }
function getSorterStatusIcon(key) {
    const order = activeSorters.get(key)
    switch (order) {
        case "asc": {
            return "/icons/buttons/ascending_white.svg"
            break
        }
        case "des": {
            return "/icons/buttons/descending_white.svg"
            break
        }
        default: {
            return ""
            break
        }
    }
}
const sorters = {
    title: {
        asc: (lhs, rhs) => {
            if (lhs.title < rhs.title) {
                return -1;
            }
            if (lhs.title > rhs.title) {
                return 1;
            }
            return 0;
        },
        des: (lhs, rhs) => {
            if (lhs.title > rhs.title) {
                return -1;
            }
            if (lhs.title < rhs.title) {
                return 1;
            }
            return 0;
        }
    },
    active: {
        asc: (lhs, rhs) => (lhs.active === rhs.active) ? 0 : lhs.active ? -1 : 1,
        des: (lhs, rhs) => (lhs.active === rhs.active) ? 0 : lhs.active ? 1 : -1
    }
}
const filters = {
    status: {
        active: (item) => item.active,
        inactive: (item) => !item.active
    }
}

const cases = computed(() => srvCaseStore.availableSrvCases)
const groups = computed(() => srvUserStore.srvGroups)

const { activeSearch, toogleSorter, activeSorters, finalData } = useSifter(cases, search, sorters)

const showModal = ref(false)

const caseForm = useForm({
    _id: { value: null },
    group_id: { value: null },
    title: { value: '' },
    thumbnail: { value: '' },
    description: { value: '' },
    active: { value: true },
    private: { value: false },
    version: { value: { parent_id: null } },
})
function setEditCase(_id) {
    const cs = cases.value.find(cs => cs._id === _id)

    if( !cs )
        return console.error('What are you doing step-bro??', _id)

    caseForm.values._id = cs._id
    caseForm.values.group_id = cs.group_id

    caseForm.values.title = cs.title
    caseForm.values.thumbnail = cs.thumbnail
    caseForm.values.description = cs.description
    caseForm.values.active = cs.active
    caseForm.values.private = cs.private
    caseForm.values.version = cs.version

    showModal.value = true
}

watch(() => showModal.value, () => {
    if( !showModal.value ) clearEditCase()
})
function clearEditCase() {
    caseForm.values._id = null
    caseForm.values.group_id = null
    caseForm.values.title = ''
    caseForm.values.thumbnail = ''
    caseForm.values.description = ''
    caseForm.values.active = true
    caseForm.values.private = false
    caseForm.values.version = { parent_id: null }

    showModal.value = false
}

async function submit() {
    setLoading(true)

    await caseForm.post('/serve/case')
        .finally(() => setLoading(false))
    caseForm.resetForm()
    showModal.value = false
}


/**
 * LOADER
 */

const loadRef = ref(null)
const $loader = ref(null)
const loadOverlay = useLoading({
    loader: 'dots',
    // width: 128,
    // active: true,
    // isFullPage: true,
    color: '#5D6895', // cl_accent-100
    backgroundColor: '#b0b0b0', // cl_accent-800
    opacity: 1
});
const loading = ref(false)
function setLoading( ld = false ) {
    if(ld && !$loader.value) {
        loading.value = true

        $loader.value = loadOverlay.show({
            container: loadRef.value
        })
    } else if( !ld && $loader.value ) {
        setTimeout(() => {
            loading.value = false

            $loader.value.hide()
            $loader.value = null
        }, 300)
    }
}
</script>

<template>
    <div class="flex flex-col h-full bg-cl_background-100 dark:bg-cl_background-100-dark">
        <header class="flex gap-2 items-center px-2 py-4">
            <img class="brightness-0" src="/icons/case.svg" />
            <div class="text-2xl">Cases</div>
        </header>
        <section class="flex justify-between px-4 pt-6">
            <TextInput type="text" v-model="activeSearch.query" class="p-1 border rounded" placeholder="Search..." />
            <Button @click="showModal = !showModal"
                class="flex justify-center items-center w-28 h-10 bg-cl_accent-100 hover:bg-cl_accent-400 text-gray-200 gap-2">
                <span class="text-2xl mb-[.2rem]">+</span>
                <span>Create</span>
            </Button>
            <Modal :show="showModal" @close="showModal = !showModal">
                <form @submit.prevent="submit" class="p-2 flex flex-col space-y-2 bg-cl_background-100 rounded-md">
                    <header class="p-2 text-lg text-gray-800">
                        {{ caseForm.values._id ? `Edit Case [${caseForm.values.title}]` : 'New Case' }}
                    </header>

                    <section class="p-2 flex flex-col">
                        <FormSection label="Title">
                            <TextInput v-model="caseForm.values.title" />
                        </FormSection>

                        <FormSection label="Description">
                            <TextInput area v-model="caseForm.values.description" />
                        </FormSection>

                        <div class="flex">
                            <div class="flex items-center p-2 gap-2 w-1/2">
                                <input id="active" class="ring-2 ring-blue-500 rounded border-0" name="active" type="checkbox"
                                    v-model="caseForm.values.active" />
                                <label for="active">Active</label>
                            </div>

                            <div v-if="!caseForm.values._id" class="flex items-center p-2 gap-2 w-1/2">
                                <input id="private" class="ring-2 ring-blue-500 rounded border-0" name="private" type="checkbox"
                                    v-model="caseForm.values.private" />
                                <label for="private">Private</label>
                            </div>
                        </div>
                        
                        <FormSection v-if="caseForm.values.private" label="Belongs to Group">
                            <SelectionList
                                :items="groups"
                                item_label_field="title"
                                item_id_field="_id"
                                v-model="caseForm.values.group_id"
                                dropdown-classes="w-full max-h-80 mt-1 overflow-y-auto z-50 rounded-md"
                                />
                        </FormSection>

                        <FormSection label="Image">
                            <FileSelect v-model="caseForm.values.thumbnail" />
                        </FormSection>
                    </section>
                    <footer ref="loadRef" class="flex justify-end gap-5">
                        <Button :disabled="loading" @click.prevent="showModal = !showModal"
                            class="hover:bg-red-700 bg-cl_accent-100 text-gray-200 p-2">Cancel</Button>
                        <Button :disabled="loading" class="hover:bg-green-700 bg-cl_accent-100 text-gray-200 p-2">Submit</Button>
                    </footer>
                </form>

            </Modal>
        </section>
        <div class="px-4 py-2 ">
            <Button class="flex justify-center items-center px-4 py-2 gap-2 bg-cl_accent-100 hover:bg-cl_accent-400 text-gray-200"
                @click="() => toogleSorter('active')">Active
                <!-- FIX: HORRIBLE !!!!  -->
                <!-- https://stackoverflow.com/questions/43999618/how-to-define-a-temporary-variable-in-vue-js-template -->
                <img v-if="getSorterStatusIcon('active') !== ''" class="w-4 h-4" :src="getSorterStatusIcon('active')" />
            </Button>
        </div>
        <Paginator
            class="flex flex-col min-h-0 p-4 "
            :items="finalData"
            :max_items_per_page="10"
            :loading="srvCaseStore.loading.case"
            items_label_field="title">
            <template #item="{ _id, title, updated_at, description, img, version, active }">
                <div class="flex flex-col group">
                    <div class="w-full h-44 bg-cl_accent-50 overflow-hidden relative  rounded-t-lg">
                        <img v-if="img" class="h-full w-full object-cover" :src="img" />
                        <img v-else class="-rotate-12 w-full opacity-30 object-cover" src="/icons/case.svg" />
                        <div
                            class="flex p-2 justify-end items-end top-0 bg-gradient-to-t from-gray-700 to-transparent absolute w-full h-full">
                            <div class="px-3 py-1 flex justify-center items-center gap-2 rounded-lg bg-cl_background-100 dark:bg-cl_background-100-dark text-sm">
                                <div>{{ active ? "Active" : "Inactive" }}</div>
                                <div class="h-2 w-2 rounded-full" :class="[active ? 'bg-green-400' : 'bg-red-700']">
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="p-2 flex flex-col justify-between content-between flex-grow bg-cl_background-400 dark:bg-cl_background-400-dark shadow-md rounded-b-lg">
                        <div class="flex gap-3 rounded-md">
                            <div class="flex-grow">
                                <div>{{ title }}</div>
                                <div class="text-gray-800 text-opacity-80 text-sm h-20 overflow-y-auto">
                                    {{ description }}
                                </div>
                            </div>

                            <div class="rounded-sm">
                                <Dropdown
                                    dropdown-classes="space-y-2 z-50 text-sm flex text-gray-800 max-h-20 mt-1 absolute overflow-y-auto rounded-lg bg-cl_background-100 dark:bg-cl_background-100-dark shadow-md ring-1 ring-black ring-opacity-10"
                                    align="right">
                                    <template #trigger>
                                        <button class="hover:bg-gray-200 rounded-full w-6 h-6 justify-center items-center">
                                            <svg width="20" height="20">
                                                <circle cx="10" cy="5" r="2" fill="#000" />
                                                <circle cx="10" cy="10" r="2" fill="#000" />
                                                <circle cx="10" cy="15" r="2" fill="#000" />
                                            </svg>
                                        </button>
                                    </template>
                                    <template #content>
                                        <div class="flex justify-center items-center p-4 gap-2 w-full cursor-pointer select-none hover:bg-cl_background-300 dark:hover:bg-cl_background-300-dark"
                                            @click="() => setEditCase(_id)">
                                            <img class="brightness-50 h-4 w-4" src="/icons/edit.svg" />
                                            <div>Edit</div>
                                        </div>
                                    </template>
                                </Dropdown>
                            </div>
                        </div>
                        <div class="flex justify-end text-xs text-gray-700">
                            {{ dayjs(updated_at).format("DD/MM/YYYY") }}
                        </div>
                    </div>
                </div>
            </template>
        </Paginator>
    </div>
</template>
