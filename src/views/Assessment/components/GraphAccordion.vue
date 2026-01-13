<script setup>
import {
    Chart as ChartJS,
    RadialLinearScale,
    CategoryScale,
    LinearScale,
    BarElement,
    PointElement,
    LineElement,
    ArcElement,
    Title,
    Filler,
    Tooltip,
    Legend,
} from 'chart.js'
import { Radar } from 'vue-chartjs'
import { Bar } from 'vue-chartjs'
import { PolarArea } from 'vue-chartjs'
import { Line } from 'vue-chartjs'
import cloneDeep from 'lodash/cloneDeep';

import * as chartConfig from '../chartConfig.js'
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import Accordion from '@/components/Accordion.vue';
import Dropdown from '@/components/Dropdown.vue'
import { useClientSettings } from '@/stores/clientSettings.js'
import { useLoading } from 'vue-loading-overlay'

const props = defineProps({
    header_string: { type: String, required: true },
    to_compare: { type: Array, required: true },
    render_output: { type: Object, required: true },
    render_labels: { type: Object, required: true }, 
    loading_data: { type: Object, required: true },

    is_open: { type: Boolean, default: false },
    print_mode: { type: Boolean, default: false },
    header_classes: { type: String, default: '' },
    content_classes: { type: String, default: '' },
});

const clientSettings = useClientSettings()
const loadOverlay = useLoading({});

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    RadialLinearScale,
    PointElement,
    LineElement,
    ArcElement,
    Title,
    Filler,
    Tooltip,
    Legend,
)

/** Graph Modes */
const radarClasses = 'w-[35rem] h-[27rem]'
const polarClasses = 'w-[35rem] h-[27rem]'
const barClasses = 'w-[50rem] h-[17rem]'
const lineClasses = 'w-[50rem] h-[30rem]'

const printClasses = computed(() => props.print_mode ? 'grid grid-columns-1' : 'flex')
const graphClasses = computed(() => {
    if(graphMode.value === 'radar') return radarClasses
    if(graphMode.value === 'polar') return polarClasses
    if(graphMode.value === 'bar') return barClasses
    if(graphMode.value === 'line') return lineClasses
    return ''
})

const graphMode = ref('bar')
let configID = ''
const expanded = defineModel()
const cur_expanded = ref(false)
onMounted(() => {
    cur_expanded.value = expanded.value = props.is_open

    configID = props.header_string.split(' ').map(word => word.toLowerCase()[0]).join('_')
    setMode(null)
})

/** Format Datasets to Different Kinds of Graphs */
function toGraph( arrRenderables, arrKeyValue, graphMode = 'radar' ) {
    let lblKeys = Object.keys(arrKeyValue)

    let graphObject = {
        labels: lblKeys,
        datasets: []
    }

    arrRenderables.forEach(renderable => {
        let dts = cloneDeep(renderable)
        let arrData = []

        /** Graph Mode Specific Setting for Color */
        if( renderable.backgroundColor ) {
            if( graphMode === 'radar' )
                renderable.backgroundColor = renderable.backgroundColor
                    .replace('0.75', '0.2')
                    .replace('1.0', '0.2')
            else if( graphMode === 'bar' )
                renderable.backgroundColor = renderable.backgroundColor
                    .replace('0.75', '1.0')
                    .replace('0.2', '1.0')
            else if( graphMode === 'polar' )
                renderable.backgroundColor = renderable.backgroundColor
                    .replace('1.0', '0.75')
                    .replace('0.2', '0.75')
        }
        
        lblKeys.forEach(lblKey => {
            arrData.push( renderable.data[arrKeyValue[lblKey]] )
        })
        
        dts.data = arrData
        graphObject.datasets.push(dts)
    })
    
    return graphObject
}

function setMode(mode) {
    /** Get Latest Config */
    let config = clientSettings.data['assessment_configuration'] ?? {}
    
    /** Update My Local Value */
    if( mode ) graphMode.value = mode
    else if( config[configID] ) graphMode.value = config[configID]

    /** Update My Config */
    config[configID] = graphMode.value

    /** Save Latest Updated Config */
    clientSettings.data['assessment_configuration'] = config
}

/** If manually toggled, store Open State */
watch(() => expanded.value, () => {
    if( !props.print_mode ) {
        cur_expanded.value = expanded.value
    }
})
/** If parent toggled, propagate to Child & store Open State */
watch(() => props.is_open, () => {
    if( props.print_mode ) {
        expanded.value = true
    } else {
        expanded.value = props.is_open
        cur_expanded.value = props.is_open
    }
})
/** If Print Mode, force child Open, then return to last Open State */
watch(() => props.print_mode, () => {
    if( props.print_mode ) {
        expanded.value = true
    } else {
        expanded.value = cur_expanded.value
    }
})

const loaders = ref({})
const refs = ref({})
watch(() => [props.to_compare, props.render_output], async () => {
    /** 
     * Await Next Tick because to_compare array is responsible for the 
     * HTML Elements creation. They must be created before I try to 
     * access them via `refs.value[container]`
     */
    await nextTick()

    props.to_compare.forEach(cKey => {
        setLoading(!props.render_output[cKey], `${configID}_${cKey}`)
    })
}, {deep: true})
function setLoading( ld = false, container = null ) {
    if(ld && !loaders.value[container]) {
        loaders.value[container] = loadOverlay.show({
            container: refs.value[container],
            zIndex: 2
        })
    } else if( !ld && loaders.value[container] ) {
        setTimeout(() => {
            loaders.value[container]?.hide()
            loaders.value[container] = null 
        }, 300)
    }
}
</script>

<template>
    <div class="relative">
        <Accordion
            v-model="expanded"
            :header_classes="props.header_classes"
            :content_classes="props.content_classes"
            class="mr-[5rem]">

            <template #header>
                <span>
                    {{ props.header_string }}
                </span>
            </template>

            <template #content>
                <div class="w-full text-center p-3 gap-3 overflow-x-auto"
                    :class="printClasses">
                    <div v-for="cKey in to_compare"
                        :key="`${configID}_${cKey}`"
                        class="avoid p-2 h-min relative rounded-3xl shadow-md bg-cl_background-100 dark:bg-cl_background-100-dark">

                        <div v-if="render_output[cKey]"
                            :ref="el => refs[`${configID}_${cKey}`] = el"
                            class="w-min relative rounded-3xl overflow-hidden">

                            <span>{{ render_output[cKey].card_data.title }}</span>
                            <br>
                            <div class="mx-auto text-xs max-w-[32rem] overflow-hidden text-nowrap text-ellipsis">{{ render_output[cKey].card_data.description }}&nbsp;</div>

                            <div :class="graphClasses">
                                <Bar v-if="graphMode === 'bar'" :data="toGraph(render_output[cKey].graph_data, render_labels, graphMode)" :options="chartConfig.barOptions"/>
                                <Line v-if="graphMode === 'line'" :data="toGraph(render_output[cKey].graph_data, render_labels, graphMode)" :options="chartConfig.barOptions"/>
                                <Radar v-if="graphMode === 'radar'" :data="toGraph(render_output[cKey].graph_data, render_labels, graphMode)" :options="chartConfig.radarOptions"/>
                                <PolarArea v-if="graphMode === 'polar'" :data="toGraph(render_output[cKey].graph_data, render_labels, graphMode)" :options="chartConfig.radarOptions"/>
                            </div>
                        </div>

                        <div v-else
                            :ref="el => refs[`${configID}_${cKey}`] = el"
                            class="w-min relative rounded-3xl overflow-hidden">
                            
                            <span>Loading Display</span>
                            <br>
                            <small>&nbsp;</small>

                            <div :class="graphClasses">
                                <Bar v-if="graphMode === 'bar'" :data="loading_data" :options="chartConfig.barOptions"/>
                                <Line v-if="graphMode === 'line'" :data="loading_data" :options="chartConfig.barOptions"/>
                                <Radar v-if="graphMode === 'radar'" :data="loading_data" :options="chartConfig.radarOptions"/>
                                <PolarArea v-if="graphMode === 'polar'" :data="loading_data" :options="chartConfig.radarOptions"/>
                            </div>
                        </div>
                    </div>

                    <div v-if="!to_compare.length" 
                        class="p-2 rounded-3xl shadow-md bg-cl_background-100 dark:bg-cl_background-100-dark">
                        <div>
                            <span>Nothing to Display</span>
                            <br>
                            <small>&nbsp;</small>

                            <div :class="graphClasses">
                                <Bar v-if="graphMode === 'bar'" :data="loading_data" :options="chartConfig.barOptions"/>
                                <Line v-if="graphMode === 'line'" :data="loading_data" :options="chartConfig.barOptions"/>
                                <Radar v-if="graphMode === 'radar'" :data="loading_data" :options="chartConfig.radarOptions"/>
                                <PolarArea v-if="graphMode === 'polar'" :data="loading_data" :options="chartConfig.radarOptions"/>
                            </div>
                        </div>
                    </div>
                </div>
            </template>
        </Accordion>

        <Dropdown v-if="!print_mode" style="position: absolute; right: 0; top: 0"
            dropdown-classes="mt-2 mr-2 absolute rounded-md rounded overflow-hidden ring-2 ring-gray-300 drop-shadow-md"
            align="right">
            <template #trigger>
                <span class="inline-flex rounded-md pr-2">
                    <button type="button"
                        class="inline-flex shadow-md items-center p-3 border border-transparent text-sm leading-4 font-medium rounded-md text-gray-700 bg-cl_background-300 dark:bg-cl_background-300-dark hover:bg-cl_background-400 dark:hover:bg-cl_background-400-dark focus:outline-none transition ease-in-out duration-150">
                        Mode
                    </button>
                </span>
            </template>
            <template #content>
                <button @click="setMode('bar')"
                    class="w-full items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-gray-700 hover:bg-cl_background-300 dark:hover:bg-cl_background-300-dark focus:outline-none transition ease-in-out duration-150">
                    Bar
                </button>
                <button @click="setMode('line')"
                    class="w-full items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-gray-700 hover:bg-cl_background-300 dark:hover:bg-cl_background-300-dark focus:outline-none transition ease-in-out duration-150">
                    Line
                </button>
                <button @click="setMode('radar')"
                    class="w-full items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-gray-700 hover:bg-cl_background-300 dark:hover:bg-cl_background-300-dark focus:outline-none transition ease-in-out duration-150">
                    Radar
                </button>
                <button @click="setMode('polar')"
                    class="w-full items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-gray-700 hover:bg-cl_background-300 dark:hover:bg-cl_background-300-dark focus:outline-none transition ease-in-out duration-150">
                    Polar
                </button>
            </template>
        </Dropdown>
    </div>
</template>
