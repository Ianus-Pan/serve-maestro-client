export default function useApi(axiosInstance) {
    const makeRequest = async (method, url, data = {}, config = {}) => {
        try {
            const response = await axiosInstance.request({
                method,
                url,
                data,
                ...config,
            });
            return response.data;
        } catch (error) {
            console.error("HTTP request failed:", error);
            throw error;
        }
    };

    const get = (url, config = {}) => {
        return makeRequest('get', url, {}, config);
    };

    const post = (url, data, config = {}) => {
        return makeRequest('post', url, data, config);
    };

    const put = (url, data, config = {}) => {
        return makeRequest('put', url, data, config);
    };

    const patch = (url, data, config = {}) => {
        return makeRequest('patch', url, data, config);
    };

    const deleteRequest = (url, data, config = {}) => {
        return makeRequest('delete', url, data, config);
    };

    return {
        get,
        post,
        put,
        patch,
        delete: deleteRequest,
    };
};
