/**
 * @param {Object} obj
 * @param {string} path  Dot seperated string ex "foo.bar.baz.x.y"
 * @param {*} [defaultValue=undefined] The value returned if `path` is not valid
 * @returns {*} The value contained in `path` or `defaultValue`
 */
export function getPathValue(obj, path, defaultValue = undefined) {
    return path.split('.').reduce((acc, key) => acc?.[key] ?? defaultValue, obj);
}

/**
 * Attempts to get the Highest or Lowest value from each `arr` Object[path]
 * @param {Array} arr The Array of Objects to get `mode` of `path`
 * @param {string} path Dot seperated string ex "foo.bar.baz.x.y"
 * @param {*} [defaultValue=undefined] The value returned if `path` is not valid
 * @returns {*} The Highest or Lowest value contained in `arr[].path` or `defaultValue`
 */
export function getLoopPathValue(arr, mode, path, defaultValue = undefined) {
    let res = mode === 'highest' ? -999999 :
        mode === 'lowest' ? 999999 : null
    if( !res ) return res

    arr.forEach(el => {
        let val = getPathValue(el, path)

        if( mode === 'highest' && val > res ) res = val
        else if( mode === 'lowest' && val < res ) res = val
    });

    return res ?? defaultValue
}

/**
 * @param {Object} obj
 * @param {string} path  Dot seperated string ex "foo.bar.baz.x.y"
 * @param {*} value The value inserted to `path`
 * @param {boolean} [createPath=false]
 * @throws
 */
export function setPathValue(obj, path, value, createPath = false) {
    const pathParts = path.split('.');
    const lastPathIdx = pathParts.length - 1
    let current = obj;

    for (let index = 0; index < lastPathIdx; ++index) {
        const key = pathParts[index];
        if (!Object.prototype.hasOwnProperty.call(current, key)) {
            if (!createPath) {
                throw new Error(`Path '${path}' does not exist`);
            }
            current[key] = {};
        }
        current = current[key];

    }
    current[pathParts[lastPathIdx]] = value;
}
