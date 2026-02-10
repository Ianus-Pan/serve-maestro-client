<script setup>
import { computed, ref } from 'vue'

import { useClientSettings } from '@/stores/clientSettings';
import { useSrvUserStore } from '@/stores/srvUser';
import { useSrvCaseStore } from '@/stores/srvCase'
import { leafletMap } from '@/stores/leafletMap';

import ApplicationLogo from '@/components/ApplicationLogo.vue';
import Dropdown from '@/components/Dropdown.vue';
import TabGroup from '@/components/TabGroup.vue';
import Tab from '@/components/Tab.vue';
import Modal from '@/components/Modal.vue';
import FileSelect from '@/components/FileSelect.vue'
import TabSectionCase from '@/components/TabSections/TabSectionCase.vue'
import TabSectionInsert from '@/components/TabSections/TabSectionInsert.vue'
import TabSectionAssessment from '@/components/TabSections/TabSectionAssessment.vue'
import laravelServer from '@/api/laravelServer';
import { useRoute } from "vue-router";
import DarkModeSwitch from '@/components/DarkModeSwitch.vue';
const route = useRoute();

const maestroUrl = import.meta.env.VITE_MAESTRO_LARAVEL
const goToUrl = (url) => {
    window.location.href = url
}

const clientSettings = useClientSettings()
const srvUserStore = useSrvUserStore()
const srvCaseStore = useSrvCaseStore()

const map = leafletMap()

const user = computed(() => srvUserStore.getUser())

const modalShow = ref(false)

async function logout() {
    /** Remove Stored Items */
    clientSettings.wipeSettings()

    laravelServer.USER.LOGOUT.single()
        .catch(err => console.error('Logout Err:', err))
        .finally(() => window.location.href = import.meta.env.VITE_MAESTRO_LOGIN)
}
const shownTabs = computed(() => {
    return {
        cases: ["arc-gis", "map-2d", "map-3d", "assessment", "scenario-session"].includes(route.name?.toString()),
        insert: ["arc-gis", "map-2d", "map-3d" ].includes(route.name?.toString()),
        assessment: ["map-2d", "map-3d", "assessment"].includes(route.name?.toString())
    }
})
</script>

<template>
    <!-- TODO: Break all this to Header>Foo>Bar -->
    <div class="w-full relative items-center flex drop-shadow-md bg-cl_background-400 dark:bg-cl_background-400-dark">
        <!-- Logo -->
        <button v-tooltip.bottom="'Home'" class="w-20 md:w-40 h-20 md:h-32 flex-none flex justify-center items-center"
            @click="goToUrl(maestroUrl)">
            <ApplicationLogo class="block h-10 md:h-20 w-auto fill-current text-gray-800" />
        </button>


        <!-- <Transition  name="slide-up"> -->
        <TabGroup class="flex flex-col w-full h-full">
            <Tab position="1" v-if="shownTabs.cases" class="flex items-center" label="Cases">
                <TabSectionCase />
            </Tab>

            <Tab position="2" v-if="shownTabs.insert" :disabled="!srvCaseStore.selectedSrvCase" class="flex items-start gap-2" label="Insert">
                <TabSectionInsert />
            </Tab>

            <Tab position="3" v-if="shownTabs.assessment" :disabled="!srvCaseStore.selectedSrvCase" class="flex h-full items-center gap-1" label="Assessment">
                <TabSectionAssessment />
            </Tab>
        </TabGroup>
        <!-- </Transition> -->
        <!-- <VDivider size="80%" /> -->

        <Modal :show="modalShow" @close="modalShow = false">
            <FileSelect @filesSelected="map.importGeoJson" />
        </Modal>

        <div class="hidden md:flex w-40 h-40 items-center justify-center">
            <!-- Settings Dropdown -->
            <Dropdown
                dropdown-classes="h-fit mt-1 absolute rounded-md rounded overflow-hidden ring-2 ring-gray-300 drop-shadow-md"
                align="right">
                <template #trigger>
                    <span class="inline-flex rounded-md">
                        <button type="button"
                            class="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-gray-500 hover:text-gray-700 bg-cl_background-100 dark:bg-cl_background-100-dark focus:outline-none transition ease-in-out duration-150">
                            <object v-if="user" :data="user?.profile_photo_url" type="image/png" class="h-8 w-8 rounded-full object-cover" :alt="user?.name">
                                <img src="/icons/person.svg" class="invert h-8 w-8 rounded-full object-cover" :alt="user?.name"/>
                            </object>
                            <img v-else class="invert h-auto w-auto rounded-full object-cover" src="/icons/person.svg" alt="No user" />
                        </button>
                    </span>
                </template>
                <template #content>
                    <!-- <a :href="maestroUrl + 'user/profile'" class="block px-4 py-2 text-sm text-gray-700 hover:bg-cl_background-300 dark:hover:bg-cl_background-300-dark">
                        Profile
                    </a> -->
                    
                    <div class="block mx-2 px-2 py-2 text-xs text-gray-700 rounded-md bg-cl_background-400 dark:bg-cl_background-400-dark">
                        <div class="flex items-center gap-2">
                            <div class="w-3/12">
                                <button class="flex text-sm border-2 border-transparent rounded-full bg-[#FFBF00] focus:outline-none focus:border-gray-300 transition">
                                    <object v-if="user" :data="user?.profile_photo_url" type="image/png" class="h-8 w-8 rounded-full object-cover" :alt="user?.name">
                                        <img src="/icons/person.svg" class="invert h-8 w-8 rounded-full object-cover" :alt="user?.name"/>
                                    </object>
                                    <img v-else class="invert h-auto w-auto rounded-full object-cover" src="/icons/person.svg" alt="No user" />
                                </button>
                            </div>
                            <div class="w-9/12">
                                <div class="font-bold">{{ user?.name }}</div>
                                <div class="">{{ user?.email }}</div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="p-4 flex justify-end">
                        <DarkModeSwitch/>
                    </div>

                    <form @submit.prevent="logout">
                        <button type="submit" class="block w-full px-4 py-2 text-sm text-end text-gray-700 hover:bg-cl_background-300 dark:hover:bg-cl_background-300-dark">
                            Log Out
                        </button>
                    </form>
                </template>
            </Dropdown>
        </div>
    </div>
</template>

<style>
.slide-up-enter-active,
.slide-up-leave-active {
    transition: all 0.25s ease-in-out;
    width: 100%;
}

.slide-up-enter-from {
    opacity: 0;
    transform: translateY(30px);
}

.slide-up-leave-to {
    opacity: 0;
    transform: translateY(-30px);
}
</style>
