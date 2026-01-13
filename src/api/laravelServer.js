import useApi from '@/composables/api.js'
import axiosInstance from '@/services/axiosInstance'

const serveApi = useApi(axiosInstance)

export default {
  USER: {
    GET: {
      /** Returns the current logged in User Data */
      single() {
        return serveApi.get('/serve/user')
      },
      all() {
        return serveApi.get('/serve/all-users')
      }
    },
    POST: {
      single(body) {
        throw new Error(`${this} Not done yet :)`)
      }
    },
    DELETE: {
      single(user_id) {
        throw new Error(`${this} Not done yet :)`)
      }
    },
    LOGOUT: {
      single() {
        return serveApi.post(`/serve/logout`)
      }
    }
  },

  USER_GROUP: {
    GET: {
      /** Returns the Group */
      single(group_id) {
        if( !group_id ) throw new Error(`${this} group_id`)
        return serveApi.get(`/serve/user-group/${group_id}`)
      },

      /** Returns the Group which the Case belongs to */
      group_of_case(case_id) {
        if( !case_id ) throw new Error(`${this} case_id`)
        return serveApi.get(`/serve/user-group-by-case/${case_id}`)
      }
    },
    POST: {
      /** Submits a new User Group */
      single(body) {
        if( !body ) throw new Error(`${this} body`)
        return serveApi.post(`/serve/user-group`, JSON.stringify(body))
      }
    },
    DELETE: {
      single(group_id) {
        throw new Error(`${this} Not done yet :)`)
      }
    }
  },

  THREAT: {
    GET: {
      /**
       * Returns the Threats
       * Optional adds a document.case_has_qnnaires property
       */
      single(threat_id = 'all', case_id = null) {
        if( !threat_id ) throw new Error(`${this} threat_id`)
        return serveApi.get(`/serve/threat/${threat_id}/${case_id}`)
      },
    }
  },

  MAP_INSERT: {
    GET: {
      /** Returns the Insert Categories (with all their Elements) */
      category(category_id = 'all') {
        return serveApi.get(`/serve/insert-category/${category_id}`)
      },
      /** Returns the Insert Elements */
      element(element_id = 'all') {
        return serveApi.get(`/serve/insert-element/${element_id}`)
      }
    },
    POST: {
      /** Submit a new Element for an Existing Category */
      element(body) {
        if( !body ) throw new Error(`${this} body`)
        return serveApi.post(`/serve/insert-element`, JSON.stringify(body))
      },
    },
    DELETE: {
      element(element_id) {
        throw new Error(`${this} Not done yet :)`)
      }
    }
  },

  CASE: {
    GET: {
      /** Returns the Case */
      single(case_id = 'all') {
        return serveApi.get(`/serve/case/${case_id}`)
      },
    },
    POST: {
      /** Submits a new Case */
      single(body) {
        if( !body ) throw new Error(`${this} body`)
        return serveApi.post(`/serve/case`, JSON.stringify(body))
      }
    },
    DELETE: {
      single(case_id) {
        throw new Error(`${this} Not done yet :)`)
      }
    }
  },

  CASE_ELEMENT: {
    GET: {
      /** Returns the Case Element */
      single(element_id = 'all') {
        return serveApi.get(`/serve/element/${element_id}`)
      },
      elements_of_case(case_id) {
        if( !case_id ) throw new Error(`${this} case_id`)
        return serveApi.get(`/serve/elements-by-case/${case_id}`)
      },
      areas_of_case(case_id) {
        if( !case_id ) throw new Error(`${this} case_id`)
        return serveApi.get(`/serve/areas-by-case/${case_id}`)
      }
    },
    POST: {
      /** Submits a new Case */
      single(body) {
        if( !body ) throw new Error(`${this} body`)
        return serveApi.post(`/serve/element`, JSON.stringify(body))
      }
    },
    DELETE: {
      single(element_id) {
        if( !element_id ) throw new Error(`${this} - Element id is required`)
        return serveApi.delete(`/serve/element`, JSON.stringify({_id:element_id}))
      }
    }
  },

  ANSWERS: {
    GET: {
      /** Returns the Questionnaire of this Case & Threat combination */
      all(case_id, threat_id) {
        if( !case_id || !threat_id ) throw new Error(`${this} ${case_id}|${threat_id}`)
          return serveApi.get(`/serve/questionnaire-answer/${case_id}/${threat_id}`)
      },
    },
    POST: {
      /** Submits a new Questionnaire Answer */
      single(body) {
        if( !body ) throw new Error(`${this} body`)
        return serveApi.post(`/serve/questionnaire-answer`, JSON.stringify(body))
      }
    },
  },

  ASSESSMENT: {
    GET: {
      /** Returns the Questionnaire of this Case & Threat combination */
      all(case_id, threat_id) {
        if( !case_id || !threat_id ) throw new Error(`${this} ${case_id}|${threat_id}`)
        return serveApi.get(`/serve/assessment/${case_id}/${threat_id}`)
      },
    },
  },

  SCHEMA: {
    GET: {
      /** Returns the Element Schema */
      element(element_id = 'all') {
        return serveApi.get(`/serve/element-schema/${element_id}`)
      },
      /** Returns the Questionnaire Schema */
      questionnaire(questionnaire_id = 'all') {
        return serveApi.get(`/serve/questionnaire-schema/${questionnaire_id}`)
      },
    }
  },

  SCENARIO: {
    GET: {
      available_scenarios() {
        return serveApi.get(`/serve/available-scenarios`)
      },
      scenarios_by_case(case_id) {
        if( !case_id ) throw new Error(`${this} case_id`)
        return serveApi.get(`/serve/scenario-session/${case_id}`)
      },
      session_players(session_id) {
        if( !session_id ) throw new Error(`${this} session_id`)
        return serveApi.get(`/serve/session-players/${session_id}`)
      },
      clear_all_sessions() {
        return serveApi.get(`/serve/clear-scenario-sessions`)
      },
    },
  },
}
