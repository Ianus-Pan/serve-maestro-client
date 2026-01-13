<script setup lang="ts">
import { computed, PropType, ref } from 'vue';
import { Link } from '@inertiajs/vue3';
import router from '@/router';

/** Cant export ENUM Props, so we're using the int key */
enum ActionType {
    Internal,   // 0
    External,   // 1
    Inertia,    // 2
    Popup,      // 3
}

const props = defineProps({
    label: { type: String },
    description: { type: String },
    img: { type: String },
    imgClass: { type: String },
    disabled: { type: Boolean, default: false },
    active: { type: Boolean },

    href: {
        type: String,
        required: true,
    },

    /**
     * 0=Internal, 1=External, 2=Inertia
     *
     * Internal evokes router.push({name: href})
     *
     * External evokes JS window.open(href, '_blank')
     *
     * Inertia replaces <button> with <Link>, meant to only for Laravel InertiaJS Responses
     */
    actionType: {
        type: Number as PropType<ActionType>,
        default: ActionType.Internal
    },
});


const classes = computed(() =>
    props.disabled ?
        'bg-cl_background-50 cursor-not-allowed text-red-600' :
        props.active ?
            'bg-cl_accent-400 text-gray-200' :
            'bg-cl_accent-100 text-gray-200'
);

const modalShow = ref(false)
const btnNavigate = (href) => {
    if( props.actionType ===  ActionType.Internal )
        return router.push({name: href});

    if( props.actionType ===  ActionType.External )
        return window.open(href, '_blank');

    if( props.actionType ===  ActionType.Popup )
        return modalShow.value = true;
};
</script>

<template>
    <Link v-if="actionType === ActionType.Inertia" as="button" :href="href"
        class="mx-2 rounded-lg flex gap-2 py-1 md:p-2 items-center justify-center md:justify-start hover:opacity-80 transition duration-150 ease-in-out"
        :class="classes"
        :disabled="props.disabled"
        v-tooltip.right="description">
        <img :class="props.imgClass" class="w-6 md:w-4 lg:w-6 h-6 md:h-4 lg:h-6" v-if="img" :src="img"
            :style="props.disabled ? 'filter: invert(27%) sepia(88%) saturate(7193%) hue-rotate(358deg) brightness(75%) contrast(125%)' : ''"/>
        <span class="hidden md:inline text-xs lg:text-sm text-left text-ellipsis truncate uppercase">
            {{ label }}
        </span>
    </Link>

    <button v-else @click="btnNavigate(href)"
        class="mx-2 rounded-lg flex gap-2 py-1 md:p-2 items-center justify-center md:justify-start hover:opacity-80 transition duration-150 ease-in-out"
        :class="classes"
        :disabled="props.disabled"
        v-tooltip.right="{ content : description }">
        <img :class="props.imgClass" class="w-6 md:w-4 lg:w-6 h-6 md:h-4 lg:h-6" v-if="img" :src="img"
            :style="props.disabled ? 'filter: invert(27%) sepia(88%) saturate(7193%) hue-rotate(358deg) brightness(75%) contrast(125%)' : ''"/>
        <span class="hidden md:inline text-xs lg:text-sm text-left text-ellipsis truncate uppercase">
            {{ label }}
        </span>
    </button>
</template>
