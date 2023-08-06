<template>
  <n-spin :show="loading">
    <n-card title="更新结果">
      <template v-if="error">
        <n-result status="error" title="未找到更新记录" :description="`UUID: ${uuid}`" />
      </template>
      <template v-else>
        <n-space vertical>
          <div>
            UUID:
            <n-tag :bordered="false">
              {{ uuid }}
            </n-tag>
          </div>
          <div class="log" :style="{maxHeight: `${height - 380}px`}">
            <TransitionGroup name="list">
              <n-text v-for="line in data?.log?.split('\n')" :key="line" tag="div">
                {{ line || '' }}
              </n-text>
            </TransitionGroup>
            <div v-if="inProgress">
              <n-skeleton text style="width: 60%" />
              <n-skeleton text style="width: 60%" />
              <n-skeleton text style="width: 41%" />
            </div>
          </div>
        </n-space>
        <n-divider />
      </template>
      <n-progress v-if="!error" type="line" :status="{ running: 'info', success: 'success', failed: 'error' }[
        data?.status || 'running'
      ]
        " :percentage="data?.progress || 0" :show-indicator="false" :processing="data?.status === 'running'"
        :indicator-placement="'inside'" />
      <template v-if="!error" #action>
        <n-space>
          <n-button v-if="isBotTrace" type="primary" :on-click="copyFriendCode">
            复制好友代码
          </n-button>
          <n-button v-if="!isBotTrace" type="info" :on-click="quickRetry">
            快速重试
          </n-button>
        </n-space>
      </template>
    </n-card>
  </n-spin>
</template>

<script setup>
import { onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { getTrace, quickRetry as postQuickRetry } from '../api/trace.js'
import { useMessage, useDialog } from 'naive-ui'
import { checkProxySettingStatus } from '../api/proxy.js'

const MAX_FETCH_COUNT = 5

const route = useRoute()
const message = useMessage()
const dialog = useDialog()

const data = ref(undefined)
const loading = ref(true)
const error = ref(false)
const inProgress = ref(true)
const isBotTrace = window.location.href.indexOf("isBot=true") > -1
const height = window.innerHeight
console.log(height)

const { uuid } = route.params
let intervalId = null
let failedFetchCount = 0

async function quickRetry() {
  if (!isBotTrace) {
    const post = async () => {
      try {
        loading.value = true
        const result = await postQuickRetry(uuid)
        window.location.href = result.data
      } catch (err) {
        message.error(err.response?.data ?? "快速重试失败")
      }
      finally {
        loading.value = false
      }
    }

    let result = false;
    try {
      loading.value = true
      result = await checkProxySettingStatus()
    }
    finally {
      loading.value = false
    }

    if (!result)
      dialog.warning({
        title: 'Warning',
        content: '代理配置存在问题，可能会导致数据更新不成功，是否继续？',
        negativeText: '取消',
        positiveText: '继续',
        onPositiveClick: post,
        autoFocus: false,
      })
    else post()
  }
  else {
    // TODO: Support retry for bot
    message.error('暂不支持 Bot 数据更新重试')
  }
}

function copyFriendCode() {
  navigator.clipboard.writeText('413252453611467')
  message.success('Bot 好友代码已复制到剪切板')
}

watch(inProgress, async (value, oldValue) => {
  if (oldValue && !value) {
    clearInterval(intervalId)
    if (data?.value?.status) {
      data.value.status == 'success'
        ? message.success('数据更新成功')
        : message.error('更新数据时出现错误')
    }
  }
})

onMounted(
  () => intervalId === null &&
    (intervalId = setInterval(async () => {
      let result = undefined
      try {
        result = (await getTrace(uuid)).data
      } catch (_err) { /* empty */ }

      if (result && result.status) {
        data.value = result
        if (data.value?.status == 'failed' || data.value?.status == 'success') {
          inProgress.value = false
        }
        if (loading.value) {
          loading.value = false
        }
      } else if (loading.value) {
        failedFetchCount += 1
        if (failedFetchCount >= MAX_FETCH_COUNT) {
          message.error(`未找到 ${uuid}`)
          inProgress.value = false
          loading.value = false
          error.value = true
        }
      }
    }, 2000))
)
</script>

<style scoped>
.list-enter-active,
.list-leave-active {
  transition: all 0.5s ease;
}

.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: translateY(10px);
}

.log {
  overflow-y: auto;
}
</style>
