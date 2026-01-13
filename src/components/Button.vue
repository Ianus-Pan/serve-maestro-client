<script setup>
const props = defineProps({
    label: { type: String },
    img: { type: String }
});


</script>

<template>
    <button
        class="disabled:opacity-50 transition-all enabled:active:scale-90 select-none flex min-w-4 min-h-4 justify-center drop-shadow-md rounded-md">
        <!-- <div class="rounded-full w-4 h-4 from-yellow-300 to-blue-500 bg-gradient-to-tr"></div> -->
        <slot>
            <img :draggable="false" :src="props.img" alt="">
        </slot>
    </button>
</template>
