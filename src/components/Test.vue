<script>
import { toRaw } from 'vue';
import { initPendoVisitor } from '../utils/pendo/initVisitor.js'
export default {
    data: () => {
        return {
            formState: {
              visitorId: null,
              email: null,
              full_name: null,
            }
        }
    },
    methods: {
      resetForm: function() {
        this.formState.visitorId = null;
        this.formState.email = null;
        this.formState.full_name = null;
      },
      submitData: function () {
          const visitorDetails = toRaw(this.formState);
          console.log(visitorDetails, 'visitor details');
          initPendoVisitor(visitorDetails);

          // Track visitor initialization event
          try {
            pendo.track("visitor_initialized", {
              email: visitorDetails.email,
              full_name: visitorDetails.full_name,
            });
          } catch (e) {
            console.error("Pendo track event failed:", e);
          }

          this.resetForm();
          this.$router.push('/invoices');
      },

    },    
}

</script>
<template>
  <div class="test-container">    
    <a-typography-title :level="3">Sign in</a-typography-title>
    <a-form
    :model="formState"
    @finish="submitData"
    >
      <a-form-item label="Visitor ID">
        <a-input v-model:value="formState.visitorId" placeholder="visitor-001" />
      </a-form-item>    
      <a-form-item label="Email">
        <a-input v-model:value="formState.email" placeholder="email@pendo.io" />
      </a-form-item>    
      <a-form-item label="Full Name">
        <a-input v-model:value="formState.full_name" placeholder="Full Name" />
      </a-form-item>
      <a-form-item >
        <a-button  type="primary" html-type="submit" block>Submit</a-button>
      </a-form-item>
    </a-form>        
  </div>
</template>

<style lang="css">
  .test-container {
    margin: 48px auto;
  }
</style>    