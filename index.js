const title = document.querySelector('h1 input')
const textarea = document.querySelector('textarea')
const savingIcon = document.querySelector('#saving')
const addBtn = document.querySelector('#add')
const changeBtn = document.querySelector('#change')
const list = document.querySelector('#list ol')
const removeIcon = document.querySelector('#removeIcon').innerHTML

let lastTimeout
function debounce(fn) {
    return () => {
        clearTimeout(lastTimeout)
        lastTimeout = setTimeout(fn, 250)
    }
}

function save () {
    data.items[data.lastIdx] = {
        title: title.value,
        text: textarea.value
    }
    console.log('save', data)
    localStorage.setItem('data', JSON.stringify(data))
    setSaveIcon()
    
}

let timeoutSaveIcon
function setSaveIcon() {
    savingIcon.classList.add('saved')
    timeoutSaveIcon = setTimeout(() =>savingIcon.classList.remove('saved'), 500)
}

const debouncedSave = debounce(save)
textarea.addEventListener('keyup', debouncedSave, false)
textarea.addEventListener('paste', debouncedSave, false)
title.addEventListener('keyup', debouncedSave, false)
title.addEventListener('paste', debouncedSave, false)

let data = {
    lastIdx: 0,
    items: [ { title: 'Scratchpad', text: `

Type your wonderful idea or grocery list here. 

Notes you type here will be stored until next time (or until you flush your browser’s cache).`
    } ]
}

function setContent(idx) {
    data.lastIdx = idx
    title.value = data.items[data.lastIdx].title
    textarea.value = data.items[data.lastIdx].text
    hideList()
    textarea.focus()
}

function load () {
    const savedData = JSON.parse(localStorage.getItem('data'))
    if (savedData && savedData.items && savedData.items.length > 0) {
        data = savedData
        setContent(data.lastIdx)
    } else {
        setContent(data.lastIdx)
    }
}
load()

function addNewItem () {
    const newIdx = data.items.length
    data.items.push({ title: `Scratchpad ${newIdx}`, text: '' })
    data.lastIdx = newIdx
    setContent(newIdx)
    save()
}

addBtn.addEventListener('click', addNewItem, false)

function hideList() {
    document.body.classList.remove('list')
    emptyList()
}
function emptyList() {
    while(list.firstChild) {
        list.removeChild(list.firstChild)
    }
}
function toggleList () {
    if (document.body.classList.contains('list')) {
        hideList()
    } else {
        emptyList()
        data.items.forEach(({title, text}, idx) => {
            const li = document.createElement('li')
            const aItem = document.createElement('a')
            aItem.innerText = title
            aItem.addEventListener('click', () => { setContent(idx)})
            const aRemove = document.createElement('a')
            aRemove.innerHTML = removeIcon
            aRemove.classList.add('remove')
            const span = document.createElement('span')
            span.innerText = text.length ? `(${text.length} chars)` : '(empty)'
            li.appendChild(aItem)
            li.appendChild(span)
            li.appendChild(aRemove)
            list.appendChild(li)
        })
        document.body.classList.add('list')
    }
}
changeBtn.addEventListener('click', toggleList, false)