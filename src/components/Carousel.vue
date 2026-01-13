<script setup>
import { ref, onMounted, onUnmounted } from 'vue';

const gridRef = ref(null);
const isExpandable = ref(true)
function prev() {
    if (!gridRef.value) { return; }

    gridRef.value.scrollBy({
        top: -gridRef.value.clientHeight,
        behavior: "smooth",
    });
}

function next() {
    if (!gridRef.value) { return; }
    gridRef.value.scrollBy({
        top: +gridRef.value.clientHeight,
        behavior: "smooth",
    });
}
// onMounted(() => {
//     if (gridRef.value) {
//         const checkExpandable = () => {
//             if (gridRef.value.scrollHeight === gridRef.value.clientHeight) {
//                 isExpandable.value = false
//             } else {
//                 isExpandable.value = true
//             }
//         }
//         checkExpandable()
//         window.addEventListener('resize', checkExpandable)
//     }
// })
// onUnmounted(() => { window.removeEventListener('resize', checkExpandable) })

const expanded = defineModel()

function toggle_expand() {
    expanded.value = !expanded.value

}


const close = () => {
    expanded.value = false
};

const closeOnEscape = (e) => {
    if (e.key === 'Escape' && expanded.value) {
        close();
    }
};

onMounted(() => document.addEventListener('keydown', closeOnEscape));

onUnmounted(() => {
    document.removeEventListener('keydown', closeOnEscape);
});

</script>
<!-- HACK: this is very very WIP -->
<template>
    <div class="flex items-center border border-cl_background-400 dark:border-cl_background-400-dark rounded-lg ">
        <div class="relative flex-grow ">
            <div ref="gridRef"
                class="dynamic-grid transition-all snap-mandatory snap-y overflow-y-auto overflow-x-hidden justify-items-center items-center flex flex-col duration-500 ease-in-out"
                :class="[expanded ? 'max-h-96' : 'max-h-16']">
                <slot />
            </div>
        </div>
        <div :class="[isExpandable ? 'visible' : 'hidden']" class="py-2 flex flex-col place-self-start ">
            <button class="p-1 rounded hover:bg-gray-400" @click="prev">
                <img class="h-2 w-2" src="/icons/buttons/arrow_up.svg" alt="">
            </button>
            <button class="p-1 rounded hover:bg-gray-400" @click="next">
                <img class="h-2 w-2" src="/icons/buttons/arrow_down.svg" alt="">
            </button>
            <button class="p-1 rounded hover:bg-gray-400" @click="toggle_expand">
                <img class="h-2 w-2" src="/icons/buttons/expand_down.svg" alt="">
            </button>
        </div>
    </div>
</template>

<style scoped>
.dynamic-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(5rem, 1fr));
    grid-auto-rows: 4.5rem;

    -ms-overflow-style: none;
    /* IE and Edge */
    scrollbar-width: none;
    /* Firefox */
}

.dynamic-grid::-webkit-scrollbar {
    display: none;
}

.dynamic-grid>* {
    scroll-snap-align: center;
}
</style>
