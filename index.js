const intro = document.querySelector('#intro')
const title = document.querySelector('h1 input')
const textarea = document.querySelector('textarea')
const md = document.querySelector('#md')
const savingIcon = document.querySelector('#saving')
const addBtn = document.querySelector('#add')
const changeBtn = document.querySelector('#change')
const switchBtn = document.querySelector('#switch')
const list = document.querySelector('#list ol')
const removeIcon = document.querySelector('#removeIcon').innerHTML
const startButton = document.querySelector('#StartButton')
const search = document.location.search || ''
const localstorageKey = 'scratchpad'

const lastTimeout = {}

let editMode = false

const debounce = (fn, delay) => () => {
  clearTimeout(lastTimeout[fn])
  lastTimeout[fn] = setTimeout(fn, delay)
}

const save = () => {
  data.items[data.lastIdx] = {
    id: data.items[data.lastIdx].id,
    title: title.value,
    text: textarea.value,
  }
  debouncedPersistSave()
}

const persistToLocalStorage = () => {
  console.log('persistToLocalStorage', data)
  localStorage.setItem(localstorageKey, JSON.stringify(data))
  setSaveIcon()
}

const persistSave = () => {
  persistToLocalStorage()
  setSaveIcon()
}

const debouncedPersistSave = debounce(persistSave, 500)

let timeoutSaveIcon

const setSaveIcon = () => {
  clearTimeout(timeoutSaveIcon)
  savingIcon.classList.add('saved')
  timeoutSaveIcon = setTimeout(() => savingIcon.classList.remove('saved'), 500)
}

textarea.addEventListener('keyup', save, false)
textarea.addEventListener('paste', save, false)
title.addEventListener('keyup', save, false)
title.addEventListener('paste', save, false)

let data = {
  lastIdx: 0,
  lastSave: undefined,
  items: [
    {
      id: Date.now(),
      title: 'Scratchpad',
      text: `
# Welcome

Use the double arrow button to switch between **markdown** and **edit** mode.

You can use [markdown syntax](https://www.markdownguide.org/basic-syntax/) to format your text.
`,
    },
  ],
}

const setContent = (idx) => {
  data.lastIdx = idx
  title.value = data.items[data.lastIdx].title
  const text = data.items[data.lastIdx].text
  textarea.value = text
  md.innerHTML = marked.parse(text)
  hideList()
  if (!text?.length) {
    switchToEdit()
  } else {
    switchToMarkdown()
  }
}

const retrieveFromLocalStorage = () => {
  const content = JSON.parse(localStorage.getItem(localstorageKey))
  console.log('retrieveFromLocalStorage', localstorageKey, content)
  return Promise.resolve(content)
}

const load = () =>
  retrieveFromLocalStorage().then((savedData) => {
    if (savedData && savedData.items) {
      data = {
        lastIdx: savedData.lastIdx,
        items: savedData.items.map(({ id, title, text }, idx) => ({
          id: id || idx,
          title,
          text,
        })),
      }
    }
    setContent(data.lastIdx)
  })

const addNewItem = () => {
  const newIdx = data.items.length
  data.items.push({ id: Date.now(), title: 'New note', text: '' })
  data.lastIdx = newIdx
  setContent(newIdx)
  save()
}

addBtn.addEventListener('click', addNewItem, false)

const removeItem = (idToRemove) => {
  const item = data.items.find(({ id }) => id === idToRemove)
  if (
    item.text.length === 0 ||
    confirm(`Are you sure to delete « ${item.title} » ?`)
  ) {
    console.log('before', JSON.stringify(data.items))
    const newData = {
      lastIdx: 0,
      items: data.items.filter(({ id }) => id !== idToRemove),
    }
    console.log('after', JSON.stringify(newData.items))
    data = newData
    buildList()
    debouncePersistSave()
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

const toggleList = () =>
  document.body.classList.contains('list') ? hideList() : buildList()

changeBtn.addEventListener('click', toggleList, false)

const hideIntro = () => {
  intro.style.display = 'none'
}

const switchToEdit = (e) => {
  if (e?.target?.tagName === 'A') return
  md.style.display = 'none'
  textarea.style.display = ''
  textarea.focus()
  editMode = true
}

const switchToMarkdown = () => {
  textarea.style.display = 'none'
  md.innerHTML = marked.parse(textarea.value)
  md.style.display = ''
  editMode = false
}

const switchBetweenMode = () => {
  if (editMode) switchToMarkdown()
  else switchToEdit()
}
switchBtn.addEventListener('click', switchBetweenMode, false)

startButton.addEventListener(
  'click',
  (e) => {
    e.preventDefault()
    hideIntro()
    load()
  },
  false
)
