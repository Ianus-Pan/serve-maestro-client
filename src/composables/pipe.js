import { ref } from 'vue';

export function usePipe() {
  const value = ref(null);

  function write(val) {
    value.value = val;
  }

  function read() {
    const currentValue = value.value;
    value.value = null; // Clear the value after reading
    return currentValue;
  }

  return {
    write,
    read,
  };
}
