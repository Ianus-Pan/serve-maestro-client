import L from 'leaflet';
import { markRaw, toRaw } from 'vue';

export function geo2leaf_geometry(geometry) {
    const type = geometry.type
    const coords = geometry.coordinates

    let conv_coords = {}
    switch (type) {
        case 'Point':
            conv_coords = L.GeoJSON.coordsToLatLng(coords);
            break;
        case 'LineString':
            conv_coords = L.GeoJSON.coordsToLatLngs(coords, 0);
            break;
        case 'MultiLineString':
            conv_coords = L.GeoJSON.coordsToLatLngs(coords, 1);
            break;
        case 'Polygon':
            conv_coords = L.GeoJSON.coordsToLatLngs(coords, 1);
            break;
        case 'MultiPolygon':
            conv_coords = L.GeoJSON.coordsToLatLngs(coords, 2);
            break;
        default:
            throw new Error('Unhandled GeoJSON object.');
    }
    return { ...geometry, coordinates: conv_coords }

}
export function leaf2geo_geometry(geometry) {
    // TODO:
}

/**
 * Utility function to determine the type of a layer
 * @param {L.Layer} layer
 * @returns {('Circle' | 'Marker' | 'Polygon' | 'Polyline' | null )}
 */
function getLayerType(layer) {
    if (layer instanceof L.Circle) return 'Circle';
    if (layer instanceof L.Marker) return 'Marker';
    if (layer instanceof L.Polygon) return 'Polygon';
    if (layer instanceof L.Polyline) return 'Polyline';
    return null; // Not supported
}

/**
 *
 * @typedef {Object} MapElement_style_type The style of the element.
 * @property {string} icon - The element icon.
 * @property {string} fillColor - The element icon.
 *
 */

/**
 *
 * @typedef {Object} MapElement_element_type The style of the element.
 * @property {string}  type - The element type.
 * @property {boolean} active - The elements state.
 * @property {string}  category - The element category.
 * @property {string}  name - The elements name.
 * @property {string}  description - The element description.
 * @property {string}  shape - The element shape.
 * @property {string}  category_id - The element category_id.
 * @property {string}  case_id - The element case_id.
 *
 */

/**
 *
 * @typedef {Object} MapElement_geometry_type The style of the element.
 * @property {string} type
 * @property {string=} subtype
 * @property { L.LatLngExpression | L.LatLngExpression[]} coordinates
 */

/**
 * Represents an Element with its properties and geometry.
 * @typedef {Object} MapElement_type
 *
 * @property {(null|string)} _id - The server ID of this element.
 *
 * https://leafletjs.com/reference.html#layergroup when i get to groups i can make this an id , for now the layer is part of the element
 * @property {L.Layer} layer - The L.layer this element has on the map.
 *
 * @property {Object} properties - The properties of the element. Structure is based on the type of the element
 * @property {Object} properties.attributes - The attributes of the element.
 * @property {MapElement_style_type} properties.style - The style of the element.
 * @property {MapElement_element_type}  properties.element - The element itself.
 *
 * @property {MapElement_geometry_type} geometry - The geometry of the element.
 *
 * Coordinates are of the format used by Leaflet for internal use
 * BUT for storing and sharing the format used by GEOJSON is used
 * Leaflet uses Objects of latlng or arrays in [ lat , lng ] order.
 * On import of a geojson , the geojson coords get tranlated to LatLng
 * objects for use internally for easier DX. As soon as the Element gets posted
 * the coords are translated back to Geojson for the server to receive
 * This is most likely a temporary issue and will find a better solution
 * @see {@link https://macwright.com/lonlat/ }
 */


/** @type MapElement_type */
export class MapElement {
    /**
     * @param {( null|String )} _id
     * @param {L.Layer} layer
     * @param {any} properties
     * @param {any} geometry
     */
    constructor(_id, layer, properties, geometry) {
        this._id = _id;
        this.layer = layer ? markRaw(layer) : null;
        this.properties = properties
        this.geometry = geometry;
    }

    /**
     * @typedef {Object} MapElement_seed_type
     * @property {string} type
     * @property {string} category_id
     * @property {string} case_id
     * @property {string} category
     * @property {string} icon
     * @property {string} title
     * @property {string} description
     * @property {string} shape
     *
     */

    /**
     * @param {MapElement_seed_type} element_seed
     */
    static fromSeed(element_seed) {
        // Will be filled when layer is created
        const layer = null;

        const properties = {
            element: {
                type: element_seed.type,
                category: element_seed.category,
                category_id: element_seed.category_id,
                case_id: element_seed.case_id,
                title: element_seed.title,
                active: true,
                // description: element_seed.description,
                // shape: element_seed.shape,
            },
            attributes: {},
            style: {
                icon: element_seed.icon,
            }
        }

        const geometry = { type: '', coordinates: [] };

        return new MapElement(null, layer, properties, geometry)

    }

    /**
     * @param {MapElement_type} map_element
     * @returns {MapElement}
     */
    static fromClone(map_element) {
        // NOTE: layer is not deeply cloned
        const layer = map_element.layer
        const properties = window.structuredClone(toRaw(map_element.properties))
        const geometry = window.structuredClone(toRaw(map_element.geometry))
        return new MapElement(map_element._id, layer, properties, geometry)

    }

    reflectToLayer() {
        if (!this.layer) {
            return this
        }
        const layer = this.layer
        const geometry = this.geometry
        const element = this.properties.element
        const attrs = this.properties.attributes
        const layerType = getLayerType(layer)

        if (element.active === false) {
            layer.remove()
        }
        layer.bindTooltip(element.name, { permanent: false, direction: 'top' })
        if (this.properties.style?.fillColor?.hex8) {
            const color = this.properties.style.fillColor.hex8
            const fillPattern = this.properties.style.fillPattern
            const fillOpacity = this.properties.style.fillOpacity
            const opacity = this.properties.style.opacity
            if (layer instanceof L.Path) {
                layer.setStyle({
                    color,
                    fillPattern,
                    fillOpacity,
                    opacity,
                })
            } else {
                // const shadow = `0 0 0 calc(3px + 1px) ${color}`
                // layer._icon.style.boxShadow = shadow;
                //
            }
        }

        if( !this.properties.interactive ) {
            if (layer instanceof L.Path) {
                layer.setStyle({
                    interactive: this.properties.interactive,
                })
            }
        }

        switch (layerType) {
            case 'Circle': {
                const circleLayer = /** @type {L.Circle} */ (layer);
                if (attrs?.range?.max) {
                    circleLayer.setRadius(attrs.range.max);
                }
                if (attrs.fov && attrs.orientation) {
                    circleLayer.setSector(attrs.orientation, attrs.fov);
                }
                circleLayer.setLatLng(/** @type { L.LatLngExpression } */(geometry.coordinates));
                break;
            }
            case 'Polyline': {
                const polylineLayer = /** @type {L.Polyline} */ (layer);
                polylineLayer.setLatLngs(/** @type { L.LatLngExpression[] } */(geometry.coordinates));
                break;
            }
            case 'Marker': {
                const markerLayer = /** @type {L.Marker} */ (layer);
                markerLayer.setLatLng(/** @type { L.LatLngExpression } */(geometry.coordinates));
                break;
            }
            case 'Polygon': {
                const polygonLayer = /** @type {L.Polygon} */ (layer);
                polygonLayer.setLatLngs(/** @type { L.LatLngExpression[] } */(geometry.coordinates));
                break;
            }
            default:
                break;
        }

        return this
    }

    move(coords) {
        // const type = this.geometry.type
        // switch (type) {
        //     case 'Point':
        //         this.geometry.coordinates = L.GeoJSON.coordsToLatLng(coords);
        //         break;
        //     case 'LineString':
        //         this.geometry.coordinates = L.GeoJSON.coordsToLatLngs(coords, 0);
        //         break;
        //     case 'MultiLineString':
        //         this.geometry.coordinates = L.GeoJSON.coordsToLatLngs(coords, 1);
        //         break;
        //     case 'Polygon':
        //         this.geometry.coordinates = L.GeoJSON.coordsToLatLngs(coords, 1);
        //         break;
        //     case 'MultiPolygon':
        //         this.geometry.coordinates = L.GeoJSON.coordsToLatLngs(coords, 2);
        //         break;
        //     default:
        //         throw new Error('Unhandled GeoJSON object.');
        // }
        this.geometry = geo2leaf_geometry(this.geometry)
        this.reflectToLayer()
    }
    restoreAttributes(bak) {

        // Layer is not modified
        this.properties = bak.properties
        this.geometry = bak.geometry
    }
}
