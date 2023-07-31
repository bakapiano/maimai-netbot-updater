import httpRequest from '../request/index'

async function postForm(username, password, type, diffList, page) {
  const callbackHost = window.location.host
  const result = await httpRequest.post('/auth', {
    username,
    password,
    callbackHost,
    type,
    diffList,
    page,
  })
  return result
}

export { postForm }
