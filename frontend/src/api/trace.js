import httpRequest from '../request/index'

async function getTrace(uuid) {
  return await httpRequest.get('/trace', { params: { uuid } })
}

async function quickRetry(uuid) {
  return await httpRequest.post('/retry', { uuid })
}

export { getTrace, quickRetry }
