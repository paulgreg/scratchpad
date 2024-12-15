import './style.css'

import { v4 as uuidv4 } from 'uuid'
import { authorization, baseUrl } from './settings'
import dompurify from 'dompurify'
import * as marked from 'marked'
import { debounce } from './debounce'

const intro = document.querySelector('#intro') as HTMLDivElement
const title = document.querySelector('h1 input') as HTMLInputElement
const textarea = document.querySelector('textarea') as HTMLTextAreaElement
const md = document.querySelector('#md') as HTMLDivElement
const savingIcon = document.querySelector('#saving') as HTMLSpanElement
const errorIcon = document.querySelector('#error') as HTMLSpanElement
const addBtn = document.querySelector('#add') as HTMLButtonElement
const changeBtn = document.querySelector('#change') as HTMLButtonElement
const switchBtn = document.querySelector('#switch') as HTMLButtonElement
const list = document.querySelector('#list ol') as HTMLOListElement
const removeIcon = (
  document.querySelector('#removeIcon') as HTMLTemplateElement
)?.innerHTML
const search = document.location.search || ''
const notebook = search.replace('?notebook=', '')
const localstorageKey = `scratchpad-${notebook}`
const saveUrl = `${baseUrl}${notebook}.json`

let editMode = false

let data: DataType = {
  lastIdx: 0,
  lastSave: undefined,
  items: [
    {
      id: uuidv4(),
      title: 'Scratchpad',
      text: `
# Welcome

Use the double arrow button to switch between **markdown** and **edit** mode.

Save happens in 2 phases : local which occurs often (green icon) then on server after a couple of seconds (blue icon).

You can use [markdown syntax](https://www.markdownguide.org/basic-syntax/) to format your text.
`,
    },
  ],
}

const persistToLocalStorage = () => {
  localStorage.setItem(localstorageKey, JSON.stringify(data))
  setSaveIcon(false)
}

const persistOnServer = () =>
  fetch(saveUrl, {
    method: 'POST',
    mode: 'cors',
    headers: {
      Authorization: `Basic ${authorization}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })
    .then(() => setSaveIcon(true))
    .catch((e) => {
      console.error(e)
      setErrorIcon()
    })

const [debouncePersistServerSave] = debounce(persistOnServer, 1500)
const [debouncePersistLocaleSave] = debounce(persistToLocalStorage, 250)

const save = () => {
  data.lastSave = Date.now()
  data.items[data.lastIdx] = {
    id: uuidv4(),
    title: title.value,
    text: textarea.value,
  }
  debouncePersistLocaleSave()
  if (authorization) debouncePersistServerSave()
}

const [debouncedSaveIcon] = debounce(() => {
  savingIcon?.classList.add('hidden')
  savingIcon?.classList.remove('server')
}, 250)

const setSaveIcon = (server = false) => {
  errorIcon?.classList.add('hidden')
  if (server) savingIcon?.classList.add('server')
  savingIcon?.classList.remove('hidden')
  debouncedSaveIcon()
}

const setErrorIcon = () => {
  savingIcon?.classList.add('hidden')
  errorIcon?.classList.remove('hidden')
}

textarea?.addEventListener('keyup', save, false)
textarea?.addEventListener('paste', save, false)
title?.addEventListener('keyup', save, false)
title?.addEventListener('paste', save, false)

const setContent = (idx: number) => {
  data.lastIdx = idx
  title.value = data.items[data.lastIdx].title
  const text = data.items[data.lastIdx].text
  textarea.value = text
  md.innerHTML = dompurify.sanitize(marked.parse(text) as string)
  hideList()
  if (!text?.length) {
    switchToEdit()
  } else {
    switchToMarkdown()
  }
}

const retrieveFromLocalStorage = () => {
  const content = JSON.parse(localStorage.getItem(localstorageKey) ?? '{}')
  return Promise.resolve(content)
}

const retrieveFromServer = (): Promise<DataType | Record<string, never>> =>
  fetch(saveUrl, {
    headers: {
      Authorization: `Basic ${authorization}`,
    },
  })
    .then((response) => {
      if (response.ok) return response.json() as Promise<DataType>
      if (response.status === 404) return Promise.resolve({})
      throw new Error(`error: ${response.status}`)
    })
    .catch((err) => {
      console.error(err)
      if (
        confirm(
          'Error while loading data from server. Do you want to try again (ok) or continue with local data (cancel) ?'
        )
      ) {
        window.location.reload()
      }
      return Promise.resolve({})
    })

const enableUI = () => {
  title.disabled = false
  textarea.disabled = false
  addBtn.disabled = false
  changeBtn.disabled = false
  switchBtn.disabled = false
}

const load = () =>
  Promise.all(
    authorization
      ? [retrieveFromLocalStorage(), retrieveFromServer()]
      : [retrieveFromLocalStorage()]
  )
    .then(([localStorageData, serverData]) => {
      const localStorageLastSave = localStorageData?.lastSave ?? 0
      const serverLastSave = serverData?.lastSave ?? 0
      const lastData =
        localStorageLastSave > serverLastSave ? localStorageData : serverData
      if (lastData?.items) data = lastData
      enableUI()
      setContent(data.lastIdx)
    })
    .catch((err) => {
      console.error(err)
      alert('An error occured while loading data')
    })

const addNewItem = () => {
  const newIdx = data.items.length
  data.items.push({ id: uuidv4(), title: 'New note', text: '' })
  data.lastIdx = newIdx
  setContent(newIdx)
  save()
}

addBtn.addEventListener('click', addNewItem, false)

const removeItem = (idToRemove: string) => {
  const item = data.items.find(({ id }) => id === idToRemove)
  if (
    item?.text.length === 0 ||
    confirm(`Are you sure to delete « ${item?.title} » ?`)
  ) {
    const newData = {
      lastIdx: 0,
      lastSave: data.lastSave,
      items: data.items.filter(({ id }) => id !== idToRemove),
    }
    data = newData
    buildList()
    debouncePersistServerSave()
  }
}

const hideList = () => {
  document.body.classList.remove('list')
  emptyList()
}

const emptyList = () => {
  while (list.firstChild) {
    list.removeChild(list.firstChild)
  }
}

const buildList = () => {
  emptyList()
  const addRemoveBtn = data.items.length > 1
  data.items.forEach(({ id, title, text }, idx) => {
    const li = document.createElement('li')
    const aItem = document.createElement('a')
    aItem.innerText = title
    aItem.addEventListener('click', () => {
      setContent(idx)
      switchBtn.style.visibility = ''
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
        removeItem(id)
      })
      li.appendChild(aRemove)
    }
    list.appendChild(li)
  })
  document.body.classList.add('list')
}

const toggleList = () => {
  if (document.body.classList.contains('list')) {
    hideList()
    switchBtn.style.visibility = ''
  } else {
    buildList()
    switchBtn.style.visibility = 'hidden'
  }
}

changeBtn.addEventListener('click', toggleList, false)

const switchToEdit = () => {
  md.style.display = 'none'
  textarea.style.display = ''
  textarea.focus()
  editMode = true
}

const switchToMarkdown = () => {
  textarea.style.display = 'none'
  md.innerHTML = dompurify.sanitize(marked.parse(textarea.value) as string)
  md.style.display = ''
  editMode = false
}

const switchBetweenMode = () => {
  if (editMode) switchToMarkdown()
  else switchToEdit()
}
switchBtn.addEventListener('click', switchBetweenMode, false)

const notebookCheck = /^[a-zA-Z0-9]{1,12}$/.test(notebook)
if (notebookCheck) {
  intro.style.display = 'none' // hide Intro
  load()
} else if (authorization) {
  const spansServer = document.querySelectorAll('.server')
  spansServer.forEach((el) => el.classList.remove('server'))
}
