import './style.css'

import { v4 as uuidv4 } from 'uuid'
import { authorization, baseUrl } from './settings'
import dompurify from 'dompurify'
import * as marked from 'marked'
import { debounce } from './debounce'
import * as jsonpatch from 'fast-json-patch'

const intro = document.querySelector('#intro') as HTMLDivElement
const h2 = document.querySelector('h2') as HTMLHeadingElement
const title = h2.querySelector('input') as HTMLInputElement
const textarea = document.querySelector('textarea') as HTMLTextAreaElement
const md = document.querySelector('#md') as HTMLDivElement
const savingIcon = document.querySelector('#saving') as HTMLSpanElement
const errorIcon = document.querySelector('#error') as HTMLSpanElement
const addBtn = document.querySelector('#add') as HTMLButtonElement
const changeBtn = document.querySelector('#change') as HTMLButtonElement
const switchBtn = document.querySelector('#switch') as HTMLButtonElement
const clearBtn = document.querySelector('#clear') as HTMLButtonElement
const list = document.querySelector('#list ol') as HTMLOListElement
const removeIcon = (
  document.querySelector('#removeIcon') as HTMLTemplateElement
)?.innerHTML
const lastSaveAt = document.querySelector('#lastSaveAt') as HTMLSpanElement
const search = document.location.search || ''
const notebook = search.replace('?notebook=', '')
const simpleMode = search === '?simple'
const localstorageKey = notebook ? `scratchpad-${notebook}` : 'scratchpad'
const saveUrl = `${baseUrl}${notebook}.json`

if (simpleMode) {
  // remove disabled attribute on checkbox
  const renderer = new marked.Renderer()
  renderer.checkbox = ({ checked }) =>
    `<input type="checkbox" ${checked ? 'checked' : ''} />`
  marked.use({ renderer })
}

let editMode = false
let newDocument = true
let observer: jsonpatch.Observer<DataType> | undefined

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

const getPersistPayload = () => {
  if (observer && !newDocument) {
    const patch = jsonpatch.generate(observer)
    return {
      method: 'PATCH',
      body: JSON.stringify(patch),
    }
  }
  return {
    method: 'POST',
    body: JSON.stringify(data),
  }
}

const persistOnServer = () => {
  if (baseUrl && authorization) {
    const payload = getPersistPayload()
    return fetch(saveUrl, {
      ...payload,
      mode: 'cors',
      headers: {
        Authorization: `Basic ${authorization}`,
        'Content-Type': 'application/json',
      },
    })
      .then(() => {
        setSaveIcon(true)
        newDocument = false
      })
      .catch((e) => {
        console.error(e)
        setErrorIcon()
      })
  }
}

const [debouncePersistServerSave] = debounce(persistOnServer, 1500)
const [debouncePersistLocaleSave] = debounce(persistToLocalStorage, 250)

const save = () => {
  const d = new Date()
  data.lastSave = d.getTime()
  data.items[data.lastIdx] = {
    id: data.items[data.lastIdx].id ?? uuidv4(),
    title: title.value,
    text: textarea.value,
  }
  lastSaveAt.innerText = d.toLocaleString()
  debouncePersistLocaleSave()
  if (!simpleMode) debouncePersistServerSave()
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
  if (simpleMode || !text?.length) {
    switchToEdit()
  } else {
    switchToMarkdown()
  }
}

const retrieveFromLocalStorage = () => {
  const content = JSON.parse(localStorage.getItem(localstorageKey) ?? '{}')
  return Promise.resolve(content)
}

const retrieveFromServer = (): Promise<DataType | Record<string, never>> => {
  if (baseUrl && authorization) {
    return fetch(saveUrl, {
      headers: {
        Authorization: `Basic ${authorization}`,
      },
    })
      .then((response) => {
        if (response.ok) {
          newDocument = false
          return response.json() as Promise<DataType>
        }
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
  }
  return Promise.resolve({})
}

const enableUI = () => {
  textarea.disabled = false
  switchBtn.disabled = false
  if (simpleMode) {
    h2.classList.add('simple')
  } else {
    title.disabled = false
    addBtn.disabled = false
    changeBtn.disabled = false
  }
}

const load = () =>
  Promise.all([
    retrieveFromLocalStorage(),
    simpleMode ? undefined : retrieveFromServer(),
  ])
    .then(([localStorageData, serverData]) => {
      const localStorageLastSave = localStorageData?.lastSave ?? 0
      const serverLastSave = serverData?.lastSave ?? 0
      const isLocalMoreRecent = localStorageLastSave > serverLastSave
      const lastData = isLocalMoreRecent ? localStorageData : serverData
      if (lastData?.items) data = lastData
      enableUI()
      setContent(data.lastIdx)
      lastSaveAt.innerText = lastData?.lastSave
        ? new Date(lastData.lastSave).toLocaleString()
        : 'N/A'
      if (!simpleMode) {
        if (isLocalMoreRecent) persistOnServer()
        observer = jsonpatch.observe(data)
      }
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
  switchBtn.style.visibility = ''
  save()
}

addBtn.addEventListener('click', addNewItem, false)

const removeItem = (idToRemove: string) => {
  const idx = data.items.findIndex(({ id }) => id === idToRemove)
  const item = data.items[idx]
  if (
    item?.text.length === 0 ||
    confirm(`Are you sure to delete « ${item?.title} » ?`)
  ) {
    data.items.splice(idx, 1)
    buildList()
    save()
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

const clearContent = () => {
  if (confirm('clear content ?')) {
    textarea.value = ''
    textarea.focus()
    save()
  }
}
clearBtn.addEventListener('click', clearContent, false)

const notebookCheck = /^[a-zA-Z0-9]{1,12}$/.test(notebook)
if (notebookCheck) {
  intro.style.display = 'none'
  load()
} else if (baseUrl && authorization) {
  const spansServer = document.querySelectorAll('.server')
  spansServer.forEach((el) => el.classList.remove('server'))
}

if (simpleMode) {
  intro.style.display = 'none'
  addBtn.style.display = 'none'
  changeBtn.style.display = 'none'
  clearBtn.style.display = ''

  data.items[0].text = 'Start taking notes'
  load()
}
