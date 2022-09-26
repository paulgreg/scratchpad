const title = document.querySelector('h1 input')
const textarea = document.querySelector('textarea')
const savingIcon = document.querySelector('#saving')
const addBtn = document.querySelector('#add')
const changeBtn = document.querySelector('#change')
const list = document.querySelector('#list ol')
const removeIcon = document.querySelector('#removeIcon').innerHTML
const search = document.location.search || ''
const notebook = search.replace('?notebook=', '')
const notebookCheck = new RegExp('^[a-zA-Z0-9]{1,12}$').test(notebook)
const localstorageKey = `scratchpad-${notebook}`
const saveUrl = `/json-store/scratchpad/${notebook}.json`

let lastTimeout
function debounce(fn, delay) {
  return () => {
    clearTimeout(lastTimeout)
    lastTimeout = setTimeout(fn, delay)
  }
}

function save() {
  data.lastSave = Date.now()
  data.items[data.lastIdx] = {
    title: title.value,
    text: textarea.value,
  }
  persistToLocalStorage()
  persistOnServer()
  setSaveIcon()
}

function persistToLocalStorage() {
  console.log('persistToLocalStorage', localstorageKey, data)
  localStorage.setItem(localstorageKey, JSON.stringify(data))
}

function persistOnServer() {
  fetch(saveUrl, {
    method: 'POST',
    mode: 'cors',
    headers: {
      Authorization: `Basic ${window.authorization}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })
}

let timeoutSaveIcon
function setSaveIcon() {
  savingIcon.classList.add('saved')
  timeoutSaveIcon = setTimeout(() => savingIcon.classList.remove('saved'), 500)
}

const debouncedSave = debounce(save, 1000)
textarea.addEventListener('keyup', debouncedSave, false)
textarea.addEventListener('paste', debouncedSave, false)
title.addEventListener('keyup', debouncedSave, false)
title.addEventListener('paste', debouncedSave, false)

let data = {
  lastIdx: 0,
  lastSave: undefined,
  items: [
    {
      title: 'Scratchpad',
      text: `

Type your wonderful idea or grocery list here.`,
    },
  ],
}

function setContent(idx) {
  data.lastIdx = idx
  title.value = data.items[data.lastIdx].title
  textarea.value = data.items[data.lastIdx].text
  hideList()
  textarea.focus()
}

function retrieveFromLocalStorage() {
  const content = JSON.parse(localStorage.getItem(localstorageKey))
  console.log('retrieveFromLocalStorage', localstorageKey, content)
  return Promise.resolve(content)
}

function retrieveFromServer() {
  return fetch(saveUrl, {
    headers: {
      Authorization: `Basic ${window.authorization}`,
    },
  })
    .then((response) => {
      if (response.ok) return response.json()
      if (response.status === 404) {
        return {}
      }
    })
    .catch((e) => console.error(e))
}

function load() {
  Promise.all([retrieveFromLocalStorage(), retrieveFromServer()]).then(
    ([localStorageData, serverData]) => {
      const localStorageLastSave =
        (localStorageData && localStorageData.lastSave) || 0
      const serverLastSave = (serverData && serverData.lastSave) || 0
      const lastData =
        localStorageLastSave > serverLastSave ? localStorageData : serverData
      if (lastData && lastData.items) data = lastData
      setContent(data.lastIdx)
    }
  )
}

function addNewItem() {
  const newIdx = data.items.length
  data.items.push({ title: 'New note', text: '' })
  data.lastIdx = newIdx
  setContent(newIdx)
  save()
}

addBtn.addEventListener('click', addNewItem, false)

function removeItem(idx) {
  const item = data.items[idx]
  if (
    item.text.length === 0 ||
    confirm(`Are you sure to delete « ${item.title} » ?`)
  ) {
    console.log('before', JSON.stringify(data.items))
    data.items.splice(idx, 1)
    console.log('after', JSON.stringify(data.items))
    data.lastIdx = 0
    persistToLocalStorage()
    buildList()
  }
}
function hideList() {
  document.body.classList.remove('list')
  emptyList()
}
function emptyList() {
  while (list.firstChild) {
    list.removeChild(list.firstChild)
  }
}
function buildList() {
  emptyList()
  const addRemoveBtn = data.items.length > 1
  data.items.forEach(({ title, text }, idx) => {
    const li = document.createElement('li')
    const aItem = document.createElement('a')
    aItem.innerText = title
    aItem.addEventListener('click', () => {
      setContent(idx)
    })
    const span = document.createElement('span')
    span.innerText = text.length ? `(${text.length} chars)` : '(empty)'
    li.appendChild(aItem)
    li.appendChild(span)
    if (addRemoveBtn) {
      const aRemove = document.createElement('a')
      aRemove.innerHTML = removeIcon
      aRemove.classList.add('remove')
      aRemove.addEventListener('click', () => {
        removeItem(idx)
      })
      li.appendChild(aRemove)
    }
    list.appendChild(li)
  })
  document.body.classList.add('list')
}
function toggleList() {
  document.body.classList.contains('list') ? hideList() : buildList()
}
changeBtn.addEventListener('click', toggleList, false)

const hideIntro = () => {
  auth.style.display = 'none'
}

if (notebookCheck) {
  hideIntro()
  load()
}
