<script setup>
import { useRouter } from 'vue-router'

const dashboardUrl = import.meta.env.VITE_LINK_DASHBOARD
const chatUrl = import.meta.env.VITE_LINK_CHAT

const router = useRouter()

const navigateTo = (routeName) => {
  router.push({ name: routeName })
}

const goToUrl = (url) => {
  window.location.href = url
}
</script>

<template>
  <div class="py-12 bg-[#383D5B]">
    <div class="max-w-7xl mx-auto">
      <div class="md:flex mb-4 gap-8">
        <div class="md:w-1/4 py-2 cursor-pointer" @click="goToUrl(dashboardUrl)">
          <div
            class="bg-[#F7F7F7] rounded-[16px] flex py-1 items-center justify-center gap-2 hover:contrast-125 hover:drop-shadow-2xl min-h-[106px]"
          >
            <div>
              <img width="80" src="/assets/images/ui-icons/admin-panel.png" alt="Admin Panel" />
            </div>
            <div>ADMIN PANEL</div>
          </div>
        </div>
        <div class="md:w-1/4 py-2 cursor-pointer" @click="goToUrl(dashboardUrl)">
          <div
            class="bg-[#F7F7F7] rounded-[16px] flex py-1 items-center justify-center gap-2 hover:contrast-125 hover:drop-shadow-2xl min-h-[106px]"
          >
            <div><img width="80" src="/assets/images/ui-icons/cases.png" alt="Cases Panel" /></div>
            <div>CASES PANEL</div>
          </div>
        </div>
        <div class="md:w-1/4 py-2 cursor-pointer" @click="goToUrl(dashboardUrl)">
          <div
            class="bg-[#F7F7F7] rounded-[16px] flex py-1 items-center justify-center gap-2 hover:contrast-125 hover:drop-shadow-2xl min-h-[106px]"
          >
            <div><img width="80" src="/assets/images/ui-icons/map.png" alt="Map" /></div>
            <div>COMMON<br />OPERATIONAL<br />PICTURE</div>
          </div>
        </div>
        <div class="md:w-1/4 py-2 cursor-pointer" @click="goToUrl(chatUrl)">
          <div
            class="bg-[#F7F7F7] rounded-[16px] flex py-1 items-center justify-center gap-2 hover:contrast-125 hover:drop-shadow-2xl min-h-[106px]"
          >
            <div><img width="80" src="/assets/images/ui-icons/chat.png" alt="Chat" /></div>
            <div>CHAT</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
