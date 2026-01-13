<script setup>
import {computed} from 'vue'
const props = defineProps({
    flip: { type: Boolean },
    size: { type: String, default: "2rem" },
    thickness: { type: String, default: "1px" }
});

const style = computed(() => props.flip ? 
    { height: props.thickness, width: props.size } : 
    { height: props.size, width: props.thickness } );

</script>


<template>
    <div :style="style" class="bg-cl_background-800 dark:bg-cl_background-800-dark rounded-full">
    </div>
</template>
