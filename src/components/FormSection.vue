<script setup>
import QuestionMark from '@/components/QuestionMark.vue';
import VDivider from './VDivider.vue';

const props = defineProps({
    label: {
        type: String,
        default: 'Section Label'
    },
    description: {
        type: String,
        default: null
    },
    help: {
        type: String,
    }
});

</script>
<template>
    <div class="flex flex-col p-2 gap-2">
        <label v-if="label" class="font-medium text-gray-700">
            <div class="flex space-x-6 py-2">
                <span v-html="label"></span>
                <QuestionMark v-if="help" v-tooltip="help" />
            </div>
            <small v-if="description" v-html="description"></small>
            <VDivider size="100%" :flip="true"/>
        </label>
        <slot></slot>
    </div>
</template>
