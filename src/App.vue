<template>
    <HeaderNav class="w-full h-[8rem] z-[100]" />

    <main class="h-[calc(100%-8rem)] flex overflow-hidden">
        <AsideNav class="w-[5rem] md:w-[10rem] bg-cl_background-400 dark:bg-cl_background-400-dark" />

        <div class="relative z-20 w-[calc(100%-5rem)] md:w-[calc(100%-10rem)]">
            <RouterView />
        </div>
    </main>
</template>

<script setup>
/** Framework */
import { h, onMounted, ref, watch } from 'vue'
import { RouterView } from 'vue-router'
import { useLoading } from 'vue-loading-overlay'

/** Stores */
import { useClientSettings } from './stores/clientSettings'
import { leafletMap } from '@/stores/leafletMap'
import { useSrvSocketStore } from './stores/srvSocket'
import { useSrvScenariostore } from './stores/srvScenario'
import { useSrvCaseStore } from './stores/srvCase'
import { useSrvThreatStore } from './stores/srvThreat'
import { useSrvAssessmentStore } from './stores/srvAssessment'
import { useSrvInsertCategoryStore } from './stores/srvInsertCategory'
import { useSrvElementSchemasStore } from './stores/srvElementSchema'
import { useSrvQnairSchemasStore } from './stores/srvQnairSchema'
import { useSrvUserStore } from './stores/srvUser'

/** Components */
import HeaderNav from './partials/HeaderNav.vue'
import AsideNav from './partials/AsideNav.vue'
import { useLibreMapStore } from './stores/libreMap'

/** Client Local Storage */
const clientSettings = useClientSettings()

/** Map Manager Stores */
const leafMap = leafletMap()
const libreMap = useLibreMapStore()

/** Web App Stores */
const srvCaseStore = useSrvCaseStore()
const srvThreatStore = useSrvThreatStore()
const srvAssessmentStore = useSrvAssessmentStore()
const srvInsertCategoryStore = useSrvInsertCategoryStore()
const srvElementSchemaStore = useSrvElementSchemasStore()
const srvQnairSchemaStore = useSrvQnairSchemasStore()
const srvUserStore = useSrvUserStore()
const srvSocketStore = useSrvSocketStore()
const srvSessionStore = useSrvScenariostore()

const loadOverlay = useLoading({
    loader: 'dots',
    width: 128,
    active: true,
    isFullPage: true,
    color: '#5D6895', // cl_accent-100
    backgroundColor: '#2f405c', // cl_accent-800
    opacity: 1
}, {
    before: () => h('img', {
        src: '/logos/SERVE.png',
        alt: 'Loading Logo',
        class: 'w-[128px] h-[128px] rounded-full ring-4 ring-cl_accent-400'
    })
});
const $loader = ref(null)

onMounted(async () => {
    /** Show Splash */
    $loader.value = loadOverlay.show()

    /** Local Storage */
    clientSettings.getSettings()

    /** User Data Required (or Logout) - triggers GET User Groups*/
    await srvUserStore.promiseFetchUser()

    /** Get User-Available Cases - triggers GET Threats */
    await srvCaseStore.promiseFetchSrvCases()

    /** Hide Splash */
    setTimeout(() => $loader.value.hide(), 300)

    /** Get all Insertable Categories & Elements */
    srvInsertCategoryStore.promiseFetchSrvInsertCategories()

    /** Get all Element Schemas for inserting to Map */
    srvElementSchemaStore.promiseFetchSrvElementSchemas()

    /** Get all QN Schemas for Threat/Area Answers */
    srvQnairSchemaStore.promiseFetchSrvQnairSchemas()

    /** Get all Visible Users for /users View */
    srvUserStore.promiseFetchAllUsers()

    /** Get the Scenarios that can be Initialized (STAMtech) */
    srvSessionStore.promiseFetchAvailableScenarios()

    /** Join Socket Channels */
    joinGeneralChannels();
})

function joinGeneralChannels() {
    srvSocketStore.leavePublic('SrvUser')
    srvSocketStore.leavePublic('SrvCase')

    const publicList = [
        {
            channel: `SrvUser`,
            type: 'public',
            listeners: [
                /** Add User */
                {
                    type: 'listen',
                    event: '.user_add',
                    callback: data => {
                        // console.log('[public]SrvUser[listen]user_add', 'user_add:', data)
                        srvUserStore.setUser(data)
                    }
                },
                {
                    type: 'listen',
                    event: '.user_edit',
                    callback: data => {
                        // console.log('[public]SrvUser[listen]user_edit', 'user_edit:', data)
                        srvUserStore.setUser(data)
                    }
                },
            ]
        },
        {
            channel: `SrvCase`,
            type: 'public',
            listeners: [
                /** Debug */
                {
                    type: 'listen',
                    event: '.debug',
                    callback: data => {
                        console.log('[public]SrvCase[listen]debug', 'Debug:', data)
                    }
                },

                /** Case Listeners */
                {
                    type: 'listen',
                    event: '.case_add',
                    callback: data => {
                        // console.log('[public]SrvCase[listen]case_add', 'Case Added:', data)
                        srvCaseStore.socketAddCase(data)
                    }
                },
                {
                    type: 'listen',
                    event: '.case_edit',
                    callback: data => {
                        // console.log('[public]SrvCase[listen]case_edit', 'Case Edited:', data)
                        srvCaseStore.socketEditCase(data)
                    }
                },
            ]
        },
    ]

    for (let conn of publicList) {
        srvSocketStore.connectPublic(conn)
    }
}

watch(() => srvCaseStore.selectedSrvCase, newCaseID => {
    srvSocketStore.leavePublic('SrvCase.*')

    const publicList = [
        {
            channel: `SrvCase.${newCaseID}`,
            type: 'public',
            listeners: [
                /** Element Listeners */
                {
                    type: 'listen',
                    event: '.element_add',
                    callback: (data) => {
                        console.log('[public]SrvCase.*[listen]case_element_add', '\nElement Added:', data)
                        leafMap.setElement(data)
                        srvCaseStore.importGeoJson([data])
                    }
                },

                /** Questionnaire Listener */
                {
                    type: 'listen',
                    event: '.questionnaire_edit',
                    callback: data => {
                        console.log('[public]SrvCase.*[listen]questionnaire_edit', '\nQN:', data)

                        /** 
                         * This helps with Threat Selection, so it doesn't have to wait for
                         * .promiseFetchSrvThreats to update the threat.case_has_qnnaires
                         * in order to make the Threat selectable!
                         */
                        let theThreat = srvThreatStore.srvThreats.find(th => th._id === data.threat_id)
                        theThreat.case_has_qnnaires = [
                            data.type,
                            ...theThreat.case_has_qnnaires
                                .filter(qn_type => qn_type !== data.type)
                        ]

                        /** Update the Threats */
                        srvThreatStore.promiseFetchSrvThreats(newCaseID)
                        srvAssessmentStore.refreshCaseAssessment([data.case_id, data.threat_id ?? srvThreatStore.selectedSrvThreat])
                    }
                },

                /** Scenario Session Listener */
                {
                    type: 'listen',
                    event: '.session_add',
                    callback: (data) => {
                        console.log('[public]SrvCase.*[listen]session_add', '\nSession Added:', data)
                        srvSessionStore.srvSessions.push(data);
                    }
                },
            ]
        },
    ]

    for (let conn of publicList) {
        srvSocketStore.connectPublic(conn)
    }
})

watch(() => srvUserStore.selectedUser, user => {
    srvSocketStore.leavePrivate()

    const privateList = [
        // {
        //     channel: 'serve-main',
        //     type: 'private',
        //     listeners: [
        //         {
        //             type: 'listen_for_whisper',
        //             event: '.test',
        //             callback: data => {
        //                 console.log('[private]serve-main[listen_for_whisper]test:', data)
        //             }
        //         },
        //     ]
        // },
    ]

    for (let conn of privateList) {
        srvSocketStore.connectPrivate(user, conn)
    }
})
</script>
