<script setup>
import { ref, onMounted, onUnmounted, watch } from "vue";
import { Loader } from "@googlemaps/js-api-loader";

defineProps({
    dropdownClass: String
})

// Reactive variables
const searchQuery = ref("");
const showList = ref(false)
const places = ref([]);
let placesService = null;

// Debounce timeout
let debounceTimeout;

const searchPlaces = () => {
    if (placesService && searchQuery.value) {
        const request = {
            query: searchQuery.value,
            fields: ["name", "place_id", "formatted_address"],
        };

        placesService.textSearch(request, (results, status) => {
            if (status === window.google.maps.places.PlacesServiceStatus.OK) {
                places.value = results;
            } else {
                console.error("Places search failed:", status);
                places.value = results;
            }
        });
    }
};

const emit = defineEmits(['geometry'])
const selectPlace = (place) => {
    showList.value = false
    const loc = place.geometry.location
    const vp = place.geometry.viewport

    // emit('place', place)
    // emit('latlng', { lat: (loc.lat()), lng: (loc.lng()) })
    // emit('bounds', [ { lng: (vp.Gh.hi), lal: (vp.ei.hi) },{ lng: (vp.Gh.lo), lat: (vp.ei.lo) }])
    emit('geometry', place.geometry)
    // console.log("Selected NE:", place.geometry.viewport.getNorthEast());
    // console.log("Selected SW:", place.geometry.viewport.getSouthWest());

    // console.log("Selected place:", place);
};

// Watch for changes on searchQuery and debounce the search
watch(searchQuery, (newValue) => {
    clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(() => {
        searchPlaces();
    }, 100); // Adjust debounce time as needed (300ms in this case)
    if (searchQuery.value.length === 0) {
        showList.value = false
    } else {
        showList.value = true
    }
});
const handleEscape = (event) => {
    if (event.key === 'Escape') {
        showList.value = false;
    }
};

onUnmounted(() => {
    window.removeEventListener('keydown', handleEscape);
});
onMounted(() => {
    const loader = new Loader({
        apiKey: import.meta.env.VITE_GMAPS_KEY,
        libraries: ["places"],
    });

    loader.load().then(() => {
        placesService = new window.google.maps.places.PlacesService(document.createElement("div"));
    });
    window.addEventListener('keydown', handleEscape);

});
</script>

<template>
    <div class="flex flex-col-reverse items-center">
        <input type="text" v-model="searchQuery" placeholder="Search places" class="p-2 border rounded" />
        <div class="w-96">
            <ul v-if="showList"
                class="max-h-64 w-full mb-1 divide-y bg-white border rounded shadow-lg z-50 overflow-y-auto"
                :class="dropdownClass">

                <li v-if="places.length !== 0" v-for="place in places" :key="place.place_id" @click="selectPlace(place)"
                    class="cursor-pointer hover:bg-gray-200 gap-2">

                    <!-- Place name (header) on the left side -->
                    <div
                        class="space-y-1 px-4 w-full grid grid-rows-3 grid-cols-1 justify-between gap-2 p-2 leading-tight">
                        <div class="row-span-2">
                            <div class="text-lg row-span-2">{{ place.name }}</div>
                            <div class="text-xs row-span-2">{{ place.formatted_address }}</div>
                        </div>

                        <div class="flex flex-wrap justify-between">
                            <div v-if="place.types.includes('place_of_worship')"
                                class="flex gap-1 text-sm text-gray-500">
                                <img class="w-4 h-4" src="https://www.svgrepo.com/show/129200/praying.svg" />
                                Place Of Worship
                            </div>
                            <div v-if="place.types.includes('point_of_interest')"
                                class="flex gap-1 text-sm text-gray-500">
                                <img class="w-4 h-4" src="/icons/IMPACT.svg" />
                                Point of Interest
                            </div>
                        </div>

                    </div>

                    <!-- Fixed-width icon on the right, taking up full height -->
                    <!-- <div class="flex items-center justify-center col-span-1 w-12 h-full"> -->
                    <!--     <img class="object-cover h-full w-full" :src="place?.photos?.[0].getUrl()" /> -->
                    <!-- </div> -->
                </li>
                <div class="space-y-1 px-4 w-full justify-between items-center text-center p-2 leading-tight" v-else> No
                    place found </div>
                <!-- <li v-for="place in places" :key="place.place_id" @click="selectPlace(place)" -->
                <!--     class="grid grid-cols-6 grid-rows-2 cursor-pointer hover:bg-gray-200"> -->
                <!--     <div class="font-bold px-4 py-2 col-span-5">{{ place.name }}</div> -->
                <!--     <div class="row-span-2"> -->
                <!--         <img class="object-cover" :src="place.photos[0].getUrl()"/> -->
                <!--     </div> -->
                <!-- </li> -->
            </ul>
        </div>
    </div>
</template>
