<script setup>
import { watch,inject, computed, onMounted, ref, onUnmounted } from 'vue';

const props = defineProps({
    disabled: { type: Boolean, default: false },
    label: {
        type: String,
        required: true,
    },
    position: { type: String }
});

watch(props, (after, before) => {
    update_tab(tabIndex.value,{ label: after.label, disabled: after.disabled })
});
const curr_tab = inject('curr_tab', () => console.error(`ERROR:: Using Tab '${props.label}' outside of TabGroup component`), true);
const add_tab = inject('add_tab');
const update_tab = inject('update_tab');
const remove_tab = inject('remove_tab');


const tabIndex = ref(null);

onMounted(() => {
    tabIndex.value = add_tab({ label: props.label, disabled:props.disabled }, props.position);
});

onUnmounted(() => {
    remove_tab(tabIndex.value)
})

const isActive = computed(() => {
    return tabIndex.value === curr_tab.value
});
</script>

<template>
    <div class="bg-cl_background-100 dark:bg-cl_background-100-dark w-full p-1 rounded-tr-md" v-show="isActive">
        <slot></slot>
    </div>
</template>
