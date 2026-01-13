import { getPathValue } from "@/utils/object_deep_fields";
import { ref, computed, reactive, toValue, watch } from 'vue'

// NOTE: VERY WORK IN PROGRESS
export default function useSifter(data, search, sorters, filters) {
    const activeFilters = reactive(new Map())
    const activeSearch = reactive(search)
    const activeSorters = reactive(new Map())

    const filteredData = computed(() => {
        if (!data) {
            console.log("Sifter given undefined data")
            return
        }
        let result = toValue(data)
        if( !result ) throw new Error('invalid data value')

        // Apply filters
        if (!filters) {
            return result
        }

        activeFilters.forEach((value, key) => {
            result = result.filter(filters[key][value])
        })

        return result
    })

    const searchedData = computed(() => {
        let result = filteredData.value
        if (!search) return result

        const predFunc = (!activeSearch.field) ?
            item => {
                const values = Object.values(item)
                try {
                    return values.some(value => {
                        if (typeof value === 'string') {
                            return value.toLowerCase().includes(activeSearch.query.toLowerCase())
                        }
                        return false
                    })
                } catch( err ) {
                    return false
                }
            } :
            item => {
                try {
                    return getPathValue(item, activeSearch.field).toLowerCase().includes(activeSearch.query.toLowerCase())
                } catch( err ) {
                    return ''
                }
            }

        return result.filter(predFunc)

    })

    const sortedData = computed(() => {
        let result = searchedData.value
        if (!sorters) return result
        // if (activeSorters.size === 0) return result
        // console.log(activeSorters)
        // console.log(result)
        activeSorters.forEach((value, key) => {
            console.log(sorters[key][value])
            result = result.toSorted(sorters[key][value])
        })

        // console.log(toValue(activeSorters))
        // console.log(toValue(result).map((i) => i.active))
        return result

    })
    const finalData = computed(() => {

        return sortedData.value
    })

    function toogleSorter(key) {
        const order = activeSorters.get(key)
        switch (order) {
            case "asc": {
                activeSorters.set(key, "des")
                break
            }
            case "des": {
                activeSorters.delete(key)
                break
            }
            default: {
                activeSorters.set(key, "asc")
                break
            }
        }

    }
    function toogleFilter(key, by) {
        // if (activeFilters.has(key)) {
        //     activeFilters.set(key, by)
        //     return
        // }

        activeFilters.set(key, by)
    }

    return {
        filteredData, searchedData, sortedData, finalData,

        activeFilters,
        activeSearch,
        activeSorters,
        toogleSorter,
        toogleFilter
    }
}
