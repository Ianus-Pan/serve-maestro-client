import { getPathValue, setPathValue } from "./object_deep_fields.js";
/**
 * The resolveSpec func is used to filter out what are
 * the correct field, values etc based on
 * the spec requirement and the given values
 *
 * @param {Schema} schema
 * @param {Object} data
 * @returns
 */
export function resolveSpec(schemas, data, schema_type) {

    const result = [];
    for (const schema of schemas) {
        if (schema.type === schema_type) {
            if (schema.sections) {
                for (const section of schema.sections) {
                    if (_checkRequirements(section.requires, data)) {
                        const section_fields = { label: (section.label), fields: [] }
                        for (const field of section.fields) {
                            if (_checkRequirements(field.requires, data)) {
                                const _field = { ...field };
                                delete _field.requires;
                                section_fields.fields.push(_field);
                            }
                        }
                        result.push(section_fields)
                    }

                }
            } else {
                // NOTE: maybe handle it differently ....
                const section = { label: schema?.label ?? '', description: schema?.description ?? null, fields: [] }
                for (const field of schema.fields) {
                    if (_checkRequirements(field.requires, data)) {
                        const _field = { ...field };
                        delete _field.requires;
                        section.fields.push(_field);
                    }
                }
                result.push(section)

            }
        }
    }

    return result;


}

// Logical operations: "AND", "OR"
function logical_op(op, arg1, arg2) {
    switch (op) {
        case 'AND':
            return arg1 && arg2;
        case 'OR':
            return arg1 || arg2;
        default:
            throw new Error(`Invalid logical operator: ${op}`);
    }
}

// Conditional operations: "IN", "NIN", "EQ", "NE", "GT", "GTE", "LT", "LTE"
/**
 * Operators:
 * "IN" = arg2 in arg1[]
 * "NIN" = arg2 not in arg1[]
 * "EQ" = arg2 === arg1
 * "NE" = arg2 !== arg1
 * "GT" = arg2 < arg1
 * "GTE" = arg2 <= arg1
 * "LT" = arg2 > arg1
 * "LTE" = arg2 >= arg1
 * @param {*} op Operator
 * @param {*} arg1 Real Value (Number, String, Array)
 * @param {*} arg2 Expected Value (Number, String)
 * @returns 
 */
function conditional_op(op, arg1, arg2) {
    switch (op) {
        case 'IN':
            return Array.isArray(arg1) && arg1.includes(arg2);
        case 'NIN':
            return Array.isArray(arg1) && !arg1.includes(arg2);
        case 'EQ':
            return arg1 === arg2;
        case 'NE':
            return arg1 !== arg2;
        case 'GT':
            return arg1 > arg2;
        case 'GTE':
            return arg1 >= arg2;
        case 'LT':
            return arg1 < arg2;
        case 'LTE':
            return arg1 <= arg2;
        default:
            throw new Error(`Invalid conditional operator: ${op}`);
    }
}

/**
 * @param {?Require[]} requirements
 * @param {Object} data
 * @returns
 */
function _checkRequirements(requires, data) {
    if (!requires) return true;
    
    const r_op = requires.operator
    let cond_result = []
    for (const condition of requires.conditions) {
        const path = condition.path;
        const expectedValue = condition.value;
        const c_op = condition.operator
        const actualValue = getPathValue(data, path);

        // console.log(actualValue, c_op, expectedValue)
        if (actualValue === undefined || !conditional_op(c_op, actualValue, expectedValue)) {
            cond_result.push(false)
        }
        else {
            cond_result.push(true)
        }
    }
    return cond_result.reduce((acc, current) => logical_op(r_op, acc, current));
}

// TODO: need to fill this up
export const DefaultFromType = {
    string: () => "",
    slider: (params) => params.max,
    color: () => "#ff00004d"
}

/**
 * @typedef {Object} Schema
 * @property {string} _name
 * @property {string} _id
 * @property {Category[]} categories
 */

/**
 * @typedef {Object} Category
 * @property {string} label - Category label
 * @property {string} description - Category description
 * @property {Field[]} fields - Array of fields
 * @property {?Require[]} [requires] - Array of requirements
 */

/**
 * @typedef {Object} Field
 * @property {string} label - Field label
 * @property {string} description - Field description
 * @property {string} type - Field type
 * @property {string} path - Field path
 * @property {MinMax} [minMax] - Field min and max values
 * @property {string} [appendToValue] - Value to append to the field value
 * @property {?Require[]} [requires] - Array of requirements
 */

/**
 * @typedef {Object} MinMax
 * @property {number} [min] - Minimum value
 * @property {number} [max] - Maximum value
 */

/**
 * @typedef {Object} Require
 * @property {string} path - Path to check in data
 * @property {*} expected_value - Expected value
 * @property {string} expected_value_type - Expected value type
 */
