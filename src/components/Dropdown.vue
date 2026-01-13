<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue';

const props = defineProps({
    align: {
        type: String,
        default: 'right',
    },
    width: {
        type: String,
        default: '48',
    },
    contentClasses: {
        type: String,
        default: 'py-1',
    },
    dropdownClasses: {
        type: String,
        default: "mt-1 rounded shadow-lg",
    },
    outsideClose: {
        type: Boolean,
        default: true
    },
    debug: {
        type: Boolean,
    },
});

const closeOnEscape = (e) => {
    if (open.value && e.key === 'Escape') {
        open.value = false;
    }
};

onMounted(() => document.addEventListener('keydown', closeOnEscape));
onUnmounted(() => document.removeEventListener('keydown', closeOnEscape));

const widthClass = computed(() => {
    return {
        48: 'w-48',
    }[props.width.toString()];
});

const alignmentClasses = computed(() => {
    if (props.align === 'left') {
        return 'ltr:origin-top-left rtl:origin-top-right start-0';
    } else if (props.align === 'right') {
        return 'ltr:origin-top-right rtl:origin-top-left end-0';
    } else if (props.align === 'center') {
        return 'origin-top mx-[-25%]';
    } else {
        return 'origin-top';
    }
});

const open = ref(false);
</script>

<template>
    <div class="relative">
        <div @click="open = !open">
            <slot name="trigger" />
        </div>

        <!-- Full Screen Dropdown Overlay -->
        <div v-show="outsideClose ? open : false" :style="debug ?
            {
                background: `repeating-linear-gradient(
                45deg,
                rgba(0, 0, 0, 0.4),
                rgba(0, 0, 0, 0.4) 40px,
                rgba(255, 255, 0,0.4) 40px,
                rgba(255, 255, 0, 0.4) 60px
                )`}
            : {}" class="bg-opacity-30 fixed w-[200vw] h-[200vh] -left-[100%] -top-[100%] inset-0 z-[1000]"
            @click="open = false"></div>

        <Transition enter-active-class="transition ease-out duration-200" enter-from-class="opacity-0 scale-95"
            enter-to-class="opacity-100 scale-100" leave-active-class="transition ease-in duration-75"
            leave-from-class="opacity-100 scale-100" leave-to-class="opacity-0 scale-95">
            <div v-show="open" class="z-[9999] bg-cl_background-100 dark:bg-cl_background-100-dark"
                :class="[dropdownClasses, alignmentClasses, 'absolute']">
                <slot name="header" />

                <div @click="open = false" :class="contentClasses">
                    <slot name="content" />
                </div>
            </div>
        </Transition>
    </div>
</template>
