<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import Paginator from '@/components/Paginator.vue'
import { useForm } from '@/composables/form.js'
import useSifter from '@/composables/sifter.js'
import Dropdown from '@/components/Dropdown.vue'
import TextInput from '@/components/TextInput.vue'
import FormSection from '@/components/FormSection.vue'
import Button from '@/components/Button.vue'
import Modal from '@/components/Modal.vue'
import dayjs from 'dayjs'
import customParseFormat from 'dayjs/plugin/customParseFormat' // ES 2015
import { useSrvUserStore } from '@/stores/srvUser'
import { useLoading } from 'vue-loading-overlay'

dayjs.extend(customParseFormat);

const srvUserStore = useSrvUserStore()
const users = computed(() => srvUserStore.srvUsers)

const search = { field: 'name', query: '' }
const sorters = {
    name: {
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
const sortIcon = computed(() => {
    const order = activeSorters.get('active')
    switch (order) {
        case "asc": return "/icons/buttons/ascending_white.svg"
        case "des": return "/icons/buttons/descending_white.svg"
        default: return 0
    }
})

const { activeSearch, toogleSorter, activeSorters, finalData } = useSifter(users, search, sorters, filters)

const showModal = ref(false)

const userForm = useForm({
    _id: { value: null },
    username: { value: '' },
    password: { value: '' },

    name: { value: '' },
    email: { value: '' },

    active: { value: true },
})
function setEditUser(_id) {
    const usr = srvUserStore.getUser(_id)
    // return console.log('What are you doing step-bro??', usr)
    if( !usr )
        return console.error('What are you doing step-bro??', _id)

    userForm.values._id = usr._id
    userForm.values.username = usr.username
    userForm.values.password = ''
    userForm.values.name = usr.name
    userForm.values.email = usr.email
    userForm.values.active = usr.active

    showModal.value = true
}

watch(() => showModal.value, () => {
    if( !showModal.value ) clearEditUser()
})
function clearEditUser() {
    userForm.resetForm()
    showModal.value = false
}

async function submit() {
    setLoading(true)
    userForm.values.active = !!userForm.values.active

    await userForm.post('/serve/user')
        .finally(() => setLoading(false))
    userForm.resetForm()
    showModal.value = false
}

const fallback_img = '/icons/person.svg'


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
            <img class="brightness-0" src="/icons/person.svg" />
            <div class="text-2xl">Users</div>
        </header>

        <section class="flex justify-between px-4 pt-6">
            <TextInput type="text" v-model="activeSearch.query" class="p-1 border rounded" placeholder="Search..." />

            <Button @click="showModal = !showModal"
                class="flex  justify-center items-center w-28 h-10 bg-cl_accent-100 hover:bg-cl_accent-400 text-gray-200 gap-2">
                <span class="text-2xl mb-[.2rem]">+</span>
                <span>Create</span>
            </Button>

            <Modal :show="showModal" @close="showModal = !showModal">
                <form @submit.prevent="submit" class="p-2 flex flex-col space-y-2 bg-cl_background-100 rounded-md">
                    <header class="p-2 text-lg text-gray-800">
                        {{ userForm.values._id ? `Edit User [${userForm.values.username}]` : 'New User' }}
                    </header>

                    <section class="p-2 flex flex-col">
                        <input type="hidden" name="_id" :value="userForm.values._id"/>

                        <FormSection label="Full Name">
                            <TextInput v-model="userForm.values.name" />
                        </FormSection>

                        <FormSection label="Username" v-if="!userForm.values._id">
                            <TextInput v-model="userForm.values.username" />
                        </FormSection>
                        <FormSection label="Password" v-if="!userForm.values._id">
                            <TextInput v-model="userForm.values.password" />
                        </FormSection>

                        <FormSection label="Email">
                            <TextInput v-model="userForm.values.email" />
                        </FormSection>

                        <div class="flex items-center p-2 gap-2">
                            <input id="active" class="ring-2 ring-blue-500 rounded border-0" name="active" type="checkbox"
                                v-model="userForm.values.active" />
                            <label for="active">Active</label>
                        </div>
                    </section>

                    <footer ref="loadRef" class="flex justify-end gap-5">
                        <Button @click.prevent="showModal = !showModal" class="hover:bg-red-700 bg-cl_accent-100 text-gray-200 p-2">Cancel</Button>
                        <Button class="hover:bg-green-700 bg-cl_accent-100 text-gray-200 p-2">Submit</Button>
                    </footer>
                </form>
            </Modal>
        </section>

        <div class="px-4 py-2 ">
            <Button @click="() => toogleSorter('active')"
                class="flex justify-center items-center px-4 py-2 gap-2 bg-cl_accent-100 hover:bg-cl_accent-400 text-gray-200">
                Active
                <img v-if="sortIcon" class="w-4 h-4" :src="sortIcon" />
            </Button>
        </div>

        <Paginator
            class="flex flex-col min-h-0 p-4 "
            :items="finalData"
            :max_items_per_page="10"
            :loading="srvUserStore.loading"
            items_label_field="name">

            <template #item="{ _id, name, username, profile_photo_url, updated_at, active }">
                <div class="flex flex-col group">
                    <div class="w-full h-44 bg-cl_accent-50 overflow-hidden relative  rounded-t-lg">
                        <span v-if="profile_photo_url">
                            <object :data="profile_photo_url" type="image/png" class="h-full w-full object-cover">
                                <img :src="fallback_img" class="h-full w-full object-cover"/>
                            </object>
                        </span>
                        <img v-else class="-rotate-12 w-full opacity-30 object-cover" :src="fallback_img" />
                        <div class="flex p-2 justify-end items-end top-0 bg-gradient-to-t from-gray-700 to-transparent absolute w-full h-full">
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
                                <div>{{ name }}</div>
                                <div class="text-gray-800 text-opacity-80 text-sm h-20 overflow-y-auto">
                                    {{ username }}
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
                                            @click="() => setEditUser(_id)">
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
