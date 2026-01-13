import { ref } from 'vue';
/**
 * @typedef {Object} Event
 * @property {string} [ state ] - The next state to transition to.
 * @property {function} [onTransition] - Callback function to be executed when the event is triggered.
 */

/**
 * @typedef {Object<string,Event>} Transitions
*/

/**
 * @typedef {Object} UseFSMReturn
 * @property {Ref<string>} current - The current state of the finite state machine.
 * @property {function} transition - Function to trigger a state transition.
 * @property {function} exportToDot
 */

/**
 * Creates a finite state machine.
 * @param {Object<string, Transitions>} states
 * @param {string} initialState - The initial state of the finite state machine.
 * @returns {UseFSMReturn} The finite state machine.
 */
export default function useFSM(states, initialState) {
    const current = ref(initialState);

    /**
     * @param {string} state Next state
     */
    function transition(state, ...args) {
        const availableStates = states[current.value]
        const nextState = availableStates[state];
        if (nextState) {

            current.value = nextState.state ?? state;

            nextState?.onTransition(...args);

        } else {
            console.log(`Invalid event: ${state} in state: ${current.value}`);
        }
    }

    /**
      * Exports the FSM configuration in DOT notation.
      * @returns {string} DOT notation string representing the FSM.
      */
    function exportToDot() {
        let dot = 'digraph FSM {\n';
        // Highlight the current state by making it bold
        dot += `    "${current.value}" [style=filled, fontweight=bold];\n`;
        for (const [state, transitions] of Object.entries(states)) {
            for (const [event, transition] of Object.entries(transitions)) {
                const targetState = transition.state ?? event;
                // dot += `    "${state}" -> "${targetState}" [ label = "${event}" ];\n`;
                dot += `    "${state}" -> "${targetState}";\n`;
            }
        }

        dot += '}';
        return dot;
    }

    return { current, transition, exportToDot };
}
