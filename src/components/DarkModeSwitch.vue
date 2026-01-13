<template>
  <div>
    <div class="toggle slide bg-white dark:bg-cl_background-300-dark hover:bg-gray-300 dark:hover:bg-yellow-400 transition-colors">
      <input id="c" type="checkbox" v-model="isDark" @click="toggleDarkMode()"/>
      <label for="c">
        <div class="card slide"></div>
      </label>
    </div>
  </div>
</template>
  
<script setup>
import { useDark, useToggle } from '@vueuse/core'

// Reactive state for dark mode
const isDark = useDark({
    selector: 'html', // Attach the class to the <html> tag
    attribute: 'class', // Class-based toggling
});
const toggleDarkMode = useToggle(isDark);
</script>
  
<style>
.toggle {
  font-family: verdana;
  font-size: 16px;
  display: flex;
  position: relative;
  width: 7.5rem;
  height: 2.5rem;
  border-radius: 6px;
  align-self: center;
  user-select: none;
  box-shadow: 0 15px 20px -10px rgb(255, 193, 78);
}
.dark .toggle {
  box-shadow: 0 15px 20px -10px gray;
}

.toggle:after,
.toggle:before {
  flex: 1;
  text-align: center;
  line-height: 2.5rem;
}
.toggle:after {
  content: "Light";
}
.toggle:before {
  content: "Dark";
}

#c {
  display: none;
}

.toggle label {
  position: absolute;
  inset: 0;
  cursor: pointer;
}

.card {
  position: relative;
  background: rgb(255, 193, 78);
  border-radius: 6px;
  width: 50%;
  height: 2.5rem;
  pointer-events: none;
  transition: 0.4s;
}

.toggle input:checked + label .card {
  background: gray;
  border-radius: 6px;
}

.slide .card {
  transform: translateX(0);
}
.slide input:checked + label .card {
  transform: translateX(3.75rem);
}

</style>