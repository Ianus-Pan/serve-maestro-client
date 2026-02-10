<script setup>
import HDivider from '@/components/HDivider.vue';
import NavGroup from '@/components/NavGroup.vue';
import NavButton from '@/components/NavButton.vue';

import { useSrvCaseStore } from '@/stores/srvCase';
import { useSrvThreatStore } from '@/stores/srvThreat';
import { computed } from 'vue';

const srvCaseStore = useSrvCaseStore()
const srvThreatStore = useSrvThreatStore()

const hasCase = computed(() => !!srvCaseStore.selectedSrvCase)
const hasThreat = computed(() => !!srvThreatStore.selectedSrvThreat)
const hasAssessment = computed(() => {
    return (hasCase.value && hasThreat.value) ?
        !!(srvThreatStore.getSrvThreat().case_has_qnnaires.length === 2) :
        false
})
</script>

<template>
    <nav class="drop-shadow overflow-auto scrollbar-hide">
        <div class="flex flex-col items-center justify-between w-full">
            <div class="flex justify-center items-center flex-col w-full">
                <NavGroup title="Operation Panel">
                    <NavButton label="Arc GIS Map" href="arc-gis"
                        description="View Arc GIS powered Case Map"
                        :active="$route.name === 'arc-gis'"
                        img="/icons/arcgis.png" />

                    <NavButton label="Leaflet Map" href="map-2d"
                        description="View 2D Case Map"
                        :active="$route.name === 'map-2d'"
                        img="/icons/leaflet.png" />

                    <NavButton label="Libre Map" href="map-3d"
                        description="View 3D Case Map"
                        :active="$route.name === 'map-3d'"
                        img="/icons/libremap.svg" />

                    <NavButton label="Assessment" href="assessment"
                        :description="(!hasCase || !hasThreat) ? 'Please select a Case & Threat first' : 
                            !hasAssessment ? 'Please fill out the Threat Questionnaire first' :
                            'View Assessment'"
                        :active="$route.name === 'assessment'"
                        :disabled="!hasAssessment"
                        img="/icons/assess.svg"/>
                </NavGroup>

                <HDivider size="3rem" class="my-2" />

                <NavGroup title="Admin Panel">
                    <NavButton label="Cases" href="cases"
                        description="View Cases"
                        :active="$route.name === 'cases'"
                        img="/icons/case.svg" />

                    <NavButton label="Users" href="users"
                        description="View Users"
                        :active="$route.name === 'users'"
                        img="/icons/person.svg" />

                    <NavButton label="Groups" href="groups"
                        description="View Groups"
                        :active="$route.name === 'groups'"
                        img="/icons/people-group.svg" />
                </NavGroup>

                <HDivider size="3rem" class="my-2" />

                <NavGroup title="Serious Gaming Scenario">
                    <NavButton label="Sessions" href="scenario-session"
                        :description="(!hasCase || !hasThreat) ? 'Please select a Case & Threat first' : 'View or Create Serious Gaming Sessions.'"
                        :active="$route.name === 'scenario-session'"
                        :disabled="(!hasCase || !hasThreat)"
                        img="/icons/session.svg"/>
                </NavGroup>

                <!-- <div> -->
                <!--     <div class="drop-shadow-md bg-white rounded-md p-2 items-center text-center justify-center font-bold"> -->
                <!--         <div class="underline font-bold text-gray-500">MAP STATE</div> -->
                <!--         <span>{{ map.stateMachine.current }}</span> -->
                <!--     </div> -->
                <!-- </div> -->
            </div>
        </div>
    </nav>
</template>
