<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { useLoading } from 'vue-loading-overlay';

const props = defineProps({
    items: {
        type: Array,
        required: true,
    },
    max_items_per_page: {
        type: Number,
        default: 6,
    },
    loading: {
        type: Boolean,
        default: false
    }
});

const currentPage = ref(1);

const totalPages = computed(() => {
    return Math.ceil(props.items.length / props.max_items_per_page);
});

const paginatedData = computed(() => {
    const start = (currentPage.value - 1) * props.max_items_per_page;
    return props.items.slice(start, start + props.max_items_per_page);
});

const nextPage = () => {
    if (currentPage.value < totalPages.value) {
        currentPage.value++;
    }
};

const prevPage = () => {
    if (currentPage.value > 1) {
        currentPage.value--;
    }
};

const loadRef = ref(null)
const loadOverlay = useLoading({
    loader: 'dots',
    width: 128,
    active: true,
    isFullPage: true,
    color: '#5D6895', // cl_accent-100
    backgroundColor: '#b0b0b0', // cl_accent-800
    opacity: 1
});
const $loader = ref(null)
onMounted(() => {
    setLoading(props.loading)
})
watch(() => props.loading, () => {
    setLoading(props.loading)
})
function setLoading(ld = false) {
    if (ld && !$loader.value) {
        $loader.value = loadOverlay.show({
            container: loadRef.value
        })
    } else if (!ld && $loader.value) {
        setTimeout(() => {
            $loader.value.hide()
            $loader.value = null
        }, 300)
    }
}

</script>
<template>
    <div class="grow">
        <div ref="loadRef" style="box-shadow: inset 0 0 4px 2px rgba(0, 0, 0, 0.3);"
            class="relative rounded py-1 overflow-hidden h-full">
            <TransitionGroup tag="div"
                class="h-full px-2 py-2 relative overflow-y-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                <div v-for="(item, index) in paginatedData" :key="index" class="px-2 py-1">
                    <slot name="item" v-bind="item">
                        {{ item[props.item_label_field] }}
                    </slot>
                </div>

            </TransitionGroup>
        </div>
        <div class="flex justify-between items-center mt-4">
            <button @click="prevPage" :disabled="currentPage === 1"
                class="px-4 py-2 bg-cl_accent-100 dark:bg-cl_accent-100-dark text-white rounded disabled:opacity-50">
                Prev
            </button>
            <span>
                Page {{ currentPage }} of {{ totalPages }}
            </span>
            <button @click="nextPage" :disabled="currentPage === totalPages"
                class="px-4 py-2 bg-cl_accent-100 dark:bg-cl_accent-100-dark text-white rounded disabled:opacity-50">
                Next
            </button>
        </div>
    </div>
</template>

<style scoped>
.slide-enter-active,
.slide-leave-active {
    transition: all 0.5s;
}

.slide-enter {
    transform: translateX(100%);
}

.slide-leave-to {
    transform: translateX(-100%);
}

.slide-move {
    transition: transform 0.5s;
}

.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.5s;
}

.fade-enter,
.fade-leave-to {
    opacity: 0;
}

.transition-item {
    transition: all 0.5s;
}
</style>
