<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const selected = computed(() => [route.name])
</script>

<template>
  <a-layout class="shell">
    <a-layout-header class="header">
      <span class="brand">Billing Module</span>
      <a-menu mode="horizontal" theme="dark" :selected-keys="selected" class="menu">
        <a-menu-item key="sign-in"><router-link to="/">Sign in</router-link></a-menu-item>
        <a-menu-item key="invoices"><router-link to="/invoices">Invoices</router-link></a-menu-item>
        <a-menu-item key="payment-methods">
          <router-link to="/payment-methods">Payment methods</router-link>
        </a-menu-item>
        <a-menu-item key="subscription"><router-link to="/subscription">Subscription</router-link></a-menu-item>
      </a-menu>
    </a-layout-header>
    <a-layout-content class="content">
      <router-view />
    </a-layout-content>
  </a-layout>
</template>

<style>
.shell {
  min-height: 100vh;
}
.header {
  display: flex;
  align-items: center;
  gap: 24px;
}
.brand {
  color: #fff;
  font-weight: 600;
}
.menu {
  flex: 1;
}
.content {
  padding: 32px;
  max-width: 960px;
  margin: 0 auto;
  width: 100%;
}
.page .spaced {
  margin-top: 16px;
}
</style>
