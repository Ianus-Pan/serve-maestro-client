import { reactive, ref, toRefs, computed } from 'vue';
import axiosInstance from '@/services/axiosInstance'

/**
 * A function to create a reactive form with validation and submission handling.
 *
 * @typedef {Object} FormFieldConfig
 * @template T
 * @property {T} value - The initial value of the form field.
 * @property {function(T): (boolean|string )} validate - A validation rule function that returns an error message or null if valid.
 *
 * @typedef {Object.<string, FormFieldConfig>} FormConfig
 *
 * @param {FormConfig} initConfig - An object defining the form fields, their initial values, and optional validation rules.
 * @example
 * useForm({
 *    email: {
 *      value: '',
 *      validate: (value) => !value ? 'Email is required' : '',
 *    },
 *    password: {
 *      value: '',
 *      validate: (value) => value.length < 6 ? 'Password must be at least 6 characters' : '',
 *    },
 *  };
 */
export function useForm(initConfig = {}) {
    // Separate initial values and validators
    const values = reactive({});
    const validators = reactive({});

    const errors = reactive({});

    // Loading state for form submission
    const processing = ref(false);


    /**
     * Computed property to check if the form is valid.
     *
     * @type {computed<boolean>}
     */
    const isValid = computed(() => {
        return Object.keys(errors).length === 0;
    });

    // Init form
    addFields(initConfig);

    /**
     * Add new fields to the form.
     *
     * @param {FormConfig} newFields - An object defining the new form fields, their initial values, and optional validation rules.
     */
    function addFields(newFields) {
        Object.keys(newFields).forEach(key => {
            const form_field = newFields[key];
            values[key] = form_field.value;
            validators[key] = form_field.validate || ((val) => true);
        });
    }


    /**
     * Validate a specific field in the form.
     *
     * @param {string} key - The key of the form field to validate.
     */
    function validateField(key) {
        if (!validators[key]) return;

        const validate = validators[key];
        const value = values[key];

        const result = validate(value);
        if (result !== true) {
            errors[key] = result;
        }
        else {
            delete errors[key]
        }
    }

    /**
     * Validate the entire form.
     *
     * @returns {boolean} True if the form is valid, false otherwise.
     */
    function validateForm() {
        Object.keys(validators).forEach(validateField);

        // Check if there are any errors
        return isValid.value
    }

    /**
     * Reset the form to its initial values.
     */
    function resetForm() {
        // This wouldn't work
        // `values = {};`
        // because the original reactive object would be lost
        // breaking reactivity
        Object.keys(values).forEach(key => delete values[key]);
        Object.keys(errors).forEach(key => delete errors[key]);
        Object.keys(validators).forEach(key => delete validators[key]);

        Object.keys(initConfig).forEach((key) => {
            values[key] = initConfig[key].value;
        });
    }

    /**
       * Make an HTTP request with the form data.
       *
       * @param {string} method - The HTTP method ('get', 'post', 'put', 'patch', 'delete').
       * @param {string} url - The URL to send the request to.
       * @param {Object} [config={}] - Optional Axios config object including onSuccess and onFailure callbacks.
       * @param {function} [config.onSuccess] - Optional callback to handle a successful response.
       * @param {function} [config.onFailure] - Optional callback to handle a failed response.
       * @returns {Promise<any>} A promise that resolves with the response data.
       */
    async function _makeRequest(method, url, config = {}) {
        processing.value = true;

        // Validate the form for methods other than 'get' and 'delete'
        if (method !== 'get' && method !== 'delete') {
            const valid = validateForm();
            if (!valid) {
                processing.value = false;
                throw new Error('Form validation failed');
            }
        }

        try {
            const response = await axiosInstance.request({
                method,
                url,
                data: values,
                ...config,
            });
            config.onSuccess?.(response.data);
            return response.data;
        } catch (error) {
            console.error("HTTP request failed:", error);
            config.onFailure?.(error);
            throw error;
        } finally {
            processing.value = false;
        }
    }

    /**
     * HTTP GET request
     */
    function get(url, config = {}) {
        return _makeRequest('get', url, config);
    }

    /**
     * HTTP POST request
     */
    function post(url, config = {}) {
        return _makeRequest('post', url, config);
    }

    /**
     * HTTP PUT request
     */
    function put(url, config = {}) {
        return _makeRequest('put', url, config);
    }

    /**
     * HTTP PATCH request
     */
    function patch(url, config = {}) {
        return _makeRequest('patch', url, config);
    }

    /**
     * HTTP DELETE request
     */
    function del(url, config = {}) {
        return _makeRequest('delete', url, config);
    }

    return {
        values,
        errors,
        isValid,
        processing,
        addFields,
        validateField,
        validateForm,
        resetForm,

        get, post, put, patch, del
    };
}
