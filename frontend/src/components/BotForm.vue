<template>
  <n-spin :show="loading">
    <n-card class="card" title="导入数据">
      <n-form ref="formRef" class="form" :rules="rules" :model="formValue">
        <n-form-item path="username" label="查分器账号">
          <n-input v-model:value="formValue.username" placeholder="username" />
        </n-form-item>
        <n-form-item path="password" label="查分器密码">
          <n-input
            v-model:value="formValue.password"
            placeholder="password"
            type="password"
            show-password-on="click"
          />
        </n-form-item>
        <n-form-item path="friendCode" label="好友号码">
          <n-input
            v-model:value="formValue.friendCode"
            placeholder="friendCode"
          />
        </n-form-item>
      </n-form>
      <template #action>
        <n-space justify="space-between">
          <n-space>
            <n-button type="success" @click="post"> 更新 </n-button>
            <n-button type="error" @click="clearForm"> 清空 </n-button>
          </n-space>
          <div style="display: flex; align-items: center; height: 100%">
            <n-a @click="() => genShortcut(updateType)"> 快速更新链接 </n-a>
          </div>
        </n-space>
      </template>
    </n-card>

    <n-card class="card" :bordered="false" title="好友号码在哪里？">
      <n-image src="/friendcode.png" width="100%"/>
    </n-card>

    <power-up class="card" />

    <n-modal v-model:show="showModal" preset="card" style="max-width: 1080px" title="快速跳转链接">
      <n-p>
        使用方法：将链接发送到微信任意聊天框中（推荐文件传输助手），点击链接即可进行 Bot 数据更新。<strong>注意：短链接包含你的查分器账户和密码信息，请不要将链接分享给其他人！</strong>
      </n-p>
      点击选中链接：
      <div type="info" @click="selectContent" @touchstart="selectContent" class="shortCut">
        <p id="short-cut" ref="shortCutRef">
          {{ shortCut }}
        </p>
      </div>
    </n-modal>
  </n-spin>
</template>

<script setup>
import { postBotForm } from '../api/bot.js'
import { ref } from 'vue'
import { useMessage } from 'naive-ui'
import PowerUp from '../components/PowerUp.vue'

const loading = ref(false)
const message = useMessage()
const showModal = ref(false)
const shortCut = ref('')

const formValue = ref({
  username: '',
  password: '',
  friendCode: '',
})
const rules = ref({
  username: {
    required: true,
    message: '请输入查分器账户',
  },
  password: {
    required: true,
    message: '请输入查分器密码',
  },
  friendCode: {
    required: true,
    message: '请输入好友号码',
  },
})
const formRef = ref(null)

function clearForm() {
  formValue.value.username =
    formValue.value.password =
    formValue.value.friendCode =
      ''
}

async function post(jump = false) {
  formRef.value.validate(async (errors) => {
    if (errors) return false
    loading.value = true
    try {
      const result = await postBotForm(
        formValue.value.username,
        formValue.value.password,
        formValue.value.friendCode
      )
      if (jump) window.location.href = result.data
    } catch (err) {
      message.error(err.response.data ? err.response.data : err.message)
    } finally {
      loading.value = false
    }
  })
}

async function genShortcut() {
  formRef.value.validate(async (errors) => {
    if (errors) return
    showModal.value = true
    let url = `${window.location.protocol}//${window.location.host}/bot?`
    const callbackHost = window.location.host
    url += `callbackHost=${encodeURIComponent(callbackHost)}`
    url += `&username=${encodeURIComponent(formValue.value.username)}`
    url += `&password=${encodeURIComponent(formValue.value.password)}`
    url += `&friendCode=${encodeURIComponent(formValue.value.friendCode)}`
    // url += `&diffList=${encodeURIComponent(
    //   formValue.value.diffList !== undefined
    //     ? formValue.value.diffList.join()
    //     : null
    // )}`
    // url += `&type=${encodeURIComponent(type)}`
    console.log(url)
    shortCut.value = url
  })
}
</script>

<style>
.shortCut {
  background-color: rgb(250, 250, 252);
  color: rgb(24, 160, 88);
  word-wrap: break-word;
}

.card {
  margin-bottom: 8px;
}
</style>
