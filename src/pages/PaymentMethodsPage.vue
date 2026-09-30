<script setup>
import { reactive, ref } from 'vue'
import { applyPromo } from '../billing/promo'
import { track } from '../billing/analytics'

const PLAN_AMOUNT = 149

const card = reactive({ number: '', name: '', expiry: '' })
const promoCode = ref('')
const promoResult = ref(null)
const promoError = ref('')
const cardSaved = ref(false)

function onApplyPromo() {
  promoError.value = ''
  const result = applyPromo(promoCode.value, PLAN_AMOUNT)
  if (!result.ok) {
    promoError.value = result.reason
    return
  }
  promoResult.value = result
  track('promo_applied', { code: result.code, percent: result.percent, discount: result.discount })
}

function onSaveCard() {
  cardSaved.value = true
  track('payment_method_added', { brand: card.number.startsWith('4') ? 'visa' : 'other' })
}
</script>

<template>
  <section class="page" data-pendo="payment-methods-page">
    <a-typography-title :level="3">Payment methods</a-typography-title>
    <a-card title="Add a card" data-pendo="add-card">
      <a-form layout="vertical" @finish="onSaveCard">
        <a-form-item label="Card number">
          <a-input v-model:value="card.number" data-pendo="card-number" placeholder="4242 4242 4242 4242" />
        </a-form-item>
        <a-form-item label="Name on card">
          <a-input v-model:value="card.name" data-pendo="card-name" />
        </a-form-item>
        <a-form-item label="Expiry">
          <a-input v-model:value="card.expiry" data-pendo="card-expiry" placeholder="MM/YY" />
        </a-form-item>
        <a-button type="primary" html-type="submit" data-pendo="save-card">Save card</a-button>
        <a-alert v-if="cardSaved" type="success" show-icon message="Card saved" class="spaced" />
      </a-form>
    </a-card>

    <a-card title="Promo code" class="spaced" data-pendo="promo">
      <a-space>
        <a-input v-model:value="promoCode" data-pendo="promo-code" placeholder="SAVE10" />
        <a-button type="primary" data-pendo="apply-promo" @click="onApplyPromo">Apply promo</a-button>
      </a-space>
      <a-alert v-if="promoError" type="error" show-icon :message="promoError" class="spaced" />
      <a-alert
        v-if="promoResult"
        type="success"
        show-icon
        class="spaced"
        :message="`${promoResult.code} applied: ${promoResult.percent}% off, new total $${promoResult.total.toFixed(2)}`"
      />
    </a-card>
  </section>
</template>
