<script setup>
import { INVOICES } from '../billing/data'
import { track } from '../billing/analytics'

const columns = [
  { title: 'Invoice', dataIndex: 'id', key: 'id' },
  { title: 'Date', dataIndex: 'date', key: 'date' },
  { title: 'Amount', dataIndex: 'amount', key: 'amount' },
  { title: 'Status', dataIndex: 'status', key: 'status' },
  { title: '', key: 'actions' },
]

function downloadPdf(invoice) {
  const blob = new Blob([`Invoice ${invoice.id}\nAmount: $${invoice.amount}`], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${invoice.id}.txt`
  link.click()
  URL.revokeObjectURL(url)
  track('invoice_pdf_downloaded', { invoiceId: invoice.id, amount: invoice.amount })
}
</script>

<template>
  <section class="page" data-pendo="invoices-page">
    <a-typography-title :level="3">Invoices</a-typography-title>
    <a-table :columns="columns" :data-source="INVOICES" row-key="id" :pagination="false">
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'amount'">${{ record.amount.toFixed(2) }}</template>
        <template v-else-if="column.key === 'status'">
          <a-tag :color="record.status === 'Paid' ? 'green' : 'orange'">{{ record.status }}</a-tag>
        </template>
        <template v-else-if="column.key === 'actions'">
          <a-button data-pendo="invoice-download-pdf" size="small" @click="downloadPdf(record)">
            Download PDF
          </a-button>
        </template>
      </template>
    </a-table>
  </section>
</template>
