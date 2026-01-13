import { ref } from 'vue';

export default function useNotifications({ timeout = 3000 }) {

    const notifications = ref([]);

    const addNotification = (payload) => {
        const id = Date.now(); // Unique ID for the notification
        notifications.value.push({ id, ...payload });

        // Automatically remove the notification after 3 seconds
        setTimeout(() => {
            removeNotification(id);
        }, timeout);
    };

    const removeNotification = (id) => {
        notifications.value = notifications.value.filter(notification => notification.id !== id);
    };

    return {
        notifications,
        addNotification,
        removeNotification,
    };
}
