<script setup>
import { watch } from 'vue'
const props = defineProps({
    target: { type: String, default: 'body' },
    windowClass: { type: String },
    notificationClass: { type: String },
});
const notifications = defineModel({ type: Array, required: true })

</script>

<template>
    <Teleport :to="target">
        <div :class="windowClass" class="absolute bottom-14 left-0 p-3 ">
            <TransitionGroup class="space-y-2" name="slide-fade" tag="div">
                <div :class="notificationClass" v-for="notification in notifications" :key="notification.id"
                    class="transform transition-all duration-300">
                    <slot name="notification" v-bind="notification">
                        {{ notification.message }}
                    </slot>
                </div>
            </TransitionGroup>
        </div>
    </Teleport>
</template>


<style>
.slide-fade-enter-active,
.slide-fade-leave-active {
    opacity: 0;
    transform: translateX(-100%);
    transition: opacity 0.2s, transform 0.1s;
}

.slide-fade-enter,
.slide-fade-leave-to

/* .slide-fade-leave-active in <2.1.8 */
    {
    opacity: 0;
    transition: opacity 0.2s, transform 0.5s;
    transform: translateX(-100%);
}
</style>
