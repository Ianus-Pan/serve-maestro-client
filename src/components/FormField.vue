<script setup>
import QuestionMark from '@/components/QuestionMark.vue';

const props = defineProps({
    label: {
        type: String,
        default: ''
    },
    required: Boolean,
    errorMessage: {
        type: String,
        default: ''
    },
    help: { type: String }
});
</script>

<template>
    <div class="flex flex-col">
        <label v-if="label" v-tooltip.top-start="help" class="flex items-center font-medium text-gray-700">{{ label }}
            <span v-if="required" class="text-lg text-red-700"> * </span>
            <QuestionMark v-if="help" />
        </label>
        <slot></slot>
        <span v-if="errorMessage" class="text-red-600/90 text-xs mb-1 ">{{ errorMessage }}</span>
    </div>
</template>
