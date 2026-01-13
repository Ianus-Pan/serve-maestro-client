<script setup>
</script>

<!--

This is the main layout of the application

+-----------+
|___________| <-- Header
| |         |
| | <SLOT/> |
| |         |
+-----------+
 ^
 | NavBar

-->
<template>
    <div class="relative">
        <main class="flex flex-auto">
            <slot />
        </main>
    </div>
</template>
