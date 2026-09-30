<script setup>
import { ref } from 'vue'
import { CURRENT_PLAN_ID, PLANS } from '../billing/data'
import { track } from '../billing/analytics'

const currentPlanId = ref(CURRENT_PLAN_ID)

function upgrade(plan) {
  const from = currentPlanId.value
  currentPlanId.value = plan.id
  track('plan_upgraded', { from, to: plan.id, price: plan.price })
}
</script>

<template>
  <section class="page" data-pendo="subscription-page">
    <a-typography-title :level="3">Subscription</a-typography-title>
    <a-row :gutter="16">
      <a-col v-for="plan in PLANS" :key="plan.id" :span="8">
        <a-card :title="plan.name" :data-pendo="`plan-${plan.id}`">
          <p class="price">${{ plan.price }} / month</p>
          <p>{{ plan.seats }} seats</p>
          <a-button
            v-if="plan.id === currentPlanId"
            disabled
            block
          >
            Current plan
          </a-button>
          <a-button v-else type="primary" block data-pendo="upgrade-plan" @click="upgrade(plan)">
            Switch to {{ plan.name }}
          </a-button>
        </a-card>
      </a-col>
    </a-row>
  </section>
</template>

<style scoped>
.price {
  font-size: 20px;
  font-weight: 600;
}
</style>
