import { createRouter, createWebHistory } from 'vue-router'
import SignIn from './components/Test.vue'
import InvoicesPage from './pages/InvoicesPage.vue'
import PaymentMethodsPage from './pages/PaymentMethodsPage.vue'
import SubscriptionPage from './pages/SubscriptionPage.vue'
import { pageLoad } from './billing/analytics'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'sign-in', component: SignIn },
    { path: '/invoices', name: 'invoices', component: InvoicesPage },
    { path: '/payment-methods', name: 'payment-methods', component: PaymentMethodsPage },
    { path: '/subscription', name: 'subscription', component: SubscriptionPage },
  ],
})

router.afterEach(() => pageLoad())
