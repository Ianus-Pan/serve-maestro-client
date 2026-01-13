import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import laravelServer from '@/api/laravelServer'
import { getPathValue } from '@/utils/object_deep_fields.js'

export const useSrvAssessmentStore = defineStore('srvAssessment', () => {
    /** Stores Which Cases & Threats have been selected for Comparison */
    const to_compare = ref({cases: [], threats: []})

    const _loading_case_promises = ref(0)
    const _loading_area_promises = ref(0)
    const loading = computed(() => {
        return {
            cases: !!_loading_case_promises.value,
            areas: !!_loading_area_promises.value,
        }
    })


    /**
     * Get & Parse new Case/Threat Assessments
     *
     * @returns
     * ```{
     *    [cID]: {
     *       [tID]: {
     *          <AssessmentObj>
     *       }, ...
     *    }, ...
     * }
     */
    const stored_assessments = ref({})

    /**
     * Get & Parse new Case Areas
     *
     * @returns
     * ```{
     *    [cID]: [area, ...]
     * }
     */
    const stored_case_areas = ref({})

    /** On Compared Case Change, get new Case Area Elements*/
    watch(() => to_compare.value.cases, () => _fetchNewCaseAreas(), {deep: true})
    const _fetchNewCaseAreas = () => {
        let arr_case_area_promise = []
        _loading_area_promises.value++

        to_compare.value.cases.forEach(cID => {
            if( !stored_case_areas.value[cID]) {
                arr_case_area_promise.push(laravelServer.CASE_ELEMENT.GET.areas_of_case(cID))
            }
        })

        Promise.all(arr_case_area_promise)
            .then(area_res => _parseCaseAreaResults(area_res))
            .catch(area_err => console.error('Fetch new Case Areas', area_err))
    }
    const _parseCaseAreaResults = (area_res) => {
        area_res.forEach( c_areas => {
            if( c_areas[0] ) {
                let cID = c_areas[0].properties.element.case_id
                stored_case_areas.value[cID] = c_areas
            }
        })
        _loading_area_promises.value--
    }
    function getCaseArea(cID, aID) {
        if( !cID || !aID || !stored_case_areas.value?.[cID]?.length )
            return null;

        return stored_case_areas.value[cID].find(area => area._id === aID) || null;
    }

    /** On Compared Case|Threat Change, get new Case/Threat Combination Assessments */
    watch(() => [to_compare.value.cases, to_compare.value.threats], () => _fetchNewAssessments())
    const _fetchNewAssessments = (forced = []) => {
        if( to_compare.value.cases.length === 0 || to_compare.value.threats.length === 0 )
            return;

        let arr_assessment_promise = []
        _loading_case_promises.value++

        /**
         * Foreach Case_ID compared
         * Foreach Threat_ID compared
         * If Case/Threat combo doesnt exist
         *    Or force Case Refresh
         *    Or force Threat Refresh
         *       Promise Fetch Case/Threat Assessment
         */
        to_compare.value.cases.forEach(cID => {
            if( !stored_assessments.value[cID] )
                stored_assessments.value[cID] = {}

            to_compare.value.threats.forEach(tID => {
                if( !stored_assessments.value[cID][tID] ||
                    forced.includes(cID) || forced.includes(tID) ) {
                    arr_assessment_promise.push(laravelServer.ASSESSMENT.GET.all(cID, tID))
                }

                if( !stored_assessments.value[cID][tID] )
                    stored_assessments.value[cID][tID] = {}
            })
        })

        Promise.all(arr_assessment_promise)
            .then(ass_res => _parseAssessmentResults(ass_res))
            .catch(ass_err => console.error('Fetch new Assessments', ass_err))
    }
    const _parseAssessmentResults = (ass_res) => {
        ass_res.forEach( c_ass => {
            if( c_ass[0] ) {
                let cID = c_ass[0].case_id
                let tID = c_ass[0].threat_id

                stored_assessments.value[cID][tID] = c_ass[0]

                let mlt = c_ass[0].threat_values.likelihood > 1 ?
                    c_ass[0].threat_values.likelihood : 1

                let r = 50 * mlt
                let g = 200 / mlt

                let cl_b = _getRandomColor(100, 100, 100 - (10*mlt))

                stored_assessments.value[cID][tID].colors = {
                    best: {
                        backgroundColor: `rgba(${r}, ${g}, ${cl_b.b}, 0.2)`,
                        borderColor: `rgba(${r}, ${g}, ${cl_b.b}, 1)`,
                        pointBackgroundColor: `rgba(${r}, ${g}, ${cl_b.b}, .35)`,
                        pointBorderColor: '#fff',
                        pointHoverBackgroundColor: '#fff',
                        pointHoverBorderColor: `rgba(${r}, ${g}, ${cl_b.b}, 1)`,
                    },
                    worst: {
                        backgroundColor: `rgba(${r-40}, ${g-40}, ${cl_b.b-40}, 0.2)`,
                        borderColor: `rgba(${r-40}, ${g-40}, ${cl_b.b-40}, 1)`,
                        pointBackgroundColor: `rgba(${r-40}, ${g-40}, ${cl_b.b-40}, .35)`,
                        pointBorderColor: '#fff',
                        pointHoverBackgroundColor: '#fff',
                        pointHoverBorderColor: `rgba(${r-40}, ${g-40}, ${cl_b.b-40}, 1)`,
                    },
                    threat: {
                        backgroundColor: `rgba(${r}, ${g}, ${cl_b.b}, 0.2)`,
                        borderColor: `rgba(${r}, ${g}, ${cl_b.b}, 1)`,
                        pointBackgroundColor: `rgba(${r}, ${g}, ${cl_b.b}, .35)`,
                        pointBorderColor: '#fff',
                        pointHoverBackgroundColor: '#fff',
                        pointHoverBorderColor: `rgba(${r}, ${g}, ${cl_b.b}, 1)`,
                    },
                    areas: {}
                }

                Object.keys(stored_assessments.value[cID][tID].area_values).forEach(aID => {
                    let area_ass = stored_assessments.value[cID][tID].area_values[aID]

                    let mlt = area_ass.risk > 1 ? area_ass.risk : 1

                    let r = 50 * mlt
                    let g = 200 / mlt
    
                    let cl_b = _getRandomColor(100, 100, 100 - (10*mlt))

                    stored_assessments.value[cID][tID].colors.areas[aID] = {
                        backgroundColor: `rgba(${r}, ${g}, ${cl_b.b}, 0.2)`,
                        borderColor: `rgba(${r}, ${g}, ${cl_b.b}, 1)`,
                        pointBackgroundColor: `rgba(${r}, ${g}, ${cl_b.b}, .35)`,
                        pointBorderColor: '#fff',
                        pointHoverBackgroundColor: '#fff',
                        pointHoverBorderColor: `rgba(${r}, ${g}, ${cl_b.b}, 1)`,
                    }
                })
            }
        })

        _loading_case_promises.value--
    }

    const randomBetween = (min, max) => Math.floor(min + (Math.random() * (max - min + 1)));
    function _getRandomColor(rr = 150, gr = 150, br = 150) {
        const r = randomBetween(
            randomBetween(rr - 40, rr),
            randomBetween(rr, rr + 40)
        );
        const g = randomBetween(
            randomBetween(gr - 40, gr),
            randomBetween(gr, gr + 40)
        );
        const b = randomBetween(
            randomBetween(br - 40, br),
            randomBetween(br, br + 40)
        );
        return {r, g, b};
    }

    /** Force re-fetch the Case/Threat Combinations */
    function refreshCaseAssessment(forced = []) {
        _fetchNewAssessments(forced)
    }

    function getByMode(theList, path, mode = 'hi') {
        let val = mode === 'hi' ? -99999 :
            mode === 'lo' ? 99999 : 0

        let res_key = null;
        let res_val = null;

        Object.keys(theList).forEach(key => {
            let listVal = getPathValue(theList[key], path, 0)

            if( (mode === 'hi' && listVal > val) ||
                (mode === 'lo' && listVal < val) ) {
                val = listVal
                res_key = key
                res_val = theList[key]
            }
        })

        return [res_key, res_val]
    }

    return {
        loading,

        /** Data to Have */
        to_compare,

        /** Get Stored Data */
        getCaseArea,
        stored_case_areas,
        stored_assessments,

        /** Data to Refresh */
        refreshCaseAssessment,

        /** Helpers */
        getByMode,
    }
})
