
import L from 'leaflet';

import 'leaflet/dist/leaflet.css'

import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css'
import '@geoman-io/leaflet-geoman-free'

import '@/plugins/leaflet_svg_on_path'
import '@/plugins/leaflet_pattern_fill'
import '@/plugins/leaflet_circle_sector'
import '@/plugins/leaflet_centroid_icons'

import turf from 'turf'

import { defineStore } from 'pinia';
import { watch, ref, shallowRef, reactive, markRaw, toRaw, nextTick } from 'vue';

import { MapElement, geo2leaf_geometry } from "@/classes/LeafletMapElement.js";
/** @import {MapElement_type,MapElement_style_type ,MapElement_geometry_type,MapElement_element_type ,MapElement_seed_type} from '@/classes/LeafletMapElement.js' */

import { useSrvCaseStore } from '@/stores/srvCase.js'

import axiosInstance from '@/services/axiosInstance.js'
import useNotifications from '@/composables/notifications.js';


import useFSM from '@/composables/fsm.js';
import useApi from '@/composables/api.js';
import laravelServer from '@/api/laravelServer.js';

const ROOT_URL = import.meta.env.VITE_MAESTRO_LARAVEL;

/**
 * # HOW THE SAUSAGE IS MADE:
 * The server sends down the possible ELEMENTS the map can have,
 *  this happens in the form of the elementSchema, where all the elements
 *  are send to serve with their corresponding Attributes and Form Fields
 * On Drop of the elements to the map the elements attributes get fed to
 *  the map in the form of `elementSeed`. The seed is then used to create
 *  the actual `mapElement`.
 * The map is NOTHING without a `case` , the map is but a reflection and a
 *  way to interact with said `case`. When an elements is
 *      DRAGGED -> DROPPED -> DRAWN -> INSERTED -> IDLE
 *  the element is sent to the server for it to be put on the case.
 *  The logic is handled by an internal FSM inside the map store.
 * The main pivot point of the map is the `currentElement`
 *  the `currentElement` is the one being modified ,  the one being inserted etc
 *  ** This might become an issue later and is subject to change
 *
 * */
export const leafletMap = defineStore('leafletMap', () => {

    const loading = ref(false)
    const srvCaseStore = useSrvCaseStore()
    const serveApi = useApi(axiosInstance)

    const notifications = useNotifications({ timeout: 5000 })
    function notify(payload) {
        notifications.addNotification(payload)
    }

    /**
    *  The reason for the 2 data structures is simple,
    *   Interacting with the map elements is esentially just clicking on
    *   leaflet L.layers with all the attributes that come with this.
    *   But ,to programmatically interact with the elements you need to
    *   use their IDs.
    *   To prevent one of the two methods of interacting with the elements
    *   from doing a search on a list of Elements
    *   either for an id , or for a layer , it is much faster and cheaper to use 2
    *   structures pointing to the same data just using different "pointers"
    */
    /** @type {import('vue').Ref<Map<L.Layer,MapElement>>}
     *  A maping of all the elements of the case by LAYER
     * */
    const elements = ref(new Map())

    /** @type {import('vue').Ref<Map<string,MapElement>>}
     *  A maping of all the elements of the case by ID
     * */
    const id_elements = ref(new Map())
    const bakElement = ref(null)
    const currentElement = ref(null)

    watch(() => currentElement.value, (after, before) => {
        if (after) {
            after.reflectToLayer()
        }
    }, { deep: true, immediate: true } )

    /** Start/Stop Draw new Element */
    /** Next Step: _startInsertElement */
    /**
     * @param {MapElement_seed_type} seed Element seed
     */
    function _startDrawElement(seed) {
        currentElement.value = reactive(MapElement.fromSeed(seed))
    }
    /**
     *
     */
    function _endDrawElement() {
        notify({ img: "/icons/warning.svg", title: "Drawing", message: "Drawing of the element has been canceled." })
        currentElement.value = null
    }

    /** Start/Stop Insert new Element */
    /**
     * @param {L.Layer} layer Element Layer
     */
    function _startInsertElement(layer) {

        const map_element = currentElement.value
        console.log('>> After Draw: Inserting', map_element)

        // Fill in layer field now that one exists
        // markRaw is to prevent infinite looping on dependency checking
        // in Vue reactivity
        map_element.layer = markRaw(layer)

        // Due to some visual inconsistencies i disable editing of Sectors for now...
        // FIX: doesnt really work as expected either
        const isSector = map_element.geometry.subtype === "Circle" && map_element.properties.element.category !== "AREA"
        map_element.layer.pm.enable({
            allowEditing: !isSector,
            draggable: true
        })

    }
    /**
     * @param {boolean} submitted If element was submitted or discarded
     * If submitted then POST element to server , else remove layer from map
     */
    function _endInsertElement(submitted) {

        const map_element = currentElement.value

        map_element.layer.pm.disable()
        map_element.layer.remove()

        if (submitted) {
            elementPOST(map_element)
        } else {
            notify({ img: "/icons/warning.svg", title: "Inserting", message: "Inserting of the element has been canceled." })
        }

        // Clear currentElement for next interaction
        currentElement.value = null

    }

    /** Start/Stop Edit existing Element */
    /**
     * @param {string|L.Layer} element Element Id or Layer
     */
    function _startEditElement(element) {
        const idGiven = typeof element === "string"
        const map_element = idGiven ?
            id_elements.value.get(element) : elements.value.get(element);

        if (!map_element) {
            console.error("ERROR:: No such element found on map.")
            return
        }
        // Clone element to bakElement for restoring in case of cancellation
        bakElement.value = MapElement.fromClone(map_element)
        // Set the currently interacted element to `map_element`
        currentElement.value = map_element

        // Due to some visual inconsistencies i disable editing of Sectors for now...
        // FIX: doesnt really work as expected either
        const isSector = map_element.geometry.subtype === "Circle" && map_element.properties.element.category !== "AREA"
        map_element.layer.pm.enable({
            allowEditing: !isSector,
            draggable: true
        })
    }
    /**
     * @param {boolean} submitted If changes to element were submitted or discarded
     * If submitted then POST element to server , else restore attributes to element
     */
    function _endEditElement(submitted) {

        const map_element = currentElement.value

        // Disable further editing
        map_element.layer.pm.disable()

        if (submitted) {
            elementPOST(map_element)
        } else {
            // console.info('Cancel Edit, Restore pre-Edit state. Clear `currentElement`');
            notify({ img: "/icons/warning.svg", title: "Editing", message: "Editing of the element has been canceled. Restoring original state..." })
            // Restore element to its original state
            // NOTE: maybe unnecessary ? since current element is being watched for changes?
            bakElement.value.reflectToLayer()
            // Restore element to its original state
            currentElement.value.restoreAttributes(bakElement.value)
        }
        // Clear currentElement and bakElement for next interaction
        currentElement.value = null
        bakElement.value = null
    }

    /** Map State Machine */
    /**
     * State handling for Map
     * ---
     *  There are 4 states:
     *      IDLE   -> default state of map
     *      EDIT   -> modifying a pre-existing element
     *      INSERT -> after the drawing prossess has finished
     *      DRAW   -> placing/describing the element on the map
     *
     * state.exportToDot() to see states
     *
     * NOTE: I dont know if forcing values to be passed to FSM to guaranty correctness is the
     * right thing to do. It confuses the logic a bit but it might be worth is.
     * Needs testing.
     *  ---
     * After using i can confirm that it is indeed better, there is one place where state can change and
     * i can monitor and modify easily
     *  ---
     *
     *  It becomes a mess when you want to do more tha a few things on state change ( ex from edit to delete an element ) , maybe in the future
     *  i will document parameters given and recieve callbacks as arguments to call with said parameters
     *
     *
     *  ---
     * */
    const stateMachine = useFSM({
        IDLE: {
            IDLE: {
                onTransition: () => {
                    console.info('IDLE -> IDLE: Do nothing')
                }
            },
            DRAW: {
                onTransition: (elementSeed) => {
                    console.info('IDLE -> DRAW: Save `metadata` to `currentElement`')
                    _startDrawElement(elementSeed)
                    // currentElement.value = reactive(MapElement.fromSeed(elementSeed))
                }
            },
            EDIT: {
                onTransition: (layer) => {
                    console.info('IDLE -> EDIT: Set `currentElement` to selected element for editing');

                    _startEditElement(layer)

                    //
                    // const map_element = elements.value.get(layer)
                    // bakElement.value = MapElement.fromClone(map_element)
                    // currentElement.value = map_element
                    //
                    // const isCamera = map_element.geometry.subtype === "Circle" && map_element.properties.element.category !== "AREA"
                    // layer.pm.enable({
                    //     allowEditing: !isCamera,
                    //     draggable: true
                    // })
                    //
                }
            }
        },
        EDIT: {
            IDLE: {
                onTransition: (submitted) => {
                    console.info('EDIT -> IDLE: ');

                    disableAllModes()

                    _endEditElement(submitted)

                    // disableAllModes()
                    // if (submitted) {
                    //     elementPOST(currentElement.value)
                    //     console.info('Edit was completed. Save state to Server.');
                    // } else {
                    //     console.info('Cancel Edit, Restore pre-Edit state. Clear `currentElement`');
                    //     notify({ img: "/icons/warning.svg", title: "Editing", message: "Editing of the element has been canceled. Restoring original state..." })
                    //     bakElement.value.reflectToLayer()
                    //     currentElement.value.restoreAttributes(bakElement.value)
                    // }
                    //
                    // currentElement.value = null
                    // bakElement.value = null
                }
            },
            DRAW: {
                onTransition: (/** @type {MapElement_seed_type} */ elementSeed) => {
                    console.info('EDIT -> DRAW: Save `metadata` to `currentElement`')

                    // console.info("Cancel Edit, Restore pre-Edit state")
                    // notify({ img: "/icons/warning.svg", title: "Editing", message: "Editing of the element has been canceled. Restoring original state..." })
                    //
                    // bakElement.value.reflectToLayer()
                    // currentElement.value.restoreAttributes(bakElement.value)
                    // bakElement.value = null

                    _endEditElement(false)
                    _startDrawElement(elementSeed)

                    // currentElement.value = reactive(MapElement.fromSeed(elementSeed))
                }
            },
            EDIT: {

                onTransition: (/** @type {string | L.Layer} */ layer) => {
                    console.info('EDIT -> EDIT: Cancel Edit, Restore pre-Edit state. Clear `currentElement`.If other element selected set `currentElement` to selected element for editing ');
                    _endEditElement(false)
                    _startEditElement(layer)

                    // notify({ img: "/icons/warning.svg", title: "Editing", message: "Editing of the element has been canceled. Restoring original state..." })
                    //
                    // currentElement.value.restoreAttributes(bakElement.value)
                    //
                    // const map_element = elements.value.get(layer)
                    // bakElement.value = MapElement.fromClone(map_element)
                    // currentElement.value = map_element
                }
            }
        },
        INSERT: {
            IDLE: {
                onTransition: (/** @type {boolean} */ submitted) => {
                    console.info('INSERT -> IDLE: Remove layer from map, clear `currentElement` \n - OR - \n Insert was completed. Save state to Server.');

                    _endInsertElement(submitted)
                    // if (submitted) {
                    //     elementPOST(currentElement.value)
                    // } else {
                    //     notify({ img: "/icons/warning.svg", title: "Inserting", message: "Inserting of the element has been canceled." })
                    //     currentElement.value.layer.remove()
                    // }
                    //
                    // currentElement.value = null
                    disableAllModes()
                }
            },
            DRAW: {
                onTransition: (elementSeed) => {
                    console.info('INSERT -> DRAW: Remove layer from map, clear `currentElement`. Save `metadata` to `currentElement`')

                    _endInsertElement(false)

                    // notify({ img: "/icons/warning.svg", title: "Inserting", message: "Inserting of the element has been canceled." })
                    // currentElement.value.layer.remove()
                    _startDrawElement(elementSeed)
                    // currentElement.value = reactive(MapElement.fromSeed(elementSeed))
                }
            },
            EDIT: {
                onTransition: (layer) => {
                    console.info('INSERT -> EDIT: Remove layer from map. Set `currentElement` to newly selected element for editing');
                    _endInsertElement(false)
                    // notify({ img: "/icons/warning.svg", title: "Inserting", message: "Inserting of the element has been canceled." })
                    // currentElement.value.layer.remove()
                    _startEditElement(layer)

                    // const map_element = elements.value.get(layer)
                    // bakElement.value = MapElement.fromClone(map_element)
                    // currentElement.value = map_element
                }
            },
        },
        DRAW: {
            IDLE: {
                onTransition: () => {
                    console.info('DRAW -> IDLE: Do nothing');
                    _endDrawElement()
                    // notify({ img: "/icons/warning.svg", title: "Drawing", message: "Drawing of the element has been canceled." })
                    // currentElement.value = null
                }
            },
            DRAW: {
                onTransition: (elementSeed) => {
                    console.info('DRAW -> DRAW: Do nothing')
                    _endDrawElement()
                    _startDrawElement(elementSeed)
                    // notify({ img: "/icons/warning.svg", title: "Drawing", message: "Drawing of the element has been canceled." })
                }
            },
            INSERT: {
                onTransition: (/** @type {L.Layer} */ layer) => {
                    console.info('DRAW -> INSERT: Successfully drew element. Set `currentElement` to newly created element.');
                    _startInsertElement(layer)
                    // currentElement.value.layer = markRaw(layer)
                    // const map_element = currentElement.value
                    // const isCamera = map_element.geometry.subtype === "Circle" && map_element.properties.element.category !== "AREA"
                    // layer.pm.enable({
                    //     allowEditing: !isCamera,
                    //     draggable: true
                    // })
                }
            },
            EDIT: {
                onTransition: (layer) => {
                    console.info('DRAW -> EDIT: Set `currentElement` to newly selected element for editing');
                    _endDrawElement()
                    // notify({ img: "/icons/warning.svg", title: "Drawing", message: "Drawing of the element has been canceled." })

                    _startEditElement(layer)
                    // const map_element = elements.value.get(layer)
                    // bakElement.value = MapElement.fromClone(map_element)
                    // currentElement.value = map_element
                }
            },
        }
    }, 'IDLE');

    /** Element Create/Edit POST*/
    function elementPOST(element) {
        let payload = toRaw(element)

        const action = payload._id ? "Editing" : "Inserting"
        // NOTE: in the future i want to streamline this better , but to avoid a lot of duplicating code from leaflet and
        // bugs from failing to do so , i just get the geojson and just get the coords.
        // see leaflet/src/layer/GeoJSON.js - *.toGeoJSON
        const geojson = element.layer.toGeoJSON()
        const geometry = {
            ...payload.geometry,
            coordinates: geojson.geometry.coordinates
        }
        payload = {
            type: "Feature",
            _id: payload._id,
            geometry,
            properties: payload.properties
        }

        element.layer.pm.disable()
        if( !payload.properties.element.active )
            element.layer.remove()

        loading.value = true
        laravelServer.CASE_ELEMENT.POST.single(payload)
            .catch((error) => {
                notify({ img: "/icons/failure.svg", title: action, message: `${action} of the element was unsuccessful.` })
            }).finally(() => {
                loading.value = false
            })
    }
    /** POST Element Delete */
    function elementDELETE(id) {
        if (!id) {
            console.error("No Element ID provided")
            return
        }
        laravelServer.CASE_ELEMENT.DELETE.single(id)
            .catch((error) => {
                notify({ img: "/icons/failure.svg", title: 'Delete', message: `Deletion of the element was unsuccessful.` })
            })
            .finally(() => {
                loading.value = false
            })
    }

    /** Map Clear */
    function wipeElements() {
        elements.value.forEach((value, key) => {
            value.layer.remove()
        })
        elements.value.clear()
    }

    /**
     * The map is basically just an interactive visualisation of the case,
     * as soon as a case changes the map should reflect that
     * */
    watch(() => srvCaseStore.selectedSrvCase, (after, before) => {
        wipeElements()
        notify({ img: "/icons/case_dark.svg", title: "Case Changed", message: "Loaded new case map visualisation" })

        loading.value = true

        serveApi.get(`/serve/elements-by-case/${srvCaseStore.selectedSrvCase}`)
            .then((value) => {
                const features = [];
                for (const element of value) {

                    const feature = {
                        _id: element._id,
                        type: "Feature",
                        geometry: element.geometry,
                        properties: element.properties
                    };
                    features.push(feature);

                };
                const featureCollection = { type: "FeatureCollection", features: features }
                importGeoJson(featureCollection)
            })
            .catch((reason) => console.log(reason))
            .finally(() => loading.value = false)
    });

    /** @type {import('vue').ShallowRef<( L.Map | null )>}
     *  NOTE: https://stackoverflow.com/questions/65981712/uncaught-typeerror-this-map-is-null-vue-js-3-leaflet
     * */
    const map = shallowRef(null);
    const mapHTMLElement = ref(null);
    const isInitialized = ref(false);
    const last_map_bounds = ref(null) // used for caching map position

    /** Function to initialize the map
     *  @param {( string | HTMLElement  )} mapElement  {}
     *  @param {L.LatLngExpression} centerLocation
     *  @throws Will throw an error if map failed to initialize
     */
    function initializeMap(mapElement, centerLocation) {
        if (isInitialized.value) {
            // map.value.invalidateSize();
            console.log("Leaflet Map tried to be RE-initialized, returning")
            return;
        }

        try {
            mapHTMLElement.value = typeof mapElement === "string" ? document.getElementById(mapElement) : mapElement
            // CREATE LAYERS
            const layer_streets = L.tileLayer(
                'https://api.mapbox.com/styles/v1/{username}/{style_id}/tiles/{z}/{x}/{y}?access_token={accessToken}',
                {
                    maxZoom: 20,
                    // @ts-ignore
                    username: 'mapbox',
                    style_id: 'streets-v12',
                    tileSize: 512,
                    zoomOffset: -1,
                    accessToken: import.meta.env.VITE_MAPBOX_ACCESS_TOKEN
                }
            )

            const layer_satelite = L.tileLayer(
                'https://api.mapbox.com/styles/v1/{username}/{style_id}/tiles/{z}/{x}/{y}?access_token={accessToken}',
                {
                    maxZoom: 20,
                    // @ts-ignore
                    username: 'mapbox',
                    style_id: 'satellite-v9',
                    tileSize: 512,
                    zoomOffset: -1,
                    accessToken: import.meta.env.VITE_MAPBOX_ACCESS_TOKEN
                }
            )
            const layer_nav_light = L.tileLayer(
                'https://api.mapbox.com/styles/v1/{username}/{style_id}/tiles/{z}/{x}/{y}?access_token={accessToken}',
                {
                    maxZoom: 20,
                    // @ts-ignore
                    username: 'mapbox',
                    style_id: 'navigation-day-v1',
                    tileSize: 512,
                    zoomOffset: -1,
                    accessToken: import.meta.env.VITE_MAPBOX_ACCESS_TOKEN
                }
            )
            const layer_nav_dark = L.tileLayer(
                'https://api.mapbox.com/styles/v1/{username}/{style_id}/tiles/{z}/{x}/{y}?access_token={accessToken}',
                {
                    maxZoom: 20,
                    // @ts-ignore
                    username: 'mapbox',
                    style_id: 'navigation-night-v1',
                    tileSize: 512,
                    zoomOffset: -1,
                    accessToken: import.meta.env.VITE_MAPBOX_ACCESS_TOKEN
                }
            )
            const layer_dark = L.tileLayer(
                'https://api.mapbox.com/styles/v1/{username}/{style_id}/tiles/{z}/{x}/{y}?access_token={accessToken}',
                {
                    maxZoom: 20,
                    // @ts-ignore
                    username: 'mapbox',
                    style_id: 'dark-v11',
                    tileSize: 512,
                    zoomOffset: -1,
                    accessToken: import.meta.env.VITE_MAPBOX_ACCESS_TOKEN
                }
            )
            const layer_light = L.tileLayer(
                'https://api.mapbox.com/styles/v1/{username}/{style_id}/tiles/{z}/{x}/{y}?access_token={accessToken}',
                {
                    maxZoom: 20,
                    // @ts-ignore
                    username: 'mapbox',
                    style_id: 'light-v11',
                    tileSize: 512,
                    zoomOffset: -1,
                    accessToken: import.meta.env.VITE_MAPBOX_ACCESS_TOKEN
                }
            )
            // // SLOW
            // const layer_topology = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
            //     maxZoom: 20,
            //     tileSize: 512,
            //     zoomOffset: -1,
            //     attribution: 'Map data: © OpenStreetMap contributors, SRTM | Map style: © OpenTopoMap (CC-BY-SA)'
            //
            // });
            // const googleStreets = L.tileLayer('http://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
            //     maxZoom: 20,
            //     tileSize: 512,
            //     subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
            // });

            // INIT MAP
            map.value = L.map(mapElement, {
                attributionControl: false,
                layers: [layer_streets]
            }).setView(centerLocation, 13);

            L.control.layers({
                "<span class='text-lg'>Streets</span>": layer_streets,
                "<span class='text-lg'>Satelite</span>": layer_satelite,
                // "<span class='text-lg'>Light</span>": layer_light,
                // "<span class='text-lg'>Dark</span>": layer_dark,
                // "<span class='text-lg'>Nav Light</span>": layer_nav_light,
                // "<span class='text-lg'>Nav Dark</span>": layer_nav_dark,
            }, {}, { position: "topleft" }).addTo(map.value);


            // ADD CUSTOM ATTRIBUTION CONTROL
            L.control
                .attribution({
                    position: 'bottomright', // Position of the attribution
                    prefix: false // Remove the default "Leaflet" text
                })
                .addTo(map.value)
                .addAttribution('SERVE App ' + 'Imagery © <a href="https://www.mapbox.com/">Mapbox</a>');

            map.value.pm.addControls({
                position: 'topleft',
                drawMarker: false,
                drawPolygon: false,
                drawPolyline: false,
                drawCircle: false,
                drawRectangle: false,
                drawCircleMarker: false,
                editMode: false,
                dragMode: false,
                cutPolygon: false,
                removalMode: false,
                drawText: false,
                rotateMode: false,
            })
            // DEFAULTS
            map.value.pm.setPathOptions({
                // snapDistance: 10,
                color: "orange",
                weight: 5
                // className: "animate-pulse",
            });
            map.value.pm.setGlobalOptions({
                markerEditable: false,
                continueDrawing: false
            });

            // MAP EVENTS
            map.value.on('pm:create', _onCreate)
            map.value.on('baselayerchange', (e) => console.log('Base Layer Changed', e))
            // map.value.on('layeradd', (layer)=>console.log(layer))
            // map.value.on('rightclick', (e) => { L.DomEvent.preventDefault(e); console.log(e) })

            // Need HTML element for events, leaflet does not expose
            // needed events
            // https://leafletjs.com/reference.html#map-click

            mapHTMLElement.value.ondragover = function (e) {
                e.preventDefault()
                e.dataTransfer.dropEffect = "copy"
            }

            mapHTMLElement.value.ondrop = function (e) {
                e.preventDefault()
                try {
                    const elementSeed = JSON.parse(e.dataTransfer.getData("map.insert"));
                    stateMachine.transition("DRAW", elementSeed)
                    const latlng = map.value.mouseEventToLatLng(e)
                    const buttonData = [
                        { id: 'map.marker_button', imgSrc: '/icons/shapes/Marker.svg', alt: 'risk', onClick: drawMarker, shapes: ["POINT"] },
                        { id: 'map.circle_button', imgSrc: '/icons/shapes/Ellipse.svg', alt: 'risk', onClick: drawCircle, shapes: ["CIRCLE", "SECTOR"] },
                        { id: 'map.rectangle_button', imgSrc: '/icons/shapes/Rectangle.svg', alt: 'risk', onClick: drawRectangle, shapes: ["RECTANGLE"] },
                        { id: 'map.polygon_button', imgSrc: '/icons/shapes/Polygon.svg', alt: 'impact', onClick: drawPolygon, shapes: ["POLYGON"] },
                        { id: 'map.line_button', imgSrc: '/icons/shapes/line.svg', alt: 'attractiveness', onClick: drawLine, shapes: ["POLYLINE"] }
                    ].filter(button => {
                        const shapes = button.shapes;
                        return shapes.some(shape => elementSeed.shapes.includes(shape));
                    });

                    // Bypass menu selection if only one type available
                    if (buttonData.length === 1) {
                        buttonData[0].onClick()
                        // Simulate a map click at the specified location
                        map.value.fire('click', {
                            latlng: L.latLng(latlng),
                            layerPoint: map.value.latLngToLayerPoint(latlng),
                            containerPoint: map.value.latLngToContainerPoint(latlng),
                        });

                        return
                    }

                    const insertPopup = L.popup(
                        { maxWidth: 500, minWidth: 200 }
                    )
                    .setLatLng(latlng)
                    .setContent(_makeButtonsRawHTML(buttonData))
                    .openOn(map.value)

                    /**
                     * BUG: Doesnt register click event the second time
                     * Drag-Drop to open menu
                     * without closing
                     * Drag-Drop again to open menu
                     * Observe no click event
                     */
                    buttonData.forEach(button => {
                        const button_element = document.getElementById(button.id)
                        button_element.addEventListener("click", function () {
                            insertPopup.close();

                            button.onClick();
                            // Simulate a map click at the specified location
                            map.value.fire('click', {
                                latlng: L.latLng(latlng),
                                layerPoint: map.value.latLngToLayerPoint(latlng),
                                containerPoint: map.value.latLngToContainerPoint(latlng),
                            });
                        })
                    });

                } catch (e) {
                    console.log("ERROR:: Failed to collect data from Drag'n'Drp operation: ", e)
                    stateMachine.transition("IDLE")
                }
            }

            isInitialized.value = true;

            if (last_map_bounds.value) {
                map.value.fitBounds(last_map_bounds.value)
            }
            if (elements.value.size !== 0) {
                for (const map_element of elements.value.values()) {
                    if (map_element.properties.element.active) {
                        map.value.addLayer(map_element.layer)
                    }
                }
            } else {
                // map.value.locate({ setView: true })
                // console.log("No Elements in Case")
            }

            // console.log("Map Init Success:", map.value)
        } catch (error) {
            console.log("Map Init Fail:", error)
        }
    }
    /** Function to uninitialize the map */
    function uninitializeMap() {
        if (isInitialized.value) {
            last_map_bounds.value = map.value.getBounds()
            map.value.remove()
            isInitialized.value = false
        }
        window.removeEventListener('keydown', handleKeyDown)
    }

    /** MAP EVENTS: On Layer Created */
    /** @type {L.PM.CreateEventHandler}*/
    function _onCreate(e) {
        console.log("ONCREATE: ", e);

        e.layer.pm.enable()
        const elementData = currentElement.value.properties.element
        const elementStyle = currentElement.value.properties.style
        stateMachine.transition("INSERT", e.layer)
        const isArea = elementData.category === "AREA"
        const isOpenArea = elementData.type === "OPEN"

        if (e.shape === "Circle") {

            const circleLayer = /** @type {L.Circle} */ (e.layer);

            currentElement.value.geometry.type = "Point"
            currentElement.value.geometry.radius = circleLayer.options.radius
            currentElement.value.geometry.subtype = "Circle"
            currentElement.value.geometry.coordinates = circleLayer.getLatLng()

            if (!isArea) {

                const circle = e.target.pm.Draw.Circle
                const pointer = circle._hintMarker._latlng
                const center = circle._centerMarker._latlng
                const dy = pointer.lng - center.lng;
                const dx = pointer.lat - center.lat;

                let newAngle = Math.atan2(dy, dx) * (180 / Math.PI);
                if( newAngle < 0 ) newAngle += 360;

                currentElement.value.properties.attributes.orientation = Math.round(newAngle)
                currentElement.value.properties.attributes.range = { min: 0, max: Math.round(circleLayer.options.radius) }

                // const isCamera = map_element.geometry.subtype === "Circle" && map_element.properties.element.category !== "AREA"
                // if (isCamera) {
                //     circle._hintMarker.off();
                //     circle._hintMarker.dragging.disable();
                // }
                // console.log(newAngle)

            }

            _setCircleStyle(circleLayer, elementData, elementStyle)

        }
        if (e.shape === "Marker") {

            const markerLayer = /** @type {L.Marker} */ (e.layer);

            currentElement.value.geometry.type = "Point"
            currentElement.value.geometry.coordinates = markerLayer.getLatLng()

            _setMarkerStyle(markerLayer, elementStyle)
        }
        if (e.shape === "Polygon" || e.shape === "Rectangle") {

            const polygonLayer = /** @type {L.Polygon} */ (e.layer);
            currentElement.value.geometry.type = "Polygon"
            currentElement.value.geometry.coordinates = polygonLayer.getLatLngs()

            _setPolygonStyle(polygonLayer, elementData, elementStyle)

        }
        if (e.shape === "Line") {
            const polylineLayer = /** @type {L.Polyline} */ (e.layer);
            currentElement.value.geometry.type = "LineString"
            currentElement.value.geometry.coordinates = polylineLayer.getLatLngs()

            _setLineStyle(polylineLayer, elementStyle)

        }

        e.layer.bindTooltip(elementData.title, { permanent: false, direction: 'top' })

        // https://leafletjs.com/reference.html#interactive-layer-contextmenu
        e.layer.on('contextmenu', _onLayerRightClick)
        e.layer.on('pm:edit', _onEdit)
    }

    /** On Layer Created Styles */
    /**
     * @param {L.Polyline} layer
     * @param {MapElement_style_type} style
     */
    function _setLineStyle(layer, style) {
        if (style.icon) {
            layer.setImg(ROOT_URL + style.icon, {
                width: 30,    // Custom width for the image
                height: 30,   // Custom height for the image
                below: true,
                repeat: true,
            })
        }
    }
    /**
     * @param {L.Marker} layer
     * @param {MapElement_style_type} style
     */
    function _setMarkerStyle(layer, style) {
        if (style.icon) {
            const icon = L.icon({
                iconUrl: ROOT_URL + style.icon,
                className: "rounded-full bg-gray-100 m-1",
                iconSize: [30, 30], // Size of the icon
                iconAnchor: [15, 30] // Anchor point of the icon
            })
            layer.setIcon(icon);
        }

    }
    /**
     * @param { L.Circle } layer
     * @param {MapElement_element_type} element
     * @param {MapElement_style_type} style
     */
    function _setCircleStyle(layer, element, style) {

        const isArea = element.category === "AREA"
        const isOpenArea = element.type === "OPEN"

        if (!isArea) {
            layer.setCentroidImg(ROOT_URL + style.icon, { width: 30, height: 30 })
        }

        layer.setStyle({
            // className: "temp-shape",
            // color: "red",
            // fillPattern: {
            //     color: "red"
            // },
            // fillImg: '/icons/shapes/stripe.svg',
            dashArray: isOpenArea ? "5,1,4" : undefined,
            fill: true,
            fillOpacity: 0.5,

        })

    }
    /**
     * @param { L.Polygon } layer
     * @param {MapElement_element_type} element
     * @param {MapElement_style_type} style
     */
    function _setPolygonStyle(layer, element, style) {

        const isArea = element.category === "AREA"
        const isOpenArea = element.type === "OPEN"

        if (!isArea) {
            layer.setCentroidImg(ROOT_URL + style.icon, { width: 30, height: 30 })
        }

        layer.setStyle({
            // className: "temp-shape",
            // color: "red",
            // fillPattern: {
            //     color: "red"
            // },
            // fillImg: '/icons/shapes/stripe.svg',
            dashArray: isOpenArea ? "5,1,4" : undefined,
            fill: true,
            fillOpacity: 0.5,

        })

    }

    /** MAP EVENTS: On Layer Right Click */
    function _onLayerRightClick(layer) {
        if (layer !== currentElement.value?.layer) {
            stateMachine.transition('EDIT', layer)
            L.DomEvent.stopPropagation(event)
        }
        centerToLayer(layer)

        // layer.pm.toggleEdit()
        window.addEventListener('keydown', handleKeyDown)
    }

    /** MAP EVENTS: On Layer Editing */
    /**
     * @type {L.PM.EditEventHandler}
     * On edit update MapElements data to the latest edited by the user
     */
    function _onEdit(layer) {
        const map_element = elements.value.get(layer) ?? currentElement.value
        map_element.geometry.coordinates = layer.getLatLng?.() ?? layer.getLatLngs?.()
    };

    /** On DragDrop PopUp Buttons */
    /**
     * @param {{ id: string,
     *          imgSrc: string,
     *          alt: string,
     *          onClick: () => void,
     *          shapes: string[],
     *      }[]} buttonData
     * @returns {string}
     */
    function _makeButtonsRawHTML(buttonData) {
        let res = `<div class="flex w-full items-center justify-center gap-1 ">`;
        buttonData.forEach(button => {
            res += `<button id="${button.id}" class="py-1 px-2 rounded-md hover:bg-gray-200">`
            res += `<div class="flex flex-col justify-center items-center">`
            res += `<img class="h-5 w-5" src="${button.imgSrc}" alt="${button.alt}">`
            res += `</div>`
            res += `</button>`
        });
        res += `</div>`
        return res
    }

    /** Import from JSON File */
    /**
     * Imports GeoJSON data to the map, adding layers based on the GeoJSON features.
     * Circle is handled by a special case
     * @param { Object | File } geoJson - The GeoJSON object to import.
     */
    function importGeoJson(geoJson, forceSave = false) {
        // console.log('Importing GeoJSON:', geoJson)
        
        if (geoJson instanceof File) {
            const reader = new FileReader();
            reader.readAsText(geoJson, 'UTF-8');
            reader.onload = (e) => {
                try {
                    const json = JSON.parse(e.target.result);
                    console.log('GeoJSON content:', json);
                    _importGeoJson(json, forceSave)
                } catch (error) {
                    console.error('Error parsing GeoJSON file:', error);
                }
            };
        } else {
            _importGeoJson(geoJson, forceSave)
        }
    }
    /** Import JSON to MAP */    
    /** @type {import('vue').Ref<Object<String, L.GeoJSON>>}
     *  A maping of all the elements of the case by ID
     * */
    const importFeatureBuffer = ref({area_buffer: [], obs_buffer: [], sfg_buffer: [], hbx_buffer: []})

    function _importGeoJson(geoJson, forceSave = false) {

        var importFeatureCollections = {
            area_imports: null, // Area Elements (Low Prio)
            obs_imports: null, // Obstacle Elements (Mid Prio)
            sfg_imports: null, // Safeguard Elements (High Prio)
            hbx_imports: null, // Hitboxable Elements (Highest Prio)
            ply_imports: null, // Player Elements
        }

        importFeatureCollections.area_imports = {
            type: 'FeatureCollection',
            features: geoJson.features.filter( ft => ft.properties.element.category === 'AREA')
        }
        importFeatureBuffer.value.area_buffer.push(featureCollectionToGeoJSON(importFeatureCollections.area_imports, forceSave))

        importFeatureCollections.obs_imports = {
            type: 'FeatureCollection',
            features: geoJson.features.filter( ft => ft.properties.element.category === 'OBS')
        }
        importFeatureBuffer.value.obs_buffer.push(featureCollectionToGeoJSON(importFeatureCollections.obs_imports, forceSave))
        
        importFeatureCollections.sfg_imports = {
            type: 'FeatureCollection',
            features: geoJson.features.filter( ft => {
                return ft.properties.element.category === 'SFG' && 
                    ft.geometry.subtype !== 'Circle' &&
                    ft.properties.element.active
            })
        }
        importFeatureBuffer.value.sfg_buffer.push(featureCollectionToGeoJSON(importFeatureCollections.sfg_imports, forceSave))
        
        importFeatureCollections.hbx_imports = {
            type: 'FeatureCollection',
            features: geoJson.features.filter( ft => {
                return ft.properties.element.category === 'SFG' && 
                    ft.geometry.subtype === 'Circle' &&
                    ft.properties.element.active
            })
        }
        importFeatureBuffer.value.hbx_buffer.push(featureCollectionToGeoJSON(importFeatureCollections.hbx_imports, forceSave, true))
        
        importFeatureCollections.ply_imports = {
            type: 'FeatureCollection',
            features: geoJson.features.filter( ft => ft.properties.element.category === 'PLY')
        }
        importFeatureBuffer.value.hbx_buffer.push(featureCollectionToGeoJSON(importFeatureCollections.ply_imports, forceSave, true))

        function featureCollectionToGeoJSON(cf, forceSave, skip_events = false) {
            return L.geoJSON(cf, {
                onEachFeature: function (feature, layer) {
                    const element = feature.properties.element
                    console.assert(srvCaseStore.selectedSrvCase, "Importing elements without a Case should never happen")
                    element.case_id = srvCaseStore.selectedSrvCase
                    const style = feature.properties.style
                    feature.properties.interactive = true
                    
                    if( !skip_events ) {
                        layer.on('pm:edit', () => _onEdit(layer))
                        layer.on('contextmenu', () => _onLayerRightClick(layer))
                    }
    
                    switch (feature.geometry.type) {
                        case 'LineString':
                            {
                                const polylineLayer = /** @type L.Polyline*/ (layer)
                                _setLineStyle(polylineLayer, style)
                                break;
                            }
                        case 'Point':
                            {
                                if (feature.geometry.subtype === "Circle") {
                                    if( feature.properties.element.category === "SFG") {
                                        /** 
                                         * Make Safeguard Circles non-interactive
                                         * in order to minimize their effective size
                                         * Also hide its actual area
                                         */
                                        feature.properties.interactive = false
                                        feature.properties.style.fillOpacity = 0
                                        feature.properties.style.opacity = 0
                                    }
                                    const circleLayer = /** @type L.Circle*/ (layer)
                                    _setCircleStyle(circleLayer, element, style)
                                } else {
                                    const markerLayer = /** @type L.Marker*/ (layer)
                                    _setMarkerStyle(markerLayer, style)
                                }
                                break;
                            }
                        case 'Polygon':
                            {
                                const polygonLayer = /** @type L.Polygon */ (layer)
                                _setPolygonStyle(polygonLayer, element, style)
                                break;
                            }
                        default:
                            {
                                console.error("UNHANDLED GEOMETRY TYPE")
                                break;
                            }
                    }
    
                    // NOTE: USE THE LEAFLET STANDARD FOR COORDS FOR EASIER MANIPULATIONS
                    // swap back to geojson for POST
                    // WHY: https://macwright.com/lonlat/
                    // const geometry = { ...feature.geometry, coordinates: layer.getLatLng?.() ?? layer.getLatLngs?.() }
    
                    const new_element = new MapElement(
                        feature._id,
                        layer,
                        feature.properties,
                        geo2leaf_geometry(feature.geometry)
                    )
    
                    /** If ForceSaving, remove from map and let the Socket case_id.element_add take the reins */
                    if( forceSave ) {
                        elementPOST(new_element)
                        layer.remove()
                    }
                    /** Else Properly insert the Element to the Map & Cache, until further notice */
                    else {
                        _mapElementInsert(new_element)
                        new_element.reflectToLayer()
                    }
                },
                pointToLayer: function (feature, latlng) {
    
                    const element = feature.properties.element
                    const style = feature.properties.style
    
                    const geometry = feature.geometry
                    if (geometry?.subtype === "Circle") {
    
                        const circle = L.circle(latlng, { radius: (geometry.radius) })
                        return circle;
    
                    } else if (geometry.type === "Point") {
                        const icon = L.icon({
                            iconUrl: ROOT_URL + style.icon,
                            iconSize: [30, 30], // Size of the icon
                            iconAnchor: [15, 30] // Anchor point of the icon
                        })
                        return L.marker(latlng, {
                            icon
                        });
                    }
                    else {
                        return L.marker(latlng);
                    }
                },
            })
        }
    }
    /** Export to JSON File */
    /**
     * Exports the current layers of the map to a GeoJSON object.
     * Circle is handled by a special case
     * @returns {Object} The GeoJSON object representing the layers on the map.
     */
    function exportGeoJson() {
        const features = [];
        // PERF: maybe in the future use FeatureGroups of LayerGroups
        // to seperate neatly the layers and access them faster
        // ex. insertedGroup, importedGroup , etc
        for (const element of elements.value.values()) {

            const geojson = element.layer.toGeoJSON()
            const geometry = {
                ...element.geometry,
                coordinates: geojson.geometry.coordinates
            }
            const feature = {
                type: "Feature",
                geometry,
                properties: element.properties
            };
            features.push(feature);

        };

        const featureCollection = { type: "FeatureCollection", features: features }
        console.log(featureCollection)
        return featureCollection;
    }

    /** On Map Initialized */
    watch(() => [isInitialized.value, importFeatureBuffer.value], () => {
        if (isInitialized.value && map.value) {
            featureCollectionAddHitbox(importFeatureBuffer.value.hbx_buffer)
            _addToMap()
        }
    }, {deep: true})
    
    /**
     * Has to happen BEFORE any _addToMap() call
     */
    function featureCollectionAddHitbox(cf) {
        cf.forEach(ft => {
            ft.eachLayer( layer => {
                const mapElement = elements.value.get(layer)
                
                if( mapElement.geometry.subtype !== 'Circle' || 
                    mapElement.properties.element.category !== "SFG" || 
                    !mapElement.properties.element.active ) return
                    
                // Create a smaller GeoJSON circle using Turf.js
                const geoJsonFeature = layer.toGeoJSON();
                const smallBuffer = turf.buffer(geoJsonFeature, 2, 'meters');
            
                // Convert it back to a Leaflet layer for interactions
                const interactionLayer = L.geoJSON(smallBuffer, {
                    style: { opacity: 0, fillOpacity: .03 },
                }).addTo(map.value);

                let force_show = false
                
                interactionLayer.on('pm:edit', () => _onEdit(layer))
                interactionLayer.on('click', () => {
                    force_show = !force_show
                    toggleShowSector(interactionLayer, mapElement, true, force_show)
                })
                interactionLayer.on('contextmenu', () => {
                    force_show = true
                    toggleShowSector(interactionLayer, mapElement, true, force_show)
                    _onLayerRightClick(layer)
                })

                interactionLayer.on('mouseover', e => toggleShowSector(interactionLayer, mapElement, true, force_show))
                interactionLayer.on('mouseout', e => toggleShowSector(interactionLayer, mapElement, false, force_show))
            })
        });

        function toggleShowSector(layer, el, show = false, force_show = false) {
            if(!el.properties.element.active) {
                layer.remove()
                return
            }

            if( show || force_show ) {
                el.properties.style.fillOpacity = 1
                el.properties.style.opacity = 1
                el.reflectToLayer()
            } else {
                el.properties.style.fillOpacity = 0
                el.properties.style.opacity = 0
                el.reflectToLayer()
            }
        }
    }
    /**
     * Access Import Buffer and Add Elements to MAP
     * Then Clear Buffer
     * Then? Move Camera to Last Element Layer
     */
    async function _addToMap(moveCamera = true) {
        /** Insert the Areas to the Map */
        importFeatureBuffer.value.area_buffer.forEach(geojson => {
            // console.log('<Adding to Map>', geojson)
            geojson.addTo(map.value)
            // PERF: this is not the best for performance
            elements.value.forEach((element) => element.reflectToLayer())
        })
        importFeatureBuffer.value.area_buffer.length = 0

        await nextTick()

        /** Insert the Obstacles to the Map */
        importFeatureBuffer.value.obs_buffer.forEach(geojson => {
            // console.log('<Adding to Map>', geojson)
            geojson.addTo(map.value)
            // PERF: this is not the best for performance
            elements.value.forEach((element) => element.reflectToLayer())
        })
        importFeatureBuffer.value.obs_buffer.length = 0
        
        await nextTick()

        /** Insert the Safeguards to the Map */
        importFeatureBuffer.value.sfg_buffer.forEach(geojson => {
            // console.log('<Adding to Map>', geojson)
            geojson.addTo(map.value)
            // PERF: this is not the best for performance
            elements.value.forEach((element) => element.reflectToLayer())
        })
        importFeatureBuffer.value.sfg_buffer.length = 0

        await nextTick()

        /** Insert the Safeguards to the Map */
        importFeatureBuffer.value.hbx_buffer.forEach(geojson => {
            // console.log('<Adding to Map>', geojson)
            geojson.addTo(map.value)
            // PERF: this is not the best for performance
            elements.value.forEach((element) => element.reflectToLayer())
        })
        importFeatureBuffer.value.hbx_buffer.length = 0

        if(moveCamera) goToLastElement()
    }

    /** Map Draw Type Callbacks */
    function drawMarker() {
        _enableDraw("Marker")
    }
    function drawRectangle() {
        _enableDraw("Rectangle")
    }
    function drawCircle() {
        // map.value.once("pm:vertexadded", ({ shape, workingLayer, marker, latlng }) => {
        //
        //     debugger
        //     console.log("===============>>>", shape, workingLayer, marker, latlng)
        // })
        _enableDraw("Circle")
    }
    function drawLine() {
        _enableDraw("Line")
    }
    function drawPolygon() {
        _enableDraw("Polygon")
    }
    /** Map Draw Type Action */
    /**
     * Internal function to enable drawing of shapes on Map
     * using geoman.
     * @param {"Marker"|"Polygon"|"Line"|"Circle"|"Rectangle"} shape
    */
    function _enableDraw(shape) {
        if (!isInitialized.value) {
            console.log(`Map is not yet initialized, cant draw ${shape}.`)
            return
        }

        map.value.pm.enableDraw(shape, {
            pathOptions: {
                color: "orange",
            }
        })
        window.addEventListener('keydown', handleKeyDown)
    }
    /** Map Draw STOP */
    function disableAllModes() {
        map.value.pm.disableDraw();
        map.value.pm.disableGlobalDragMode();
        map.value.pm.disableGlobalCutMode();
        map.value.pm.disableGlobalRemovalMode();
        map.value.pm.disableGlobalEditMode();
        window.removeEventListener('keydown', handleKeyDown)
    }

    /** On KeyDown Callback Callback */
    function handleKeyDown(event) {
        if (event.key === 'Escape') {
            stateMachine.transition('IDLE', false)
            disableAllModes()
        }
    }

    /** Move Camera to Last Element */
    function goToLastElement() {
        const lastEntry = [...elements.value.entries()]
            .filter(el => el[1].properties.element.active)
            .pop();
        if(lastEntry) centerToLayer(lastEntry[0])
    }

    /** Move Camera to Bounds */
    function centerToBounds(_bounds, point = false, immediate = false) {
        const bounds = L.latLngBounds(_bounds)

        map.value.once("moveend", (e) => _insertAnimatedMarker(bounds.getCenter(), 2000))

        map.value.flyToBounds(bounds, { animate: !immediate })
    }
    /** Move Camera to Lat Lng */
    /**
     * Place center of Map at lat-lng
     * @param {Object} coords
     * @param {Number} coords.lat
     * @param {Number} coords.lng
     * @param {Boolean} immediate - If set to true no animation will be played while moving to coords
     *  */
    function centerToCoordinates({ lat, lng }, immediate = false) {
        const zoom = map.value.getZoom()
        if (immediate) {
            map.value.setView([lat, lng], zoom)
        } else {
            map.value.flyTo([lat, lng], zoom)
        }
    }
    /** Move Camera to Map Layer Element Center */
    function centerToLayer(layer, immediate = false) {
        if (!layer) return

        map.value.once("moveend", (e) => _animateLayer(layer, 5000))

        const zoom = map.value.getZoom()
        const where = layer.getCenter ? layer.getCenter() : layer.getLatLng()
        if (immediate) {
            map.value.setView(where, zoom)
        } else {
            map.value.flyTo(where, zoom)
        }
    }
    /** Move Camera to Map Layer Element Whole */
    function centerToLayerBounds(layer, immediate = false) {
        if (!layer) return

        map.value.once("moveend", (e) => _animateLayer(layer, 5000))

        const bounds = layer.getBounds ? layer.getBounds() : [layer.getLatLng()]
        map.value.flyToBounds(bounds, { animate: !immediate })
    }
    /** Pulse Layer on Map */
    function _animateLayer(layer, duration, cls_anim_type = 'pulse-outline') {
        const layerElement = layer.getElement(); // Get the layer's DOM element

        if (layerElement) {
            // Add the bounce CSS class
            layerElement.classList.add(cls_anim_type);

            // Remove the bounce effect after the specified duration
            setTimeout(() => {
                layerElement.classList.remove(cls_anim_type);
            }, duration);
        }
    }

    /** Local Element Add */
    /** @param {MapElement} map_element  */
    function _mapElementInsert(map_element) {
        elements.value.set(map_element.layer, map_element)
        id_elements.value.set(map_element._id, map_element)
    }
    /** Local Element Remove */
    function _mapElementRemove(id) {
        const element = id_elements.value.get(id)
        if (!element) {
            console.error(`No Element with ID "${id}" found in map`)
            return
        }
        id_elements.value.delete(id)
        elements.value.delete(element.layer)
        element.layer.remove()
    }

    /** Local Insert/Update Single Element Data */
    /** Stops Existing Element Edit Mode before Update */
    function setElement(el_data) {
        let foundMapElement = id_elements.value.get(el_data._id)

        if( foundMapElement ) {
            let foundCachedElement = [...elements.value.entries()].find(el => el[1] === foundMapElement)
            if( !foundCachedElement ) return console.log('WTH ERROR 1')

            /** Stop Edit on Element if was Updated */
            if( currentElement.value === foundCachedElement[1])
                stateMachine.transition("IDLE")

            /** Apply the Updoots */
            nextTick().then(() => {
                foundCachedElement[1].geometry = geo2leaf_geometry(el_data.geometry)
                foundCachedElement[1].properties = el_data.properties
                foundCachedElement[1].reflectToLayer()
            })

            /** Notify Edit or Delete */
            if( el_data.properties.element.active ) {
                notify({
                    img: "/icons/warning.svg",
                    title: "Element Edited",
                    message: `${el_data.properties.element.title} was edited: ${el_data.properties.element.name}`
                })
            } else {
                notify({
                    img: "/icons/warning.svg",
                    title: "Element Deleted",
                    message: `${el_data.properties.element.title} was deleted: ${el_data.properties.element.name}`
                })
            }
        } else {
            notify({
                img: "/icons/success.svg",
                title: "New Element",
                message: `New ${el_data.properties.element.title} was inserted: ${el_data.properties.element.name}`
            })

            const feature = {
                _id: el_data._id,
                type: "Feature",
                geometry: el_data.geometry,
                properties: el_data.properties
            }
            const collection = { type: "FeatureCollection", features: [feature] }
            importGeoJson(collection, false)
        }
    }

    return {
        /** Leaflet Map Stuff */
        loading,

        map,
        initializeMap,
        uninitializeMap,

        /** Map State Machine & Actions */
        stateMachine,
        drawPolygon,
        drawLine,
        drawCircle,
        drawRectangle,
        drawMarker,

        /** Move Map Camera Actions */
        goToLastElement,
        centerToCoordinates,
        centerToLayer,
        centerToLayerBounds,
        centerToBounds,

        /** Case Element Cache */
        currentElement,
        elements,
        id_elements,

        /** Server ADD/EDIT/REMOVE Element */
        elementPOST,
        elementDELETE,

        /** Local ADD/REMOVE Element */
        _mapElementInsert,
        _mapElementRemove,
        /** Local ADD/EDIT Element */
        setElement,

        /** Local Import/Export GeoJSON */
        importGeoJson,
        exportGeoJson,

        /** Map Event Notifications */
        notifications: notifications.notifications,
        notify: notifications.addNotification,
    };


    /**
     * Unused but good to have!
     */

    function _insertAnimatedMarker(where, duration) {

        // Create the marker element with the pulsing class
        const markerIcon = L.icon({
            iconUrl: '/icons/map/marker_fill.svg',
            iconSize: [26, 40],
            shadowUrl: '/icons/map/marker_shadow.svg',
            shadowSize: [90, 87],
        });

        // Add the marker to the map
        const marker = L.marker(where, { icon: markerIcon }).addTo(map.value);
        centerToLayer(marker)

        // Remove the marker after the specified duration
        setTimeout(() => {
            map.value.removeLayer(marker);
        }, duration);
    }
});
